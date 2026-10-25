// Separate entry for the feature shorts (scripts/feature-shorts.mjs), so the main Remotion root stays untouched.
import React from "react";
import { Composition, registerRoot } from "remotion";
import { FeatureShort } from "./FeatureShort";
import { FEATURE_FRAMES, type FeatureProps } from "./types";

const sample: FeatureProps = {
  id: "sample",
  kicker: "Rug Radar",
  hook: ["It hunts rugs", "while you sleep."],
  pain: "New tokens launch every minute. Most never get a second look before people buy.",
  demo: { kind: "radar", rows: [{ name: "Example", symbol: "EXMPL", verdict: "HIGH RISK", score: 22, reason: "mint authority active" }], live: "live" },
  benefits: ["Fresh launches, scored", "Riskiest first", "Free, no wallet"],
  cta: "gl1tchbased.xyz/radar",
  pose: "glitchy-chrome-34.png",
  clip: "chrome-wave.mp4",
  layout: "left",
  tint: "purple",
  hookStyle: "pop",
};

const Root: React.FC = () => (
  <Composition id="feature-short" component={FeatureShort} durationInFrames={FEATURE_FRAMES} fps={30} width={1080} height={1920} defaultProps={sample} />
);

registerRoot(Root);
