"use client";

import { useMemo, useState } from "react";
import styles from "./EmbedTool.module.css";

/**
 * EmbedTool — 1-click "Scanned by GL1TCH" badge generator. A project pastes its token,
 * previews the live badge, and copies HTML / Markdown / URL snippets. The badge
 * auto-updates and links back to the full scan → free distribution flywheel.
 */

const SITE = "https://coin-three-mu.vercel.app";
const CHAINS = ["solana", "ethereum", "bsc", "base", "arbitrum", "polygon", "optimism", "avalanche"];

export function EmbedTool() {
  const [chain, setChain] = useState("solana");
  const [addr, setAddr] = useState("");
  const [copied, setCopied] = useState("");

  const clean = addr.trim();
  const t = clean ? `${chain}-${clean}` : "";
  const scanUrl = clean ? `${SITE}/scan/${t}` : `${SITE}/scan`;
  const badgeUrl = clean ? `${SITE}/api/badge?t=${t}` : `${SITE}/api/badge`;

  const snippets = useMemo(() => ({
    HTML: `<a href="${scanUrl}" target="_blank" rel="noopener">\n  <img src="${badgeUrl}" alt="Scanned by GL1TCH" width="360" height="84" />\n</a>`,
    Markdown: `[![Scanned by GL1TCH](${badgeUrl})](${scanUrl})`,
    URL: badgeUrl,
  }), [scanUrl, badgeUrl]);

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { /* */ }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <select className={styles.select} value={chain} onChange={(e) => setChain(e.target.value)} aria-label="Chain">
          {CHAINS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          className={styles.input}
          placeholder="Paste your token contract address"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div className={styles.previewWrap}>
        <span className={styles.previewLabel}>Live preview</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={badgeUrl} className={styles.preview} src={badgeUrl} alt="GL1TCH badge preview" width={360} height={84} />
        <span className={styles.previewNote}>{clean ? "Auto-updates as the token's verdict changes." : "Enter an address to preview your token's live badge."}</span>
      </div>

      <div className={styles.snippets}>
        {Object.entries(snippets).map(([key, val]) => (
          <div key={key} className={styles.snip}>
            <div className={styles.snipHead}>
              <span className={styles.snipKey}>{key}</span>
              <button className={styles.copyBtn} onClick={() => copy(key, val)}>{copied === key ? "✓ copied" : "copy"}</button>
            </div>
            <pre className={styles.code}>{val}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
