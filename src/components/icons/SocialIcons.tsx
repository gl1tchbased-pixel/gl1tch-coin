/** Monochrome brand glyphs (inherit currentColor for premium tinting). */

interface IconProps {
  size?: number;
  className?: string;
}

export function XIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TelegramIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

export function InstagramIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function RedditIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12.07c0-1.18-.96-2.14-2.14-2.14-.58 0-1.11.24-1.49.62-1.47-1.05-3.5-1.72-5.75-1.78l.97-4.59 3.17.67c.04.83.72 1.5 1.55 1.5.86 0 1.56-.7 1.56-1.55s-.7-1.55-1.56-1.55c-.6 0-1.13.35-1.39.85l-3.55-.75a.24.24 0 0 0-.28.18l-1.08 5.1c-2.27.04-4.33.72-5.81 1.77a2.14 2.14 0 0 0-1.49-.62A2.14 2.14 0 0 0 2 12.07c0 .87.52 1.62 1.26 1.96-.04.22-.06.45-.06.68 0 3.46 4.03 6.26 9 6.26s9-2.8 9-6.26c0-.23-.02-.46-.06-.68.74-.34 1.26-1.09 1.26-1.96zM7 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm10 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-1.74 2.96c-.93.93-2.7 1.01-3.26 1.01s-2.33-.08-3.26-1.01a.36.36 0 0 1 0-.5.36.36 0 0 1 .5 0c.59.59 1.85.8 2.76.8.91 0 2.17-.21 2.76-.8.14-.14.36-.14.5 0 .14.14.14.36 0 .5z" />
    </svg>
  );
}

export function GlobeIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}
