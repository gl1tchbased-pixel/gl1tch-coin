"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SceneStage } from "@/components/three/SceneStage";
import { verdictKind } from "@/lib/verdict";
import type { GraphSnapshot } from "@/lib/signal-graph";
import styles from "./SignalGraph3D.module.css";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/**
 * Signal Graph in 3D, from the bot's real deployer graph: a dot per mapped deployer, and every
 * flagged deployer linked to the tokens it shipped. The list under it carries the same data as
 * text (and is all there is when WebGL isn't).
 */
export function SignalGraph3D({ data }: { data: GraphSnapshot | null }) {
  const tipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  if (!data || data.deployers === 0) {
    return (
      <div className={styles.empty}>
        The Signal Graph didn&apos;t answer just now. It maps every deployer the scanner meets; the graph returns
        here as soon as the bot does.
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hud}>
        <span><b>{data.deployers.toLocaleString("en-US")}</b> deployers mapped</span>
        <span><b>{data.flaggedActors}</b> flagged</span>
        <span><b>{data.serialDeployers}</b> serial</span>
        <span className={styles.legend}>
          <i data-k="dot" />one dot per deployer <i data-k="warn" />watch <i data-k="bad" />serial / high-risk <i data-k="ok" />clean
        </span>
      </div>
      <SceneStage
        load={() => import("@/lib/scenes/signalGraph")}
        engine={{ background: "#130d28", bloom: [0.85, 0.55, 0.95], bokeh: false, backdrop: 1.6, fov: 34 }}
        options={{ deployers: data.deployers, hubs: data.hubs }}
        ui={() => ({ tip: tipRef.current, onOpen: (href: string) => router.push(href) })}
        className={styles.stage}
        label={`Signal Graph: ${data.deployers} deployers mapped, ${data.flaggedActors} flagged. Details in the list below.`}
      >
        <div className={styles.tip} ref={tipRef} hidden />
      </SceneStage>

      {data.hubs.length > 0 ? (
        <ul className={styles.list} aria-label="Flagged deployers">
          {data.hubs.map((h) => (
            <li key={h.address}>
              <span className={styles.addr}>{short(h.address)}</span>
              <span className={styles.lvl} data-level={h.level}>{h.level}</span>
              <span className={styles.count}>{h.flaggedCount}/{h.tokensSeen} flagged</span>
              <span className={styles.toks}>
                {h.tokens.slice(0, 3).map((t) => (
                  <Link key={t.mint} href={`/scan/${h.chain}-${t.mint}`} data-kind={verdictKind(t.verdict)}>
                    {t.symbol ? `$${t.symbol}` : t.name || short(t.mint)}{t.score != null ? ` ${t.score}` : ""}
                  </Link>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.note}>No flagged deployers right now. The shell above is every deployer the graph has seen.</p>
      )}
      <p className={styles.note}>
        A flagged token is a risk signal from our scanner, not proof of intent. A deployer turns &ldquo;serial&rdquo; after two
        or more flagged tokens.
      </p>
    </div>
  );
}
