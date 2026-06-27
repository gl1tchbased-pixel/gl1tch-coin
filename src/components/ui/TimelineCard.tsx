import styles from "./TimelineCard.module.css";

type Status = "done" | "active" | "upcoming";

interface TimelineCardProps {
  id?: string;
  phase: string | number;
  title: string;
  items: string[];
  status: Status;
  className?: string;
}

export function TimelineCard({
  id,
  phase,
  title,
  items,
  status,
  className = "",
}: TimelineCardProps) {
  return (
    <div
      id={id}
      className={[styles.row, styles[status], className].filter(Boolean).join(" ")}
    >
      <div className={styles.marker} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.connector} />
      </div>
      <div className={styles.body}>
        <span className={styles.phase}>Phase {phase}</span>
        <h3 className={styles.title}>{title}</h3>
        <ul className={styles.items}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
