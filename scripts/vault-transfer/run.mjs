#!/usr/bin/env node
/**
 * One-time local tool: moves the Jupiter referral accounts away from the attester (whose key lives in CI) to a cold
 * wallet, and opens the fee vault in the same transaction, so no fee can land before the owner has moved.
 *
 *   node scripts/vault-transfer/run.mjs <COLD_WALLET>         checks everything, then opens a page on localhost
 *   node scripts/vault-transfer/run.mjs <ADDRESS> --dry       checks and simulates only
 *
 * The program's transfer takes effect with one signature and the new owner doesn't accept it, so a wrong address
 * would lose the accounts for good. That's why the new wallet must first prove it can sign, on chain.
 * This lives outside src/ on purpose: it's never deployed. It holds no key; Phantom signs. See docs/security/treasury-runbook.md.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { Connection, PublicKey, Transaction, TransactionInstruction } = require("@solana/web3.js");

const ATTESTER = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";
const REFUSED = new Set([ATTESTER, "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4", "CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4"]);
const PROGRAM = new PublicKey("REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3");
const ULTRA = new PublicKey("J4T8vmahpgiGmjkDXTaacVSAw9iQxgP7P81PCS31PsDB");
const CLASSIC = new PublicKey("EFP5EHXwkBScaVwCkBHkr9sc2wYsKRathmB1zJmfhpS2");
const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
const VAULT = new PublicKey("DqKd8TtLf9m8dkg81K6XNVg5CGB9uMHVSQKQn9qNjYTU");
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const SYSTEM = new PublicKey("11111111111111111111111111111111");
const MIN_FEE_LAMPORTS = 3_000_000;

const fail = (message) => {
  console.error(`\nDURDU: ${message}`);
  process.exit(1);
};

const conn = new Connection(process.env.SOLANA_RPC || "https://solana-rpc.publicnode.com", "confirmed");
const partnerOf = (info) => (info ? new PublicKey(info.data.subarray(8, 40)).toBase58() : null);

function transferInstruction(partner, newPartner, referralAccount) {
  const discriminator = crypto.createHash("sha256").update("global:transfer_referral_account").digest().subarray(0, 8);
  return new TransactionInstruction({
    programId: PROGRAM,
    keys: [
      { pubkey: partner, isSigner: true, isWritable: false },
      { pubkey: newPartner, isSigner: false, isWritable: false },
      { pubkey: referralAccount, isSigner: false, isWritable: true },
    ],
    data: discriminator,
  });
}

/** createIdempotent: fails nothing if the vault already exists. */
function openVaultInstruction(payer) {
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: VAULT, isSigner: false, isWritable: true },
      { pubkey: ULTRA, isSigner: false, isWritable: false },
      { pubkey: WSOL, isSigner: false, isWritable: false },
      { pubkey: SYSTEM, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

async function buildTransaction(partner, newOwner) {
  const tx = new Transaction({ feePayer: partner, recentBlockhash: (await conn.getLatestBlockhash("confirmed")).blockhash });
  tx.add(transferInstruction(partner, newOwner, ULTRA), transferInstruction(partner, newOwner, CLASSIC), openVaultInstruction(partner));
  return tx;
}

/** A wallet that paid for a transaction has signed one, so someone holds its key. A mistyped address never has. */
async function hasSignedOnChain(address) {
  const signatures = await conn.getSignaturesForAddress(address, { limit: 20 });
  for (const { signature, err } of signatures) {
    if (err) continue;
    const tx = await conn.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (tx?.transaction.message.staticAccountKeys[0].equals(address)) return true;
  }
  return false;
}

async function preflight(newOwnerText, dry) {
  let newOwner;
  try {
    newOwner = new PublicKey(newOwnerText);
  } catch {
    fail("Bu geçerli bir Solana adresi değil.");
  }
  if (REFUSED.has(newOwner.toBase58())) fail("Bu adres attester, deployer ya da give-back cüzdanı. Hiç imza atmayan yeni bir cüzdan gerekiyor.");
  if (!PublicKey.isOnCurve(newOwner.toBytes())) fail("Bu adres normal bir cüzdan değil.");
  if (!dry && !(await hasSignedOnChain(newOwner))) {
    fail("Bu cüzdanın imza attığı bir işlem bulamadım. Yeni cüzdandan 0.001 SOL gönder, sonra tekrar çalıştır. Yanlış adrese devir geri alınamaz.");
  }

  const [ultra, classic] = await conn.getMultipleAccountsInfo([ULTRA, CLASSIC]);
  for (const [label, info] of [["Ultra", ultra], ["Classic", classic]]) {
    if (partnerOf(info) !== ATTESTER) fail(`${label} hesabının sahibi beklenen attester değil: ${partnerOf(info)}. Hiçbir şey yapılmadı.`);
  }
  const partner = new PublicKey(ATTESTER);
  if ((await conn.getBalance(partner)) < MIN_FEE_LAMPORTS) fail("Attester cüzdanında 0.003 SOL yok.");

  const tx = await buildTransaction(partner, newOwner);
  const simulation = await conn.simulateTransaction(tx);
  if (simulation.value.err) fail(`Simülasyon başarısız: ${JSON.stringify(simulation.value.err)}\n${(simulation.value.logs ?? []).join("\n")}`);

  console.log("Kontroller tamam, simülasyon başarılı:");
  console.log(`  Yeni sahip:  ${newOwner.toBase58()}`);
  console.log(`  İşlem:       Ultra ve Classic hesaplarını devret, ücret kasasını aç (${VAULT.toBase58()})`);
  return newOwner;
}

const page = (newOwner, attester) => `<!doctype html><meta charset="utf-8"><title>GL1TCH kasa devri</title>
<style>body{font:16px system-ui;background:#0b0f14;color:#e6edf3;max-width:620px;margin:40px auto;padding:0 16px}code{color:#7cf6c8;word-break:break-all}button{font:600 16px system-ui;padding:12px 18px;margin-top:16px;cursor:pointer}#log{margin-top:18px;white-space:pre-wrap}</style>
<h1>Kasa devri</h1>
<p>Phantom'da <b>GL1TCH bot</b> hesabını seç:<br><code>${attester}</code></p>
<p>Yeni sahip:<br><code>${newOwner}</code></p>
<p>Adresi telefonundaki yeni cüzdanla karakter karakter karşılaştır. <b>Bu işlem geri alınamaz.</b></p>
<button id="go">Phantom ile onayla</button><div id="log"></div>
<script src="/web3.js"></script>
<script>
const log = (m) => { document.getElementById("log").textContent = m; };
document.getElementById("go").onclick = async () => {
  try {
    const provider = window.phantom && window.phantom.solana;
    if (!provider) return log("Phantom bulunamadı.");
    const { publicKey } = await provider.connect();
    if (publicKey.toBase58() !== ${JSON.stringify(attester)}) return log("Yanlış hesap seçili: " + publicKey.toBase58() + ". Phantom'da GL1TCH bot hesabına geç ve tekrar bas.");
    const res = await fetch("/tx");
    if (!res.ok) return log("İşlem hazırlanamadı: " + (await res.text()));
    const bytes = Uint8Array.from(atob(await res.text()), (c) => c.charCodeAt(0));
    const { signature } = await provider.signAndSendTransaction(solanaWeb3.Transaction.from(bytes));
    log("Gönderildi, onay bekleniyor: " + signature);
    log(await (await fetch("/done?signature=" + encodeURIComponent(signature))).text());
  } catch (e) {
    log("Hata: " + (e && e.message ? e.message : e));
  }
};
</script>`;

function serve(newOwner) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const web3 = fs.readFileSync(path.join(here, "../../node_modules/@solana/web3.js/lib/index.iife.min.js"));
  const partner = new PublicKey(ATTESTER);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname === "/web3.js") return res.writeHead(200, { "content-type": "text/javascript" }).end(web3);
      if (url.pathname === "/tx") {
        const tx = await buildTransaction(partner, newOwner);
        return res.writeHead(200, { "content-type": "text/plain" }).end(tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"));
      }
      if (url.pathname === "/done") {
        await conn.confirmTransaction(url.searchParams.get("signature"), "confirmed");
        const [ultra, classic, vault] = await conn.getMultipleAccountsInfo([ULTRA, CLASSIC, VAULT]);
        const ok = partnerOf(ultra) === newOwner.toBase58() && partnerOf(classic) === newOwner.toBase58() && Boolean(vault);
        const text = ok
          ? `TAMAM. İki hesabın sahibi artık ${newOwner.toBase58()}, kasa açık.\nClaude'a bu adresi söyle: kilitleri bu adrese çevirip ücreti o açacak.`
          : "Zincirde beklenen sonucu göremedim. Bu pencereyi kapatma, Claude'a söyle.";
        console.log(text);
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end(text);
        if (ok) server.close(() => process.exit(0));
        return;
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page(newOwner.toBase58(), ATTESTER));
    } catch (e) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" }).end(String(e.message ?? e));
    }
  });
  server.listen(0, "127.0.0.1", () => console.log(`\nTarayıcıda aç (Phantom'un olduğu tarayıcı): http://localhost:${server.address().port}\n`));
}

const [address, flag] = process.argv.slice(2);
try {
  if (!address) fail("Kullanım: node scripts/vault-transfer/run.mjs <YENI_CUZDAN>");
  const dry = flag === "--dry";
  const newOwner = await preflight(address, dry);
  if (!dry) serve(newOwner);
} catch (e) {
  console.error(`
DURDU: ${e.message}`);
  process.exitCode = 1;
}
