import { ImageResponse } from "next/og";
import { findOpportunity, getYieldSnapshot } from "@/lib/yield/client";
import { CHAIN_LABEL, KIND_LABEL } from "@/lib/yield/copy";
import { pct } from "@/lib/yield/format";
import { riskOf } from "@/lib/yield/risk";
import { displayName, protocolName } from "@/lib/yield/view";
import { OG_SIZE, yieldOgCard } from "@/components/yield/og";

/** Share card for /yield/<id>: name, chain, the measured number and the risk level. Generic card on any miss. */

export const alt = "GL1TCH Yield X-Ray card";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = findOpportunity(await getYieldSnapshot(), id);
  const card = o
    ? await yieldOgCard({
        title: displayName(o),
        subtitle: `${protocolName(o)} · ${KIND_LABEL[o.kind]} · ${CHAIN_LABEL[o.chain]}`,
        big: o.apy == null ? "measuring" : pct(o.apy),
        bigLabel: o.kind === "dex-lp" ? "Fee APR (pool average), read from the chain" : "APY, read from the chain",
        risk: (() => {
          const r = riskOf(o);
          return { level: r.level, score: r.score };
        })(),
      })
    : await yieldOgCard({ title: "Where does the APY come from?", subtitle: "Staking, lending and DEX yields on 7 chains", big: "X-Ray", bigLabel: "Free · read-only · no wallet" });
  return new ImageResponse(card, OG_SIZE);
}
