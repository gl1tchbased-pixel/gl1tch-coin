import { Hero } from "@/components/sections/Hero";
import { ProofStrip } from "@/components/sections/ProofStrip";
import { ProductsBento } from "@/components/sections/ProductsBento";
import { RadarFeed } from "@/components/sections/RadarFeed";
import { TrustWall } from "@/components/sections/TrustWall";
import { WhyHold } from "@/components/sections/WhyHold";
import { Tokenomics } from "@/components/sections/Tokenomics";
import { MeetGlitchy } from "@/components/sections/MeetGlitchy";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { MobileCTABar } from "@/components/layout/MobileCTABar";

// Live product numbers (bot metrics) refresh at most once a minute.
export const revalidate = 60;

/**
 * Homepage, v2 — eight beats: use the product (hero scan + Signal Core), see the proof, pick a
 * product, watch the radar catch rugs, verify us, why hold (tiers included), meet Glitchy, close.
 * Long reads live on their own pages: /roadmap, /thesis (manifesto), /token (how to buy), /live.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <ProofStrip />
      <ProductsBento />
      <RadarFeed />
      <TrustWall />
      <WhyHold />
      <Tokenomics />
      <MeetGlitchy />
      <FAQ />
      <FinalCTA />
      <MobileCTABar />
    </>
  );
}
