"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MobileBottomNav.module.css";

const ITEMS = [
  { href: "/scan", label: "Scan", icon: "🔍" },
  { href: "/radar", label: "Radar", icon: "📡" },
  { href: "/yield", label: "Yield", icon: "📈" },
  { href: "/quantum-core", label: "Quantum", icon: "⚛️" },
  { href: "/links", label: "Menu", icon: "☰" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className={styles.nav} aria-label="Mobile quick navigation">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${active ? styles.active : ""}`}
          >
            <span className={styles.icon} aria-hidden="true">
              {item.icon}
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

