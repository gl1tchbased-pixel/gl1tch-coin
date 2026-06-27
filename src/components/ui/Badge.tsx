import styles from "./Badge.module.css";

type Variant = "signal" | "glitch" | "neutral";

interface BadgeProps {
  id?: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  id,
  variant = "signal",
  className = "",
  children,
}: BadgeProps) {
  const cls = [styles.badge, styles[variant], className]
    .filter(Boolean)
    .join(" ");
  return (
    <span id={id} className={cls}>
      {children}
    </span>
  );
}
