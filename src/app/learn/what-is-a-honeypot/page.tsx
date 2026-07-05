import type { Metadata } from "next";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "What Is a Honeypot Crypto Scam? How to Detect One | GL1TCH",
  description:
    "A honeypot crypto scam lets you buy a token but blocks you from selling. Learn how honeypots work on Ethereum, BSC and Solana, the warning signs, and how to detect one for free before you buy.",
  alternates: { canonical: "/learn/what-is-a-honeypot" },
};

export default function Page() {
  return (
    <Article
      slug="what-is-a-honeypot"
      eyebrow="Honeypots"
      title="What is a honeypot crypto scam?"
      intro="A honeypot is a token you can buy but can't sell. The chart looks like it only goes up — because nobody is allowed to take profit except the scammer. By the time you notice, your funds are trapped. Here's how honeypots work and how to detect one before you ape."
      sections={[
        {
          h: "How a honeypot works",
          body: (
            <p>
              The contract (or the token&apos;s authorities) contains a trap that blocks or taxes selling for
              everyone except allow-listed wallets. Common mechanisms: a sell function that reverts for normal
              holders, a 99% sell tax, a trading-pause switch the owner controls, or — on Solana — a live
              <strong> freeze authority</strong> that lets the deployer freeze your token account so you
              physically can&apos;t transfer or sell.
            </p>
          ),
        },
        {
          h: "Warning signs of a honeypot",
          body: (
            <ul>
              <li><strong>Only green candles, no sells.</strong> A price that never dips even on volume is suspicious.</li>
              <li><strong>Buy tax ≠ sell tax.</strong> A tiny buy tax and a huge (or hidden) sell tax.</li>
              <li><strong>Owner not renounced.</strong> The owner can flip a &quot;pause trading&quot; or tax switch at will.</li>
              <li><strong>Live freeze authority (Solana).</strong> They can freeze your wallet — treat as a honeypot.</li>
              <li><strong>Contract not verified (EVM).</strong> You can&apos;t see what the code actually does.</li>
            </ul>
          ),
        },
        {
          h: "How to detect a honeypot for free",
          body: (
            <p>
              A good scanner simulates a sell and checks the contract&apos;s authorities and tax logic, then tells
              you plainly whether you can get out. GL1TCH runs a honeypot check (via on-chain data + GoPlus on EVM,
              and mint/freeze/tax on Solana) on any token — free, no wallet connection. If it can&apos;t confirm
              you&apos;re able to sell, it flags the token <span className="flag">HIGH RISK</span> or
              <span className="flag"> RUG-SHAPED</span>.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "What is a honeypot in crypto?", a: "A honeypot is a scam token that lets you buy but prevents you from selling — through a malicious contract, an extreme sell tax, a trading-pause switch, or (on Solana) a live freeze authority. Your funds get trapped while the scammer exits." },
        { q: "How do I check if a token is a honeypot?", a: "Use a free honeypot checker that simulates a sell and inspects the contract's tax and authority logic. GL1TCH does this on any chain and gives a plain-English verdict without you connecting your wallet." },
        { q: "Is a token with a freeze authority a honeypot?", a: "Effectively yes — on Solana a live freeze authority lets the deployer freeze your token account so you can't sell. Prefer tokens where mint and freeze authority are both revoked." },
      ]}
    />
  );
}
