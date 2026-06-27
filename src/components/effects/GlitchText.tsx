import styles from "./GlitchText.module.css";

interface GlitchTextProps {
  text: string;
  trigger?: "load" | "hover";
  className?: string;
  as?: "span" | "h1" | "h2";
}

export function GlitchText({
  text,
  trigger = "hover",
  className = "",
  as = "span",
}: GlitchTextProps) {
  const Tag = as;
  return (
    <Tag
      className={[
        styles.glitch,
        trigger === "load" ? styles.onLoad : styles.onHover,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-text={text}
    >
      {text}
    </Tag>
  );
}
