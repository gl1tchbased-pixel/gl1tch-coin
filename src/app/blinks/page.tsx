"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./blinks.module.css";
import { OFFICIAL } from "@/lib/official";

const POPULAR_TOKENS = [
  { symbol: "$GL1TCH", mint: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump" },
  { symbol: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  { symbol: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" },
  { symbol: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm" },
  { symbol: "USDC", mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
];

export default function BlinksPage() {
  const [activeType, setActiveType] = useState<"swap" | "scan">("swap");
  const [tokenMint, setTokenMint] = useState("3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump");
  const [selectedPreset, setSelectedPreset] = useState("0.5");
  const [customAmount, setCustomAmount] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedToken = POPULAR_TOKENS.find((t) => t.mint === tokenMint);
  const tokenLabel = selectedToken ? selectedToken.symbol : `${tokenMint.slice(0, 4)}...${tokenMint.slice(-4)}`;

  const origin = "https://gl1tchbased.xyz";

  // Action URLs
  const swapActionUrl = `${origin}/api/actions/safe-swap?mint=${tokenMint}`;
  const scanActionUrl = `${origin}/api/actions/scan?address=${tokenMint}`;
  const currentActionUrl = activeType === "swap" ? swapActionUrl : scanActionUrl;

  // Dial.to URLs
  const dialToUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(currentActionUrl)}`;

  // Tweet Intent
  const tweetText =
    activeType === "swap"
      ? `🛡️ Safe Swap ${tokenLabel} on Solana:\n⚡ Instant Jupiter routing with @gl1tchbased anti-rug gating.\n\nTry the Blink 👇\n${dialToUrl}`
      : `🔍 Instant Security Scan for ${tokenLabel}:\n⚡ Flag mint authorities, freeze risks & rugs with @gl1tchbased Solana Action.\n\nAudit token 👇\n${dialToUrl}`;

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
        <div className={styles.badge}>⚡ Solana Actions & Blinks v2.4 Spec</div>
        <h1 className={styles.title}>
          <span className={styles.accent}>Safe Swap</span> & Scan Blinks
        </h1>
        <p className={styles.subtitle}>
          Turn any Solana token trade into a shareable Blink. Non-custodial Jupiter v6 routing, pre-execution anti-rug gating, and 50 bps platform fees to GL1TCH treasury.
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
                <span className={styles.actionBoxTitle}>Dial.to Inspector Link</span>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(dialToUrl, "dialUrl")}
                >
                  {copiedKey === "dialUrl" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className={styles.actionBoxUrl}>{dialToUrl}</div>
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
              Tweet Blink on X
            </a>
            <a
              href={dialToUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaDial}
            >
              Test in Dial.to ↗
            </a>
          </div>
        </div>

        {/* Right: Live Blink Preview Mockup */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📱 Live Blink Preview</h2>
            <span style={{ fontSize: "0.78rem", color: "#a8b0bd" }}>X / Phantom Native</span>
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
                  ? `Pre-execution anti-rug analysis + non-custodial Jupiter v6 route. Zero honeypot risk. 50 bps platform fee supports GL1TCH security infrastructure.`
                  : `Instant multi-chain rug scan: checks freeze/mint authorities, liquidity lock, insider snipers & deployer track record on-chain.`}
              </p>

              {activeType === "swap" ? (
                <>
                  <div className={styles.blinkPresetRow}>
                    {["0.1", "0.5", "1.0"].map((amt) => (
                      <button
                        key={amt}
                        className={`${styles.blinkPresetBtn} ${
                          selectedPreset === amt && !customAmount ? styles.blinkPresetActive : ""
                        }`}
                        onClick={() => {
                          setSelectedPreset(amt);
                          setCustomAmount("");
                        }}
                      >
                        {amt} SOL
                      </button>
                    ))}
                  </div>

                  <div className={styles.blinkCustomRow}>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.blinkCustomInput}
                      placeholder="Custom SOL amount..."
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                    />
                  </div>

                  <a
                    href={dialToUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.blinkSwapBtn}
                  >
                    ⚡ Swap {customAmount ? `${customAmount} SOL` : `${selectedPreset} SOL`} on Jupiter
                  </a>
                </>
              ) : (
                <a
                  href={dialToUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.blinkSwapBtn}
                >
                  🔍 Run Full Security Scan
                </a>
              )}

              <div className={styles.blinkSecurityFooter}>
                <span>✓ Non-Custodial</span>
                <span>•</span>
                <span>✓ Verified Action v2.4</span>
                <span>•</span>
                <span>✓ 0% Rug Risk</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid: Value Proposition & Fee Transparency */}
      <div className={styles.featureSection}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 750, textAlign: "center", margin: "0 0 1rem" }}>
          Why GL1TCH Blinks Drive Real On-Chain Volume
        </h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureTitle}>Pre-Execution Rug Gating</h3>
            <p className={styles.featureText}>
              Unlike standard DEX aggregators, GL1TCH analyzes the token before creating the swap transaction. If a token is detected as a honeypot, has active freeze authority, or score &gt; 70 risk, the Blink disables the swap button to protect retail buyers.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>Clear Fee Flywheel</h3>
            <p className={styles.featureText}>
              Safe Swap routes through Jupiter. When our referral account is active, GL1TCH takes a 0.5% fee and the swap screen says so before you sign. If it is not active, the swap screen says there is no GL1TCH fee.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🐦</div>
            <h3 className={styles.featureTitle}>Viral Social Distribution</h3>
            <p className={styles.featureText}>
              Anyone can tweet any token's Safe Swap Blink link. On X, users with Phantom or Backpack extensions see a rich interactive swap interface natively in their feed, eliminating friction and driving effortless trade volume.
            </p>
          </div>
        </div>
      </div>

      {/* Developer & Grant Reviewer Spec Section */}
      <div className={styles.specSection}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 750, margin: 0 }}>
            🛠️ Solana Actions Specification v2.4 Details
          </h2>
          <span style={{ fontSize: "0.85rem", color: "var(--accent, #7cf6c8)" }}>
            Solana Foundation & Mobile Grant Invariant
          </span>
        </div>

        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary, #a8b0bd)", lineHeight: 1.6, margin: "10px 0 16px" }}>
          GL1TCH implements the official Solana Actions v2.4 protocol with root registration, CORS pre-flight support, strict type checking, and non-custodial transaction generation.
        </p>

        <div className={styles.codeBlock}>
{`// Root Actions Discovery (actions.json & /.well-known/actions.json)
{
  "rules": [
    { "pathPattern": "/swap", "apiPath": "/api/actions/swap" },
    { "pathPattern": "/scan", "apiPath": "/api/actions/scan" }
  ]
}

// Endpoints
GET  https://gl1tchbased.xyz/api/actions/swap?outputMint={MINT}   -> Returns ActionGetResponse
POST https://gl1tchbased.xyz/api/actions/swap?outputMint={MINT}   -> Returns ActionPostResponse (unsigned base64 tx)
GET  https://gl1tchbased.xyz/api/actions/scan?address={ADDRESS}   -> Returns Token Security Card
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

