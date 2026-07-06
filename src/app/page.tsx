import { Hero } from "@/components/sections/Hero";
import { AgentBanner } from "@/components/sections/AgentBanner";
import { StatsCounter } from "@/components/sections/StatsCounter";
import { LiveMarket } from "@/components/sections/LiveMarket";
import { Manifesto } from "@/components/sections/Manifesto";
import { LorePreview } from "@/components/sections/LorePreview";
import { Tokenomics } from "@/components/sections/Tokenomics";
import { TrustWall } from "@/components/sections/TrustWall";
import { SecurityScan } from "@/components/sections/SecurityScan";
import { Difference } from "@/components/sections/Difference";
import { WhyHold } from "@/components/sections/WhyHold";
import { HowToBuy } from "@/components/sections/HowToBuy";
import { Roadmap } from "@/components/sections/Roadmap";
import { News } from "@/components/sections/News";
import { Community } from "@/components/sections/Community";
import { SocialProof } from "@/components/sections/SocialProof";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { MobileCTABar } from "@/components/layout/MobileCTABar";
import { Marquee } from "@/components/effects/Marquee";
import { LiveCounter } from "@/components/web3/LiveCounter";

export default function Home() {
  return (
    <>
      <Hero />
      <div style={{ paddingBlock: "var(--space-6)" }}>
        <AgentBanner />
      </div>
      <div className="container" style={{ paddingBlock: "var(--space-6)" }}>
        <LiveCounter />
      </div>
      <StatsCounter />
      <LiveMarket />
      <Manifesto />
      <LorePreview />
      <Marquee />
      <Tokenomics />
      <TrustWall />
      <SecurityScan />
      <Difference />
      <WhyHold />
      <HowToBuy />
      <Roadmap />
      <News />
      <Community />
      <SocialProof />
      <FAQ />
      <Marquee reverse />
      <FinalCTA />
      <MobileCTABar />
    </>
  );
}
