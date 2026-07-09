import { Hero } from "@/components/sections/Hero";
import { StatsCounter } from "@/components/sections/StatsCounter";
import { LiveMarket } from "@/components/sections/LiveMarket";
import { QuantumShowcase } from "@/components/sections/QuantumShowcase";
import { AgentBanner } from "@/components/sections/AgentBanner";
import { SecurityScan } from "@/components/sections/SecurityScan";
import { TrustWall } from "@/components/sections/TrustWall";
import { WhyHold } from "@/components/sections/WhyHold";
import { Manifesto } from "@/components/sections/Manifesto";
import { Tokenomics } from "@/components/sections/Tokenomics";
import { HowToBuy } from "@/components/sections/HowToBuy";
import { Roadmap } from "@/components/sections/Roadmap";
import { Community } from "@/components/sections/Community";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { MobileCTABar } from "@/components/layout/MobileCTABar";

/**
 * Homepage — a focused, premium narrative:
 *   promise → real traction → the products → trust → why hold → how → close.
 * Deliberately tight: decorative and redundant sections live on their own pages
 * (Lore, News, Ranks, …) reachable from the footer, keeping this page uncluttered.
 */
export default function Home() {
  return (
    <>
      <Hero />

      {/* Real traction — our numbers, then the live market */}
      <StatsCounter />
      <LiveMarket />

      {/* The products — flagship first */}
      <QuantumShowcase />
      <div style={{ paddingBlock: "var(--space-6)" }}>
        <AgentBanner />
      </div>
      <SecurityScan />

      {/* Trust + value */}
      <TrustWall />
      <WhyHold />
      <Manifesto />

      {/* Token + conversion */}
      <Tokenomics />
      <HowToBuy />
      <Roadmap />

      {/* Community + close */}
      <Community />
      <FAQ />
      <FinalCTA />

      <MobileCTABar />
    </>
  );
}
