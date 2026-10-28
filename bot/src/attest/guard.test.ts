import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import bs58 from "bs58";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage } from "@solana/web3.js";
import {
  CircuitBreaker,
  DEFAULT_POLICY,
  MEMO_PROGRAM_ID,
  anchorMemoOf,
  checkAnchorTx,
  checkCluster,
  checkDaily,
  checkFee,
  checkSimulation,
  checkSigner,
  checkWallet,
  DEGRADED_PER_RUN,
  linkReportMessage,
  PINNED_ATTESTER,
  parseSecretKey,
  policyFromEnv,
  runBudget,
  walletWarnings,
} from "./guard.js";
import { shapeOf } from "./chain.js";
import { memoText } from "./merkle.js";

const attester = Keypair.generate().publicKey;
const memo = memoText("ab".repeat(32), 3, 1792540800000);
const blockhash = Keypair.generate().publicKey.toBase58();
const memoIx = (text = memo, keys: TransactionInstruction["keys"] = []) =>
  new TransactionInstruction({ programId: new PublicKey(MEMO_PROGRAM_ID), keys, data: Buffer.from(text, "utf8") });
const compile = (payer: PublicKey, ixs: TransactionInstruction[]) =>
  shapeOf(new TransactionMessage({ payerKey: payer, recentBlockhash: blockhash, instructions: ixs }).compileToLegacyMessage());

describe("anchor allowlist", () => {
  it("accepts exactly one attester-paid v1 memo", () => {
    const tx = compile(attester, [memoIx()]);
    expect(anchorMemoOf(tx, attester.toBase58())).toBe(memo);
    expect(checkAnchorTx(tx, attester.toBase58(), memo)).toBeNull();
  });
  it("accepts the attester as a signer on the memo", () => {
    const tx = compile(attester, [memoIx(memo, [{ pubkey: attester, isSigner: true, isWritable: false }])]);
    expect(checkAnchorTx(tx, attester.toBase58(), memo)).toBeNull();
  });
  it("refuses a transfer riding along with the memo", () => {
    const thief = Keypair.generate().publicKey;
    const tx = compile(attester, [memoIx(), SystemProgram.transfer({ fromPubkey: attester, toPubkey: thief, lamports: 1 })]);
    expect(checkAnchorTx(tx, attester.toBase58(), memo)).not.toBeNull();
  });
  it("refuses a transaction someone else pays for", () => {
    const tx = compile(Keypair.generate().publicKey, [memoIx(memo, [{ pubkey: attester, isSigner: false, isWritable: false }])]);
    expect(anchorMemoOf(tx, attester.toBase58())).toBeNull();
  });
  it("refuses any other account", () => {
    const other = Keypair.generate().publicKey;
    expect(checkAnchorTx(compile(attester, [memoIx(memo, [{ pubkey: other, isSigner: false, isWritable: false }])]), attester.toBase58(), memo)).not.toBeNull();
  });
  it("refuses a non-memo program and a memo that isn't the expected one", () => {
    const fake = new TransactionInstruction({ programId: Keypair.generate().publicKey, keys: [], data: Buffer.from(memo) });
    expect(checkAnchorTx(compile(attester, [fake]), attester.toBase58(), memo)).not.toBeNull();
    expect(checkAnchorTx(compile(attester, [memoIx("hello")]), attester.toBase58(), memo)).not.toBeNull();
    const other = memoText("cd".repeat(32), 3, 1792540800000);
    expect(checkAnchorTx(compile(attester, [memoIx(other)]), attester.toBase58(), memo)).toMatch(/differs/);
  });
});

describe("spend checks", () => {
  it("caps the fee", () => {
    expect(checkFee(5000, DEFAULT_POLICY)).toBeNull();
    expect(checkFee(50_000, DEFAULT_POLICY)).toMatch(/exceeds/);
    expect(checkFee(null, DEFAULT_POLICY)).toMatch(/unknown/);
  });
  it("refuses a simulation that fails or moves more than the fee", () => {
    expect(checkSimulation({ err: null, preLamports: 1_000_000, postLamports: 995_000 }, DEFAULT_POLICY)).toBeNull();
    expect(checkSimulation({ err: null, preLamports: 1_000_000, postLamports: 1_000_000 }, DEFAULT_POLICY)).toBeNull();
    expect(checkSimulation({ err: null, preLamports: 1_000_000, postLamports: 500_000 }, DEFAULT_POLICY)).toMatch(/exceeds/);
    expect(checkSimulation({ err: { InstructionError: [0, "Custom"] }, preLamports: 1, postLamports: 1 }, DEFAULT_POLICY)).toMatch(/failed/);
    expect(checkSimulation({ err: null, preLamports: 1, postLamports: null }, DEFAULT_POLICY)).toMatch(/no balance/);
  });
  it("enforces the daily cap", () => {
    expect(checkDaily(99, DEFAULT_POLICY)).toBeNull();
    expect(checkDaily(100, DEFAULT_POLICY)).toMatch(/daily cap/);
  });
});

