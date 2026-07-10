import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RandomnessConsole } from "@/components/web3/RandomnessConsole";
import { fetchRandomResult } from "@/lib/random-service";
import styles from "../random.module.css";

export const dynamic = "force-dynamic";

const SITE = "https://coin-three-mu.vercel.app";

interface Rec {
  ok?: boolean;
  status?: string;
  mode?: string;
  targetRound?: number;
  winners?: string[];
  result?: { kind: string; values: number[] };
  entrants?: string[];
}

async function load(id: string): Promise<Rec | null> {
  if (!/^[0-9a-f]{64}$/.test(id)) return null;
  const { status, body } = await fetchRandomResult(id);
  if (status !== 200) return null;
  return body as Rec;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const rec = await load(id);
  let title = "Verifiable randomness proof — GL1TCH";
  let desc = "A provably-fair result seeded by a quantum-grade drand round — verify it yourself in your browser (BLS-check the seed + re-derive the output). Non-custodial.";
  if (rec?.status === "fulfilled") {
    if (rec.mode === "allocation" && rec.winners) {
      title = `${rec.winners.length} winner${rec.winners.length === 1 ? "" : "s"} drawn provably-fair — GL1TCH`;
      desc = `A provably-fair draw over ${rec.entrants?.length ?? "?"} entrants, seeded by drand round ${rec.targetRound}. Winners: ${rec.winners.slice(0, 6).join(", ")}${rec.winners.length > 6 ? "…" : ""}. Verify it yourself — zero trust in GL1TCH.`;
    } else if (rec.result) {
      title = `Verifiable random result — GL1TCH`;
      desc = `A ${rec.result.kind} result seeded by drand round ${rec.targetRound}, provably fair and re-derivable in your browser. Zero trust required.`;
    }
  } else if (rec?.status === "pending") {
    title = "A provably-fair draw is committed — GL1TCH";
    desc = `Committed to a future drand round (${rec.targetRound}) that doesn't exist yet — nobody can bias it. Reveals shortly; verify it yourself.`;
  }
  const canonical = `/quantum-core/random/${id}`;
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: { title, description: desc, url: `${SITE}${canonical}`, type: "article" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

export default async function RandomProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{64}$/.test(id)) notFound();

  const embed = `<a href="${SITE}/quantum-core/random/${id}" target="_blank" rel="noopener">✓ Provably fair by GL1TCH — verify ↗</a>`;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Verifiable randomness · public proof</span>
        <h1 className={styles.title}>
          Don’t trust — <span className={styles.signal}>verify</span> this result.
        </h1>
        <p className={styles.lede}>
          This is a permanent, shareable proof. The result was seeded by a quantum-grade drand round
          committed <em>before</em> it existed. Anyone can BLS-verify the seed and re-derive the output
          right here, in their own browser.
        </p>
      </header>

      <section className={styles.consoleWrap}>
        <RandomnessConsole initialId={id} />
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Embed this proof</span>
        <h2 className={styles.h2}>Show your community it’s fair.</h2>
        <p className={styles.body}>Drop this badge on your site or in your announcement — it links back to this verifiable proof:</p>
        <pre className={styles.code}><code>{embed}</code></pre>
        <div className={styles.cta}>
          <Link href="/quantum-core/random" className={styles.btnPrimary}>Run your own →</Link>
          <Link href="/quantum-core" className={styles.btnGhost}>← Quantum Core</Link>
          <Link href="/token" className={styles.btnGhost}>Get an API key</Link>
        </div>
      </section>
    </main>
  );
}
