"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SceneStage } from "@/components/three/SceneStage";
import { DECK_SIZE, playRows, playTitle, playVerdictLine, weeklyDeck, type PlayCard } from "@/content/play";
import { unlock } from "@/lib/fun/achievements";
import { sfx } from "@/lib/fun/sound";
import { OFFICIAL } from "@/lib/official";
import styles from "./RugOrNot.module.css";

interface GameApi { show: (c: PlayCard) => void; reveal: (isRug: boolean, ok: boolean, streak: number) => void; finish: (score: number) => void }

/** Rug or Not? — eight fictional tokens, read the flags, call SAFE or RUG. Keys: S, R, Enter. */
export function RugOrNot({ week }: { week: number }) {
  const deck = useMemo(() => weeklyDeck(week), [week]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState<null | { saidRug: boolean; ok: boolean }>(null);
  const [done, setDone] = useState(false);
  const caught = useRef(0);
  const api = useRef<GameApi | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const card = deck[i];
  // the scene can finish loading mid-game; it opens on whatever card is up then
  const cardRef = useRef(card);
  useEffect(() => { cardRef.current = card; }, [card]);

  const call = useCallback((saidRug: boolean) => {
    if (answer || done) return;
    const ok = saidRug === card.rug;
    const nextStreak = ok ? streak + 1 : 0;
    if (ok) {
      setScore((s) => s + 1);
      if (card.rug && ++caught.current === 3) unlock("hunter");
    }
    setStreak(nextStreak);
    setAnswer({ saidRug, ok });
    sfx(ok ? "right" : "wrong");
    api.current?.reveal(card.rug, ok, nextStreak);
    requestAnimationFrame(() => nextRef.current?.focus({ preventScroll: true }));
  }, [answer, done, card, streak]);

  const next = useCallback(() => {
    if (!answer) return;
    if (i < deck.length - 1) {
      setI(i + 1);
      setAnswer(null);
      api.current?.show(deck[i + 1]);
      return;
    }
    setDone(true);
    if (score === DECK_SIZE) unlock("perfect");
    sfx(score >= 6 ? "clean" : "warn");
    api.current?.finish(score);
  }, [answer, i, deck, score]);

  const again = () => {
    setI(0); setScore(0); setStreak(0); setAnswer(null); setDone(false);
    caught.current = 0;
    api.current?.show(deck[0]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable='true']") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "s") call(false);
      else if (k === "r") call(true);
      else if (k === "enter" && answer && !done && t?.tagName !== "BUTTON") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [call, next, answer, done]);

  const title = playTitle(score);
  const shareUrl = `${OFFICIAL.SITE_URL}/play/r/${score}`;
  const shareText = `I scored ${score}/${DECK_SIZE} on Rug or Not? — rank: ${title}. Can you read the flags?`;

  return (
    <section className={styles.game} aria-label="Rug or Not? game">
      <div className={styles.hud} aria-live="polite">
        <span>Round <b>{done ? DECK_SIZE : i + 1}</b>/{DECK_SIZE}</span>
        <span>Score <b>{score}</b></span>
        <span>Streak <b>{streak}</b></span>
        <span className={styles.week}>Deck of the week · new cards every Monday</span>
      </div>

      <div className={styles.grid}>
        <SceneStage<GameApi>
          load={() => import("@/lib/scenes/rugGame")}
          engine={{ background: "#1d1240", floor: true, bloom: [0.7, 0.5, 1.05], backdrop: 1.3 }}
          ui={() => ({ bubble: bubbleRef.current })}
          poster="/brand/glitchy-v3/glitchy-shadow-hero.png"
          hero
          className={styles.stage}
          label="Shadow Glitchy hosting Rug or Not? with a spinning token coin"
          onReady={(a) => { api.current = a; a.show(cardRef.current); }}
        >
          <div className={styles.bubble} ref={bubbleRef} hidden />
        </SceneStage>

        {!done ? (
          <div className={styles.card} data-reveal={answer ? (card.rug ? "bad" : "ok") : undefined}>
            <div className={styles.cardHead}>
              <div>
                <b className={styles.ticker}>{card.ticker}</b>
                <span className={styles.addr}>{card.addr}</span>
              </div>
              <span className={styles.fict}>fictional token</span>
            </div>
            <ul className={styles.rows}>
              {playRows(card).map((r) => (
                <li key={r.key} data-tone={answer ? r.tone : undefined}>
                  <span>{r.label}{r.note && <small>{r.note}</small>}</span>
                  <b>{r.value}</b>
                </li>
              ))}
            </ul>

            {!answer ? (
              <div className={styles.btns}>
                <button type="button" className={styles.safe} onClick={() => call(false)}>SAFE <kbd>S</kbd></button>
                <button type="button" className={styles.rug} onClick={() => call(true)}>RUG <kbd>R</kbd></button>
              </div>
            ) : (
              <div className={styles.reveal}>
                <p className={styles.verdict}>
                  <span data-ok={answer.ok ? "1" : "0"}>{answer.ok ? "Right!" : "Not quite."}</span>{" "}
                  This token is <span data-rug={card.rug ? "1" : "0"}>{card.rug ? "a RUG" : "SAFE"}</span>.
                </p>
                <p className={styles.why}>{card.lesson}</p>
                <button type="button" ref={nextRef} className={styles.next} onClick={next}>
                  {i === deck.length - 1 ? "See your result →" : "Next token →"} <kbd>Enter</kbd>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.card} data-end="1">
            <span className={styles.endKicker}>Your result</span>
            <b className={styles.endScore}>{score}<small>/{DECK_SIZE}</small></b>
            <b className={styles.endTitle}>Rank: {title}</b>
            <p className={styles.why}>{playVerdictLine(score)}</p>
            <div className={styles.endBtns}>
              <a
                className={styles.share}
                href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on X
              </a>
              <button type="button" className={styles.next} onClick={again}>Play again</button>
            </div>
            <p className={styles.real}>The real thing reads live chains the same way. <Link href="/scan">Scan a real token →</Link></p>
          </div>
        )}
      </div>
    </section>
  );
}
