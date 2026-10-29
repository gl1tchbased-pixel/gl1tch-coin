import type { Metadata } from "next";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "How to Read an APY Before You Deposit (2026) — 5 Questions | GL1TCH",
  description:
    "An APY is a promise about the past. Five questions to ask before you stake, lend or provide liquidity: who pays it, what it's paid in, how you get out, what impermanent loss does, and how to verify the number yourself.",
  alternates: { canonical: "/learn/how-to-read-an-apy" },
};

export default function Page() {
  return (
    <Article
      slug="how-to-read-an-apy"
      eyebrow="Yield"
      title="How to read an APY before you deposit"
      intro="A big APY is the oldest hook in crypto. The number itself tells you almost nothing: it's a measurement of the past, in a unit you may not care about, from a source you usually can't check. Five questions turn it into something you can decide with."
      tool={{ prompt: "Want these answers for a real yield?", href: "/yield", label: "Open Yield X-Ray →" }}
      ctaLine="Yield X-Ray answers these five questions for staking, lending and DEX-pool yields on seven chains, read straight from the chain, free and without a wallet."
      endPrimary={{ href: "/yield", label: "Open Yield X-Ray" }}
      endGhost={{ href: "/yield/il", label: "Try the impermanent-loss playground" }}
      related={[
        { href: "/yield/dollar", label: "Where does a dollar earn?" },
        { href: "/yield/staking", label: "SOL vs ETH staking" },
        { href: "/learn/how-to-check-if-a-token-is-safe", label: "Check if a token is safe" },
      ]}
      sections={[
        {
          h: "1. Who pays it?",
          body: (
            <ul>
              <li><strong>Borrowers</strong> (lending): interest from people borrowing the asset. Real, but it moves with demand.</li>
              <li><strong>The network</strong> (staking): new coins issued to validators. Real, but it&apos;s partly inflation: if you don&apos;t stake, you get diluted.</li>
              <li><strong>Traders</strong> (DEX pools): swap fees. Real, but you carry impermanent loss.</li>
              <li><strong>A reward token</strong> (incentives): freshly printed tokens. Often temporary, and worth only what the market pays for them.</li>
              <li><strong>Nobody you can name</strong>: a fixed &ldquo;daily 1%&rdquo; with no source is the classic sign of a scheme paying old users with new deposits. <span className="flag">Walk away.</span></li>
            </ul>
          ),
        },
        {
          h: "2. What is it paid in?",
          body: (
            <p>
              Staking rewards come in SOL or ETH, so a 5% APY means 5% more coins, not 5% more dollars. If the coin falls 30%, the yield
              doesn&apos;t cover it. Stablecoin yields avoid that, but then the question becomes whether the stablecoin and the protocol
              holding it are sound.
            </p>
          ),
        },
        {
          h: "3. How do you get out, and how fast?",
          body: (
            <p>
              Lending pools can only pay you out of money that isn&apos;t lent: when a market is nearly fully borrowed, withdrawals wait.
              Unstaking takes an epoch on Solana and can take days to weeks on Ethereum; the instant exit is a swap at market price,
              which can be below the stake behind your token in a rush. Check the exit before the entry.
            </p>
          ),
        },
        {
          h: "4. For pools: what does impermanent loss do?",
          body: (
            <p>
              A DEX pool keeps two tokens at equal value. When one moves against the other, you end up with more of the loser and less of
              the winner than if you had simply held. The pool&apos;s APY is the fee income and does not subtract this: a 50/50 position
              loses about 5.7% versus holding when one token doubles or halves against the other, and concentrated positions lose more.
            </p>
          ),
        },
        {
          h: "5. Can you verify the number?",
          body: (
            <p>
              Most yield sites show a number with no way to check it. On-chain yields don&apos;t need trust: an Aave rate, a stake pool&apos;s
              exchange rate and a DEX pool&apos;s fee counter can all be read with one public request. Yield X-Ray prints that request on
              every card, so you can paste it into a terminal and get the same raw value.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "What is the difference between APR and APY?", a: "APR is the simple yearly rate. APY includes compounding: reinvesting what you earn. At 5% the difference is small; at high rates it grows. DEX pool fees are usually shown as APR because they are not compounded automatically." },
        { q: "Is a higher APY better?", a: "Not by itself. A higher APY usually means more risk: a thinner market, a temporary incentive, impermanent loss or a token that can fall. Look at who pays it and how you get out before comparing numbers." },
        { q: "Is staking yield free money?", a: "No. Most staking rewards are newly issued coins, so part of the yield only offsets the dilution everyone else pays. It is also paid in the coin itself, so the dollar result depends on its price." },
        { q: "How can I check a yield without connecting my wallet?", a: "Read it from the chain. Yield X-Ray shows each yield's source, exit, risk points and the exact public RPC request behind the number, with no wallet, account or sign-up." },
      ]}
    />
  );
}
