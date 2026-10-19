"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SceneStage } from "@/components/three/SceneStage";
import { VoxelTrail } from "@/components/effects/VoxelTrail";
import { HeroPriceChip } from "./HeroPriceChip";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { verdictKind } from "@/lib/verdict";
import styles from "./Hero.module.css";
import { unlock } from "@/lib/fun/achievements";
import { sfx } from "@/lib/fun/sound";

/** What the hero scene exposes (src/lib/scenes/signalCore.js). */
interface CoreApi {
  setSweep: (items: RadarItem[]) => void;
  react: (kind: Kind) => void;
  scanning: () => void;
  greet: () => void;
}
type Kind = "ok" | "warn" | "bad" | "error";
interface RadarItem { chain: string; mint: string; name: string; symbol: string; verdict: string; score: number }
interface Radar { scanned: number; flagged: number; caught: RadarItem[]; updatedAt?: number }
interface Result { name: string; verdict: string; score: number; href: string; kind: Kind }
type ScanState =
  | { status: "idle" }
  | { status: "scanning"; q: string }
  | { status: "done"; result: Result }
  | { status: "error"; q: string };

export interface HeroCopy {
  eyebrow: string;
  headline: string;
  subhead: string;
  microcopy: string;
}

const TRIES = [
  { label: "$GL1TCH", q: CONTRACT_ADDRESS },
  { label: "BONK", q: "BONK" },
  { label: "PEPE", q: "PEPE" },
];

const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const ago = (ms?: number) => {
  if (!ms) return "";
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};
const label = (it: { symbol?: string; name?: string; mint: string }) =>
  it.symbol ? `$${it.symbol}` : it.name || `${it.mint.slice(0, 4)}…${it.mint.slice(-4)}`;

