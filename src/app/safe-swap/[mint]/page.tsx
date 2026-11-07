import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JupiterSwap } from "@/components/web3/JupiterSwap";
import { EvmSafeSwap } from "@/components/web3/EvmSafeSwap";
import { referralFeeProblem } from "@/lib/actions/referral-check";
import {
  EVM_SWAP_CHAINS,
  checkSwapGate,
  evmSwapFee,
  parseSafeSwapTarget,
  safeSymbol,
  swapFeeFor,
} from "@/lib/actions/safe-swap-gate";
import { runScanReport } from "@/lib/scan-report";
import styles from "./safe-swap.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Safe Swap — GL1TCH",
  description: "An optional non-custodial swap on Solana or EVM chains, offered only after a passing GL1TCH safety scan.",
  robots: { index: false, follow: false },
};

async function scan(address: string, chain: string) {
  try {
    const rep = await runScanReport(address, chain, "auto");
    return { status: rep.status, body: rep.body as Record<string, unknown> };
  } catch {
    return { status: 503, body: null };
  }
}

export default async function SafeSwapPage({
  params,
  searchParams,
}: {
  params: Promise<{ mint: string }>;
  searchParams?: Promise<{ chain?: string }>;
}) {
  const { mint } = await params;
  const sp = searchParams ? await searchParams : {};
  const target = parseSafeSwapTarget(mint, sp?.chain);
  if (!target) notFound();

  const { chain, address } = target;
  const { status, body } = await scan(address, chain);
  const gate = checkSwapGate(status, body);
  const symbol = safeSymbol(body?.symbol);
  const report = `/scan/${chain}-${address}`;

  if (!gate.ok) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>GL1TCH won&apos;t route this buy</h1>
        <p className={styles.note}>{gate.reason}</p>
        <a className={styles.link} href={report}>Full risk report →</a>
      </main>
    );
  }

  if (chain !== "solana") {
    const evmFee = evmSwapFee();
    const chainLabel = EVM_SWAP_CHAINS[chain]?.label ?? chain;
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>Safe Swap ({chainLabel}): {symbol}</h1>
        <p className={styles.note}>
          Scan: <strong>{String(body?.verdict)} ({String(body?.score)}/100)</strong> on {chainLabel}. A passing scan is not a recommendation and
          cannot rule out losses. <a className={styles.link} href={report}>Full report →</a>
        </p>
        <EvmSafeSwap
          chain={chain}
          address={address}
          symbol={symbol}
          feeRecipient={evmFee?.recipient}
          feeBps={evmFee?.bps}
        />
      </main>
    );
  }

  const configured = swapFeeFor(address);
  const fee = configured && !(await referralFeeProblem()) ? configured : null;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Safe Swap: {symbol}</h1>
      <p className={styles.note}>
        Scan: <strong>{String(body?.verdict)} ({String(body?.score)}/100)</strong>. A passing scan is not a recommendation and
        cannot rule out losses. <a className={styles.link} href={report}>Full report →</a>
      </p>
      <p className={styles.note}>
        {fee
          ? `This is Jupiter's swap form. It includes a ${fee.bps / 100}% GL1TCH fee, and Jupiter keeps 20% of that fee. The fee plays no part in the score.`
          : "This is Jupiter's swap form. GL1TCH takes no fee on this swap."}{" "}
        You review and sign in your own wallet.
      </p>
      <JupiterSwap mint={address} referralAccount={fee?.account} referralFeeBps={fee?.bps} />
    </main>
  );
}
