import { ImageResponse } from "next/og";
import { OG_SIZE, yieldOgCard } from "@/components/yield/og";

export const alt = "GL1TCH Yield X-Ray: where does the APY come from?";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    await yieldOgCard({
      title: "Where does the APY come from?",
      subtitle: "Staking, lending and DEX yields on 7 chains, read straight from the chain",
      big: "X-Ray",
      bigLabel: "Free · read-only · no wallet",
    }),
    OG_SIZE
  );
}
