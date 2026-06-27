import styles from "./Card.module.css";

type Variant = "default" | "terminal" | "elevated" | "interactive";

interface CardProps {
  id?: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Card({
  id,
  variant = "default",
  className = "",
  children,
}: CardProps) {
  const cls = [styles.card, styles[variant], className]
    .filter(Boolean)
    .join(" ");
  return (
    <div id={id} className={cls}>
      {children}
    </div>
  );
}
