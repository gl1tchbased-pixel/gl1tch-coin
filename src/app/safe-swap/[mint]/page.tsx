import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JupiterSwap } from "@/components/web3/JupiterSwap";
import { referralFeeProblem } from "@/lib/actions/referral-check";
import { checkSwapGate, isSolanaAddress, safeSymbol, swapFeeFor } from "@/lib/actions/safe-swap-gate";
import { runScanReport } from "@/lib/scan-report";
import styles from "./safe-swap.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Safe Swap — GL1TCH",
  description: "An optional Jupiter swap, offered only after a passing GL1TCH safety scan.",
  robots: { index: false, follow: false },
};

async function scan(mint: string) {
  try {
    const rep = await runScanReport(mint, "solana", "auto");
    return { status: rep.status, body: rep.body as Record<string, unknown> };
  } catch {
    return { status: 503, body: null };
  }
}

export default async function SafeSwapPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!isSolanaAddress(mint)) notFound();

  const { status, body } = await scan(mint);
  const gate = checkSwapGate(status, body);
  const symbol = safeSymbol(body?.symbol);
  const report = `/scan/solana-${mint}`;

  if (!gate.ok) {
    return (
      <main className={styles.page}>
        <h1 className={styles.title}>GL1TCH won&apos;t route this buy</h1>
        <p className={styles.note}>{gate.reason}</p>
        <a className={styles.link} href={report}>Full risk report →</a>
      </main>
    );
  }

  const configured = swapFeeFor(mint);
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
      <JupiterSwap mint={mint} referralAccount={fee?.account} referralFeeBps={fee?.bps} />
    </main>
  );
}