describe("link report message", () => {
  it("is a domain-separated text no Solana transaction message can equal", () => {
    const m = linkReportMessage("ab".repeat(32), "SIG");
    expect(m).toBe(`gl1tch:attest-link:v1:${"ab".repeat(32)}:SIG`);
    expect(m).not.toMatch(/moves no funds/); // it isn't a wallet prompt: the attester signs it, nobody else sees it
  });
});

describe("signer identity", () => {
  it("on mainnet signs only with the attester pinned in code (and named in ATTESTER_PUBKEY)", () => {
    expect(checkSigner("mainnet-beta", PINNED_ATTESTER, PINNED_ATTESTER)).toBeNull();
    const other = Keypair.generate().publicKey.toBase58();
    expect(checkSigner("mainnet-beta", other, other)).toMatch(/pinned/);
    expect(checkSigner("mainnet-beta", PINNED_ATTESTER, other)).toMatch(/ATTESTER_PUBKEY/);
  });

  it("on devnet accepts any key that matches ATTESTER_PUBKEY (test setups)", () => {
    const k = Keypair.generate().publicKey.toBase58();
    expect(checkSigner("devnet", k, k)).toBeNull();
    expect(checkSigner("devnet", k, undefined)).toMatch(/ATTESTER_PUBKEY/);
  });

  it("pins the same address the website publishes", () => {
    const official = fs.readFileSync(path.resolve(__dirname, "../../../src/lib/official.ts"), "utf8");
    expect(official).toContain(`ATTESTER_WALLET = "${PINNED_ATTESTER}"`);
  });
});

describe("wallet balance (a stranger can't halt it cheaply)", () => {
  it("judges the SOL balance only: token accounts, which anyone can open or dust, play no part", () => {
    expect(checkWallet({ lamports: 50_000_000 }, DEFAULT_POLICY)).toBeNull();
  });

  it("only warns above the fee-wallet size and refuses past the 2 SOL ceiling", () => {
    expect(checkWallet({ lamports: 1_000_000_000 }, DEFAULT_POLICY)).toBeNull();
    expect(walletWarnings({ lamports: 1_000_000_000 }, DEFAULT_POLICY)[0]).toMatch(/move the excess out/);
    expect(walletWarnings({ lamports: 50_000_000 }, DEFAULT_POLICY)).toEqual([]);
    expect(checkWallet({ lamports: 3_000_000_000 }, DEFAULT_POLICY)).toMatch(/ceiling/);
    expect(checkWallet({ lamports: 10 }, DEFAULT_POLICY)).toMatch(/top it up/);
  });
});

