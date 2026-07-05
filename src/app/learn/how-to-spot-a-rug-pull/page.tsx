import type { Metadata } from "next";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "How to Spot a Rug Pull (2026) — 7 On-Chain Red Flags | GL1TCH",
  description:
    "Learn how to spot a crypto rug pull before you buy. The 7 on-chain red flags — unlocked liquidity, live mint authority, honeypots, whale concentration, insiders — explained in plain English, with a free scanner to check any token.",
  alternates: { canonical: "/learn/how-to-spot-a-rug-pull" },
};

export default function Page() {
  return (
    <Article
      slug="how-to-spot-a-rug-pull"
      eyebrow="Rug pulls"
      title="How to spot a rug pull before you buy"
      intro="A rug pull is when a token's team (or an early whale) drains the liquidity or dumps their supply, leaving you holding a worthless coin. The good news: almost every rug leaves the same on-chain fingerprints — and you can check them in seconds, for free, without connecting your wallet."
      sections={[
        {
          h: "The 7 red flags that matter",
          body: (
            <ul>
              <li><strong>Unlocked liquidity.</strong> If the LP tokens aren&apos;t burned or locked, the dev can pull the pool at any moment. This is the classic rug. <span className="ok">Want: 100% locked/burned.</span></li>
              <li><strong>Live mint authority.</strong> If mint authority isn&apos;t revoked, they can print unlimited new tokens and dump. <span className="ok">Want: revoked.</span></li>
              <li><strong>Live freeze authority (Solana).</strong> Lets them freeze your wallet so you can&apos;t sell — a honeypot by another name. <span className="ok">Want: revoked.</span></li>
              <li><strong>Honeypot / sell tax (EVM).</strong> You can buy but not sell, or the sell tax is punitive. <span className="flag">Instant avoid.</span></li>
              <li><strong>Whale concentration.</strong> One non-LP wallet holding a huge share can crater the price by selling. Check the top holders.</li>
              <li><strong>Insider / bundled supply.</strong> Many wallets funded by one source, ready to dump together.</li>
              <li><strong>Fake / thin liquidity.</strong> A pool too small to exit, or volume that doesn&apos;t match the liquidity (wash-traded).</li>
            </ul>
          ),
        },
        {
          h: "How to check them in under a minute",
          body: (
            <p>
              You don&apos;t need to read Solidity or dig through Solscan by hand. Paste the token&apos;s
              contract address (or just its name) into a free scanner and it reads all seven signals from
              the chain and gives you a plain-English verdict. GL1TCH does exactly this — non-custodial,
              any chain — and even keeps watching the token after you buy, so if the liquidity unlocks or
              an authority comes back, you get pinged.
            </p>
          ),
        },
        {
          h: "A safe-looking token can still dump",
          body: (
            <p>
              Passing the contract checks means it isn&apos;t a <em>structural</em> rug — it doesn&apos;t
              mean the price will go up. Thin liquidity, low holder count, and hype with no product are
              still ways to lose money. Contract-safe + no real traction = high risk of a slow bleed.
              Always size accordingly and DYOR.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "Can you spot a rug pull with a free tool?", a: "Yes. The main rug vectors — liquidity lock, mint/freeze authority, honeypot, holder concentration and insiders — are all readable from on-chain data. Free scanners like GL1TCH aggregate them and give a plain-English verdict without you connecting a wallet." },
        { q: "What is the biggest rug-pull red flag?", a: "Unlocked liquidity. If the LP tokens are not burned or locked, the team can remove the pool at any time, which is the classic rug pull. Always confirm liquidity is 100% locked or burned." },
        { q: "Does a locked liquidity mean a token is safe?", a: "It removes the single biggest rug vector, but not all risk. You still need to check mint/freeze authority, taxes, holder concentration and whether there is real trading — a locked but abandoned token can still go to zero." },
      ]}
    />
  );
}
