import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DECK_SIZE, playTitle, playVerdictLine } from "@/content/play";
import styles from "../../play.module.css";
import r from "./result.module.css";

// One share page per possible score; anything else is a 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return Array.from({ length: DECK_SIZE + 1 }, (_, s) => ({ score: String(s) }));
}

const parse = (s: string) => (/^\d$/.test(s) && Number(s) <= DECK_SIZE ? Number(s) : null);

export async function generateMetadata({ params }: { params: Promise<{ score: string }> }): Promise<Metadata> {
  const score = parse((await params).score);
  if (score === null) return {};
  const title = `${score}/${DECK_SIZE} on Rug or Not? — ${playTitle(score)} | GL1TCH`;
  return {
    title,
    description: `Someone scored ${score}/${DECK_SIZE} spotting rugs in GL1TCH's Rug or Not?. Eight made-up tokens, two minutes. Beat it.`,
    alternates: { canonical: `/play/r/${score}` },
    openGraph: { title, url: `/play/r/${score}` },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function PlayResultPage({ params }: { params: Promise<{ score: string }> }) {
  const score = parse((await params).score);
  if (score === null) notFound();
  return (
    <div className={styles.wrap}>
      <div className={r.card}>
        <span className={styles.eyebrow}><i aria-hidden="true" />Rug or Not? · result</span>
        <b className={r.score}>{score}<small>/{DECK_SIZE}</small></b>
        <b className={r.title}>Rank: {playTitle(score)}</b>
        <p className={r.line}>{playVerdictLine(score)}</p>
        <div className={r.btns}>
          <Link href="/play" className={r.play}>Can you beat it? Play →</Link>
          <Link href="/scan" className={r.scan}>Scan a real token</Link>
        </div>
      </div>
    </div>
  );
}
