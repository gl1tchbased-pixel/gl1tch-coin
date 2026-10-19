import { heroContent } from "@/content/hero";
import { HeroExperience } from "./HeroExperience";

/**
 * Homepage hero: the product starts here. Headline, a real token scan with an inline verdict,
 * and the live Signal Core scene (Glitchy + the latest Rug Radar sweep). Text is server-rendered,
 * so the headline is what paints first; the 3D boots once the page is idle.
 */
export function Hero() {
  const { eyebrow, headline, subhead, microcopy } = heroContent;
  return <HeroExperience copy={{ eyebrow, headline, subhead, microcopy }} />;
}
