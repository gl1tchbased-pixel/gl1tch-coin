"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./blinks.module.css";
import { OFFICIAL } from "@/lib/official";

const POPULAR_TOKENS = [
  { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  { symbol: "$GL1TCH", mint: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump" },
];

export default function BlinksPage() {
  const [activeType, setActiveType] = useState<"swap" | "scan">("swap");
  const [tokenMint, setTokenMint] = useState(POPULAR_TOKENS[0].mint);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedToken = POPULAR_TOKENS.find((t) => t.mint === tokenMint);
  const tokenLabel = selectedToken ? selectedToken.symbol : `${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)}`;

  const origin = "https://gl1tchbased.xyz";

  // Action URLs
  const swapActionUrl = `${origin}/api/actions/safe-swap?mint=${tokenMint}`;
  const scanActionUrl = `${origin}/api/actions/scan?mint=${tokenMint}`;
  const currentActionUrl = activeType === "swap" ? swapActionUrl : scanActionUrl;

  // What people open and share. These are plain <a> links: the swap page needs a full page load for its CSP.
  const swapPagePath = `/safe-swap/${tokenMint}`;
  const scanPagePath = `/scan/solana-${tokenMint}`;
  const shareUrl = `${origin}${activeType === "swap" ? swapPagePath : scanPagePath}`;

  // Tweet Intent
  const tweetText =
    activeType === "swap"
      ? `🛡️ Safe Swap ${tokenLabel} on Solana:\n⚡ Jupiter routing, scanned first by @gl1tchbased. A 0.5% fee may apply, shown before you sign.\n\nTry it 👇\n${shareUrl}`
      : `🔍 Instant Security Scan for ${tokenLabel}:\n⚡ Flag mint authorities, freeze risks & rugs with @gl1tchbased.\n\nAudit token 👇\n${shareUrl}`;

  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <div className={styles.container}>
      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.badge}>⚡ Solana Actions & Blinks</div>
        <h1 className={styles.title}>
          <span className={styles.accent}>Safe Swap</span> & Scan Blinks
        </h1>
        <p className={styles.subtitle}>
          Turn a Solana token swap into a shareable Blink. Non-custodial Jupiter routing, a safety scan before every buy, and a disclosed 0.5% GL1TCH fee.
        </p>
      </div>

      {/* Workbench: Generator + Preview */}
      <div className={styles.workbench}>
        {/* Left: Generator Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>⚙️ Blink Generator</h2>
            <span style={{ fontSize: "0.8rem", color: "var(--accent, #7cf6c8)", fontFamily: "monospace" }}>
              actions.json Ready
            </span>
          </div>

          <div className={styles.typeSelector}>
            <button
              className={`${styles.typeButton} ${activeType === "swap" ? styles.typeButtonActive : ""}`}
              onClick={() => setActiveType("swap")}
            >
              🔄 Safe Swap Blink
            </button>
            <button
              className={`${styles.typeButton} ${activeType === "scan" ? styles.typeButtonActive : ""}`}
              onClick={() => setActiveType("scan")}
            >
              🔍 Safety Scan Blink
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Target Solana Token Mint Address</label>
            <input
              type="text"
              className={styles.input}
              value={tokenMint}
              onChange={(e) => setTokenMint(e.target.value.trim())}
              placeholder="Paste token mint (e.g. 3HQJ...pump)"
            />
            <div className={styles.quickTokens}>
              {POPULAR_TOKENS.map((token) => (
                <button
                  key={token.mint}
                  className={`${styles.tokenChip} ${tokenMint === token.mint ? styles.tokenChipActive : ""}`}
                  onClick={() => setTokenMint(token.mint)}
                >
                  {token.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Action Boxes */}
          <div className={styles.actionBoxes}>
            <div className={styles.actionBox}>
              <div className={styles.actionBoxHeader}>
                <span className={styles.actionBoxTitle}>Solana Action Spec URL</span>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(currentActionUrl, "actionUrl")}
                >
                  {copiedKey === "actionUrl" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className={styles.actionBoxUrl}>{currentActionUrl}</div>
            </div>

            <div className={styles.actionBox}>
              <div className={styles.actionBoxHeader}>
                <span className={styles.actionBoxTitle}>Share Link</span>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(shareUrl, "shareUrl")}
                >
                  {copiedKey === "shareUrl" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className={styles.actionBoxUrl}>{shareUrl}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.buttonRow}>
            <a
              href={tweetIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaTweet}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X
            </a>
            <a
              href={shareUrl}
              className={styles.ctaDial}
            >
              Open →
            </a>
          </div>
        </div>

        {/* Right: Live Blink Preview Mockup */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📱 Preview</h2>
            <span style={{ fontSize: "0.78rem", color: "#a8b0bd" }}>Scanned before every buy</span>
          </div>

          <div className={styles.blinkMock}>
            <div className={styles.blinkMockHero}>
              <div className={styles.blinkLogoWrapper}>
                <div className={styles.blinkLogo}>🛡️</div>
                <div className={styles.blinkSiteBadge}>gl1tchbased.xyz</div>
              </div>
            </div>

            <div className={styles.blinkBody}>
              <div className={styles.blinkHeader}>
                <h3 className={styles.blinkMockTitle}>
                  {activeType === "swap" ? `Safe Swap: ${tokenLabel}` : `Security Audit: ${tokenLabel}`}
                </h3>
                <span className={styles.blinkPowered}>via Jupiter</span>
              </div>

              <p className={styles.blinkDesc}>
                {activeType === "swap"
                  ? `Scanned before the swap is built, then routed through Jupiter. A scan lowers risk but cannot rule out losses. 0.5% GL1TCH fee when the swap screen shows it.`
                  : `Instant multi-chain rug scan: checks freeze/mint authorities, liquidity lock, insider snipers & deployer track record on-chain.`}
              </p>

              {activeType === "swap" ? (
                <>
                  <a href={swapPagePath} className={styles.blinkSwapBtn}>
                    ⚡ Open Safe Swap
                  </a>
                  <p className={styles.blinkNote}>
                    You choose the amount on the next screen, in Jupiter&apos;s swap form, after the token passes the scan.
                  </p>
                </>
              ) : (
                <a href={scanPagePath} className={styles.blinkSwapBtn}>
                  🔍 Run Full Security Scan
                </a>
              )}

              <div className={styles.blinkSecurityFooter}>
                <span>✓ Non-Custodial</span>
                <span>•</span>
                <span>✓ Scan first</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid: Value Proposition & Fee Transparency */}
      <div className={styles.featureSection}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 750, textAlign: "center", margin: "0 0 1rem" }}>
          How Safe Swap Works
        </h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureTitle}>A Scan Before Every Buy</h3>
            <p className={styles.featureText}>
              GL1TCH scans the token before it builds the swap. The buy is refused unless the verdict is CLEAN or LOW RISK with a score of at least 60, or if too many scan sources were unavailable. A passing scan is not a recommendation and cannot rule out losses.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>A Disclosed Fee</h3>
            <p className={styles.featureText}>
              GL1TCH takes 0.5% on swaps where the swap screen shows it, before you sign, and Jupiter keeps 20% of that. Otherwise the screen says there is no GL1TCH fee. The fee plays no part in a token&apos;s score, and the scoring code is public.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🐦</div>
            <h3 className={styles.featureTitle}>Shareable Anywhere</h3>
            <p className={styles.featureText}>
              Anyone can share a token&apos;s Safe Swap link. The same safety scan runs whoever shared it, and you still review and sign in your own wallet.
            </p>
          </div>
        </div>
      </div>

      {/* Developer spec */}
      <div className={styles.specSection}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 750, margin: 0 }}>
            🛠️ Solana Actions Endpoints
          </h2>
        </div>

        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #a8b0bd)", lineHeight: 1.6, margin: "10px 0 16px" }}>
          GL1TCH serves Solana Actions with root discovery and CORS pre-flight support. Swap requests return an unsigned transaction that only the user&apos;s wallet can sign. Clients that render Actions can use these directly. The dial.to page that many Blink links point to is currently paused by its owner, so GL1TCH&apos;s own links open the Safe Swap page instead.
        </p>

        <div className={styles.codeBlock}>
{`// Root Actions Discovery (actions.json & /.well-known/actions.json)
{
  "rules": [
    { "pathPattern": "/api/actions/**", "apiPath": "/api/actions/**" },
    { "pathPattern": "/scan/**", "apiPath": "/api/actions/scan" },
    { "pathPattern": "/swap/**", "apiPath": "/api/actions/safe-swap" }
  ]
}

// Endpoints
GET  https://gl1tchbased.xyz/api/actions/safe-swap?mint={MINT}                -> Returns ActionGetResponse
POST https://gl1tchbased.xyz/api/actions/safe-swap?mint={MINT}&amount={SOL}   -> Returns ActionPostResponse (unsigned base64 tx)
GET  https://gl1tchbased.xyz/api/actions/scan?mint={MINT}                     -> Returns Token Security Card
`}
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
          <Link href="/revenue" className={styles.copyButton} style={{ textDecoration: "none", padding: "8px 16px" }}>
            📊 View Live Treasury Revenue Ledger
          </Link>
          <Link href="/security" className={styles.copyButton} style={{ textDecoration: "none", padding: "8px 16px" }}>
            🔒 Security Invariants & CI Audits
          </Link>
          <a
            href={OFFICIAL.X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.copyButton}
            style={{ textDecoration: "none", padding: "8px 16px" }}
          >
            🐦 Follow @gl1tchbased on X
          </a>
        </div>
      </div>
    </div>
  );
}

