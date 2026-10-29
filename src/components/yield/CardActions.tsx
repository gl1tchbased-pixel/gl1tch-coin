"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "@/app/yield/yield.module.css";

/**
 * The card's action bar: what a visitor can do next. Watch (Telegram deep link that subscribes in one tap),
 * share, copy, scan the tokens, open the protocol. None of these ask for a wallet.
 */
export function CardActions({
  telegram,
  url,
  share,
  scans,
  protocol,
}: {
  telegram: string;
  url: string;
  share: string;
  scans: { label: string; href: string }[];
  protocol: { name: string; url: string } | null;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the URL is still in the address bar */
    }
  };
  const x = `https://x.com/intent/tweet?text=${encodeURIComponent(share)}&url=${encodeURIComponent(url)}`;
  return (
    <div className={styles.actions}>
      <a className={`${styles.btn} ${styles.btnPrimary}`} href={telegram} target="_blank" rel="noopener noreferrer">
        🔔 Alert me on Telegram
      </a>
      <a className={styles.btn} href={x} target="_blank" rel="noopener noreferrer">
        Share on X
      </a>
      <button type="button" className={styles.btn} onClick={copy}>
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
      {scans.slice(0, 2).map((s) => (
        <Link key={s.href} className={styles.btn} href={s.href}>
          {s.label}
        </Link>
      ))}
      {protocol && (
        <a className={styles.btn} href={protocol.url} target="_blank" rel="noopener noreferrer">
          {protocol.name} ↗
        </a>
      )}
    </div>
  );
}
