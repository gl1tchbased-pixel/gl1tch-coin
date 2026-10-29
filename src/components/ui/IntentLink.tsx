"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * A Link that prefetches on intent (hover, keyboard focus, touch) instead of when it scrolls into view. Use it
 * for long link lists — the footer, tables of cards — where viewport prefetching fires dozens of requests at
 * once and a click has to wait behind them. Next.js docs, "Prefetching on hover": prefetch={null} restores the
 * default once the user shows intent.
 */
export function IntentLink({ onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={(e) => {
        setActive(true);
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setActive(true);
        onTouchStart?.(e);
      }}
    />
  );
}
