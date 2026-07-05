import { signalLeaderboard } from "@/lib/signal-graph";
import styles from "./SignalLeaderboard.module.css";

const BADGE_ICON: Record<string, string> = {
  "Beacon Prime": "🛰️",
  Beacon: "📡",
  Amplifier: "🔊",
  Signal: "📶",
  Dormant: "⚫",
};

/**
 * Proof-of-Signal leaderboard — reputation earned by producing real signal (verified
 * sustained holding + community brought in). Server component; hidden when the graph is
 * empty or unreachable so it never renders a broken/empty shell.
 */
export async function SignalLeaderboard() {
  const rows = await signalLeaderboard(10);
  if (!rows.length) return null;

  return (
    <section className={styles.wrap} aria-label="Proof-of-Signal leaderboard">
      <div className={styles.head}>
        <span className="t-eyebrow">Proof-of-Signal</span>
        <h2 className={styles.title}>Signal Leaderboard</h2>
        <p className={styles.sub}>
          Reputation you earn by producing real signal — verified <em>sustained</em> holding plus the
          community you bring in. Status only, no paid rewards. Anti-gamed by a 7-day balance check.
        </p>
      </div>
      <ol className={styles.list}>
        {rows.map((r, i) => (
          <li key={r.userId} className={styles.row}>
            <span className={styles.rank}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
            <span className={styles.badge}>{BADGE_ICON[r.badge] ?? "•"}</span>
            <span className={styles.name}>{r.username}</span>
            <span className={styles.meta}>
              {r.badge}
              {r.confirmed ? "" : " · provisional"}
            </span>
            <span className={styles.xp}>{r.xp.toLocaleString("en-US")} XP</span>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        Earn your place: verify your holding and infect a friend in the Telegram — <code>/verify</code> ·{" "}
        <code>/rep</code>
      </p>
    </section>
  );
}
