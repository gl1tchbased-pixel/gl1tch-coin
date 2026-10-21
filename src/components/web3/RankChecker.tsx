"use client";

import { useCallback, useEffect, useState } from "react";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { useWalletEager } from "@/lib/wallet/WalletRoot";
import { gl1tchBalance } from "@/lib/wallet/rpc";
import {
  RANK_TIERS,
  rankForBalance,
  nextTier,
  formatAmount,
  type RankTier,
} from "@/lib/ranks";
import { ConnectWallet } from "./ConnectWallet";
import { publishRank } from "@/lib/fun/rank-signal";
import { RankCard } from "@/components/ui/RankCard";
import styles from "./RankChecker.module.css";

export function RankChecker() {
  const { address, connected } = useWalletEager();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = Boolean(CONTRACT_ADDRESS);

  const fetchBalance = useCallback(async () => {
    if (!address || !live) return;
    setLoading(true);
    setError(null);
    try {
      setBalance(await gl1tchBalance(address));
    } catch {
      setError("Could not read balance. Try again.");
    } finally {
      setLoading(false);
    }
  }, [address, live]);

  useEffect(() => {
    // read the balance from the chain whenever a wallet connects
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (connected && live) fetchBalance();
  }, [connected, live, fetchBalance]);

  // a balance read for a wallet that has since disconnected is not shown
  const shownBalance = connected && live ? balance : null;
  const current: RankTier = rankForBalance(shownBalance ?? 0);
  const next = nextTier(current);
  // light up this tier's coin in the 3D rank row, if there is one on the page
  const tierIndex = shownBalance != null ? RANK_TIERS.findIndex((t) => t.id === current.id) : null;
  useEffect(() => { publishRank(tierIndex); }, [tierIndex]);

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        {!connected ? (
          <div className={styles.connect}>
            <p className={styles.lead}>
              Connect your Solana wallet to verify your rank in The Infected.
            </p>
            <ConnectWallet />
          </div>
        ) : !live ? (
          <div className={styles.connect}>
            <p className={styles.lead}>
              Wallet connected. Ranks activate at launch — once $GL1TCH is live,
              your holdings will resolve to a tier automatically.
            </p>
            <span className={styles.status}>Status: pre-launch preview</span>
          </div>
        ) : loading ? (
          <p className={styles.lead}>Reading the signal…</p>
        ) : error ? (
          <div className={styles.connect}>
            <p className={styles.lead}>{error}</p>
            <button className={styles.retry} onClick={fetchBalance}>
              Retry
            </button>
          </div>
        ) : (
          <div className={styles.result}>
            <span className={styles.rankLabel}>Your rank</span>
            <span className={styles.rankName}>{current.rank}</span>
            <span className={styles.balance}>
              {formatAmount(balance ?? 0)} $GL1TCH
            </span>
            {next ? (
              <span className={styles.next}>
                {formatAmount(next.min - (balance ?? 0))} more to reach{" "}
                <strong>{next.rank}</strong>
              </span>
            ) : (
              <span className={styles.next}>Top tier reached. Ghost Node.</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.ladder}>
        {RANK_TIERS.map((t) => (
          <RankCard
            key={t.id}
            id={`ladder-${t.id}`}
            rank={t.rank}
            description={`${t.min === 0 ? "No holding required" : `${formatAmount(t.min)} $GL1TCH`}`}
            behavior={t.unlocks}
            tier={t.tier}
            className={current.id === t.id && connected && live ? styles.active : ""}
          />
        ))}
      </div>
    </div>
  );
}