export function HeroExperience({ copy }: { copy: HeroCopy }) {
  const frameRef = useRef<HTMLElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<CoreApi | null>(null);
  // The scene boots later than the fetch may land; it reads the latest sweep from here.
  const radarRef = useRef<Radar | null>(null);
  const [radar, setRadar] = useState<Radar | null>(null);
  const [flag, setFlag] = useState<string>("");
  const [scan, setScan] = useState<ScanState>({ status: "idle" });
  const [q, setQ] = useState("");

  // Real data for the radar: the latest Rug Radar sweep (CDN-cached, ~30 min).
  useEffect(() => {
    let alive = true;
    fetch("/api/radar")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Radar | null) => {
        if (!alive || !d || !Array.isArray(d.caught)) return;
        radarRef.current = d;
        setRadar(d);
        apiRef.current?.setSweep(d.caught);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  async function runScan(raw: string) {
    const query = raw.trim();
    if (!query || scan.status === "scanning") return;
    setQ(query === CONTRACT_ADDRESS ? "$GL1TCH" : query);
    setScan({ status: "scanning", q: query });
    apiRef.current?.scanning();
    try {
      let mint = query, chain = "";
      if (!isAddress(query)) {
        const s = await fetch(`/api/scan?q=${encodeURIComponent(query.replace(/^\$/, ""))}`).then((r) => r.json());
        const top = s?.candidates?.[0];
        if (!top) throw new Error("no match");
        mint = top.address;
        chain = top.chain;
      }
      const res = await fetch(`/api/scan?mint=${encodeURIComponent(mint)}${chain ? `&chain=${chain}` : ""}`);
      const r = await res.json();
      if (!res.ok || r.error) throw new Error(r.error || "scan failed");
      const kind = verdictKind(String(r.verdict));
      setScan({ status: "done", result: { name: label(r), verdict: r.verdict, score: r.score, href: `/scan/${r.chain}-${r.mint}`, kind } });
      apiRef.current?.react(kind);
      unlock("scan");
      sfx(kind === "ok" ? "clean" : kind === "warn" ? "warn" : "rug");
    } catch {
      setScan({ status: "error", q: query });
      apiRef.current?.react("error");
    }
  }

  const [head, ...rest] = copy.headline.split(" ");
  const tail = rest.join(" ");

  return (
    <section className={styles.hero} id="hero" ref={frameRef}>
      <VoxelTrail targetRef={frameRef} />
      <div className={`container ${styles.grid}`}>
        <div className={styles.content}>
          <div className={styles.liveRow}>
            <span className={styles.eyebrow}><i aria-hidden="true" />{copy.eyebrow}</span>
            <HeroPriceChip />
          </div>
          <h1 className={styles.headline}>
            {head} {tail.split(" ").length > 1 ? <>{tail.split(" ")[0]} <span className="hl">{tail.split(" ").slice(1).join(" ")}</span></> : <span className="hl">{tail}</span>}
          </h1>
          <p className={styles.subhead}>{copy.subhead}</p>

          <form
            className={styles.scanbox}
            onSubmit={(e) => { e.preventDefault(); void runScan(q); }}
            role="search"
            aria-label="Scan a token"
          >
            <label htmlFor="hero-scan" className="sr-only">Token name or contract address</label>
            <input
              id="hero-scan"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="token name or contract, any chain"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className={styles.scanBtn} disabled={scan.status === "scanning"}>
              {scan.status === "scanning" ? "Scanning…" : "Scan"}
            </button>
          </form>
          <div className={styles.tries}>
            <span>try:</span>
            {TRIES.map((t) => (
              <button key={t.label} type="button" onClick={() => void runScan(t.q)}>{t.label}</button>
            ))}
          </div>
          <p className={styles.result} aria-live="polite">
            {scan.status === "scanning" && <>Reading the chain…</>}
            {scan.status === "done" && (
              <>
                <b data-kind={scan.result.kind}>{scan.result.verdict} {scan.result.score}/100</b>
                <span> · {scan.result.name} · </span>
                <Link href={scan.result.href}>Full report →</Link>
              </>
            )}
            {scan.status === "error" && (
              <>Couldn&apos;t read that one here. <Link href={`/scan?q=${encodeURIComponent(scan.q)}`}>Open the full scanner →</Link></>
            )}
          </p>
          <p className={styles.microcopy}>{copy.microcopy}</p>
        </div>

        <SceneStage<CoreApi>
          load={() => import("@/lib/scenes/signalCore")}
          engine={{ background: "#22134a", bloom: [0.72, 0.55, 1.0], backdrop: 1.5 }}
          ui={() => ({ bubble: bubbleRef.current, frame: frameRef.current, onPing: () => sfx("ping"), onFlag: (it: RadarItem | null) => it && setFlag(`⚠ ${label(it)} · ${String(it.verdict).toLowerCase()} ${it.score}/100`) })}
          poster="/brand/glitchy-v3/glitchy-chrome-hero.png"
          posterAlt=""
          hero
          className={styles.stage}
          label="Signal Core: a radar sweeping the latest Rug Radar tokens, with Glitchy beside it"
          onReady={(api) => {
            apiRef.current = api;
            if (radarRef.current) api.setSweep(radarRef.current.caught);
            api.greet();
          }}
        >
          <div className={styles.bubble} ref={bubbleRef} hidden />
          <div className={styles.hudTop}>Signal Core</div>
          <div className={styles.hud}>
            {radar ? (
              <>
                <div className={styles.k}><span>Last Rug Radar sweep</span><b>{ago(radar.updatedAt) || "latest"}</b></div>
                <div className={styles.k}><span>Scanned</span><b>{radar.scanned}</b></div>
                <div className={styles.k}><span>Flagged</span><b className={styles.bad}>{radar.flagged}</b></div>
              </>
            ) : (
              <div className={styles.k}><span>Rug Radar</span><b><span className="skeleton" aria-hidden="true" /></b></div>
            )}
            {flag && <div className={styles.flag}>{flag}</div>}
          </div>
        </SceneStage>
      </div>
    </section>
  );
}
