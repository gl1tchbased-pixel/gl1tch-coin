import Link from "next/link";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  id?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  pulse?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

type ButtonProps = BaseProps &
  (
    | ({ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ href?: undefined } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  );

export function Button({
  id,
  variant = "primary",
  size = "md",
  className = "",
  pulse = false,
  loading = false,
  children,
  href,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.button,
    styles[variant],
    styles[size],
    pulse && variant === "primary" ? styles.pulse : "",
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    const isExternal = href.startsWith("http");
    if (isExternal) {
      return (
        <a
          id={id}
          className={cls}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        id={id}
        className={cls}
        href={href}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      id={id}
      className={cls}
      disabled={loading || (rest as React.ButtonHTMLAttributes<HTMLButtonElement>).disabled}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