describe("run budget", () => {
  it("normally sends up to the per-run cap, within what's left of the day", () => {
    expect(runBudget({ sentLast24h: 10, historyComplete: true }, DEFAULT_POLICY)).toBe(20);
    expect(runBudget({ sentLast24h: 97, historyComplete: true }, DEFAULT_POLICY)).toBe(3);
    expect(runBudget({ sentLast24h: 100, historyComplete: true }, DEFAULT_POLICY)).toBe(0);
  });

  it("drops to the degraded allowance when the last day couldn't be read or counted exactly", () => {
    expect(runBudget({ sentLast24h: 0, historyComplete: false }, DEFAULT_POLICY)).toBe(2);
    expect(runBudget({ sentLast24h: 99, historyComplete: false }, DEFAULT_POLICY)).toBe(1);
    expect(runBudget({ sentLast24h: 100, historyComplete: false }, DEFAULT_POLICY)).toBe(0);
  });

  it("lets one run clear a backlog: GitHub often starts the schedule only every 4-6 hours", () => {
    // 4 runs a day must still cover a day of sweeps (one every 30 min = 48) plus catch-up.
    expect(4 * DEFAULT_POLICY.maxPerRun).toBeGreaterThanOrEqual(48 + 24);
    expect(DEFAULT_POLICY.maxPerRun).toBeLessThanOrEqual(DEFAULT_POLICY.maxPerDay);
  });

  it("never exceeds a per-run cap tightened by env, degraded or not", () => {
    const tight = { ...DEFAULT_POLICY, maxPerRun: 1 };
    expect(runBudget({ sentLast24h: 0, historyComplete: false }, tight)).toBe(1);
    expect(runBudget({ sentLast24h: 0, historyComplete: true }, tight)).toBe(1);
  });

  it("keeps a whole day of degraded runs within the daily cap (pins every cron entry in attest.yml)", () => {
    const yml = fs.readFileSync(path.resolve(__dirname, "../../../.github/workflows/attest.yml"), "utf8");
    const crons = [...yml.matchAll(/cron:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(crons.length).toBeGreaterThan(0);
    expect(crons.length).toBe((yml.match(/^\s*-?\s*cron:/gm) ?? []).length); // no entry escapes the parse (quoting)
    let runsPerDay = 0;
    for (const c of crons) {
      const [minute, ...rest] = c.trim().split(/\s+/);
      expect(minute).toMatch(/^\d{1,2}(,\d{1,2})*$/); // explicit minutes only, so the count below is exact
      expect(rest).toEqual(["*", "*", "*", "*"]); // every hour of every day
      runsPerDay += minute.split(",").length * 24;
    }
    expect(runsPerDay * DEGRADED_PER_RUN).toBeLessThanOrEqual(DEFAULT_POLICY.maxPerDay);
    // Degraded mode must still keep up with sweeps (at most one per run on this schedule), or a backlog builds.
    expect(DEGRADED_PER_RUN).toBeGreaterThanOrEqual(2);
  });
});

describe("cluster check", () => {
  it("accepts only the RPC whose genesis matches the named cluster", () => {
    expect(checkCluster("devnet", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")).toBeNull();
    expect(checkCluster("devnet", "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d")).toMatch(/not on devnet/);
    expect(checkCluster("mainnet-beta", "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")).toMatch(/not on mainnet-beta/);
  });
});

describe("circuit breaker", () => {
  it("opens after consecutive failures and a success resets it", () => {
    const b = new CircuitBreaker(3);
    b.fail();
    b.fail();
    b.ok();
    b.fail();
    b.fail();
    expect(b.open).toBe(false);
    b.fail();
    expect(b.open).toBe(true);
  });
});

describe("policy from env", () => {
  it("can only tighten", () => {
    const p = policyFromEnv({ ATTEST_MAX_PER_DAY: "10", ATTEST_MAX_FEE_LAMPORTS: "999999999", ATTEST_MAX_PER_RUN: "nope" });
    expect(p.maxPerDay).toBe(10);
    expect(p.maxFeeLamports).toBe(DEFAULT_POLICY.maxFeeLamports);
    expect(p.maxPerRun).toBe(DEFAULT_POLICY.maxPerRun);
  });

  it("lets env tighten the wallet ceiling and warning level, never raise them", () => {
    expect(policyFromEnv({ ATTEST_MAX_WALLET_LAMPORTS: "9999999999" }).maxWalletLamports).toBe(DEFAULT_POLICY.maxWalletLamports);
    expect(policyFromEnv({ ATTEST_MAX_WALLET_LAMPORTS: "100000000" }).maxWalletLamports).toBe(100_000_000);
    const p = policyFromEnv({ ATTEST_WARN_WALLET_LAMPORTS: "9999999999" });
    expect(p.warnWalletLamports).toBe(DEFAULT_POLICY.warnWalletLamports);
    expect(DEFAULT_POLICY.warnWalletLamports).toBeLessThan(DEFAULT_POLICY.maxWalletLamports);
  });
});

describe("secret key parsing", () => {
  const kp = Keypair.generate();
  it("reads base58 and JSON byte arrays", () => {
    expect(parseSecretKey(bs58.encode(kp.secretKey))).toEqual(kp.secretKey);
    expect(parseSecretKey(JSON.stringify(Array.from(kp.secretKey)))).toEqual(kp.secretKey);
  });
  it("never echoes the input in its errors", () => {
    const secretish = bs58.encode(kp.secretKey).slice(0, 40);
    for (const bad of [undefined, "", secretish, "[1,2,999]", "[not json"]) {
      try {
        parseSecretKey(bad);
        expect.unreachable();
      } catch (e) {
        expect((e as Error).message).not.toContain(secretish);
        expect((e as Error).message).toMatch(/ATTESTER_SECRET_KEY/);
      }
    }
  });
});
