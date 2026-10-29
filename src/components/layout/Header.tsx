"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { FunControls } from "@/components/fun/FunControls";
import { NAV_GROUPS, NAV_LINKS, PROJECT_NAME, CTA_LABELS } from "@/content/site";
import { OFFICIAL } from "@/lib/official";
import styles from "./Header.module.css";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Navigating closes every menu.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenGroup(null);
    setMenuOpen(false);
  }

  // Dropdowns: Escape closes and returns focus to the trigger, a click outside the nav closes.
  useEffect(() => {
    if (!openGroup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        triggerRefs.current[openGroup]?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [openGroup]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Hover opens for mouse users; a short delay keeps the panel from flickering shut.
  // A click right after a hover-open keeps it open instead of toggling it shut.
  const hoverOpened = useRef<string | null>(null);
  const hoverOpen = (id: string) => {
    window.clearTimeout(closeTimer.current);
    if (openGroup !== id) hoverOpened.current = id;
    setOpenGroup(id);
  };
  const onTriggerClick = (id: string) => {
    if (hoverOpened.current === id) {
      hoverOpened.current = null;
      setOpenGroup(id);
      return;
    }
    setOpenGroup((o) => (o === id ? null : id));
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      hoverOpened.current = null;
      setOpenGroup(null);
    }, 160);
  };

  return (
    <header className={[styles.header, scrolled ? styles.solid : ""].join(" ")}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label={`${PROJECT_NAME} home`}>
          <span className={styles.logo} data-egg="logo">
            <Image
              src="/brand/gl1tch-logo-256.png"
              alt=""
              width={30}
              height={30}
              priority
            />
          </span>
          <span className={styles.wordmark}>{PROJECT_NAME}</span>
          <span className={styles.liveDot} aria-hidden="true" />
        </Link>

        <nav className={styles.nav} aria-label="Primary" ref={navRef}>
          {NAV_GROUPS.map((g, gi) => {
            const open = openGroup === g.id;
            const groupActive = g.items.some((p) => isActive(p.href));
            return (
              <div
                key={g.id}
                className={styles.products}
                onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen(g.id)}
                onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
              >
                <button
                  ref={(el) => {
                    triggerRefs.current[g.id] = el;
                  }}
                  type="button"
                  className={[styles.navLink, styles.trigger, groupActive ? styles.active : ""].join(" ")}
                  aria-expanded={open}
                  aria-controls={`${g.id}-menu`}
                  onClick={() => onTriggerClick(g.id)}
                >
                  {g.label}
                  <span className={styles.caret} aria-hidden="true" />
                </button>
                <div
                  id={`${g.id}-menu`}
                  className={[styles.panel, gi >= 2 ? styles.panelEnd : ""].join(" ")}
                  data-open={open ? "1" : "0"}
                  hidden={!open}
                >
                  {g.items.map((p) => (
                    <Link
                      key={p.id}
                      id={p.id}
                      href={p.href}
                      className={[styles.product, isActive(p.href) ? styles.productActive : ""].join(" ")}
                      aria-current={isActive(p.href) ? "page" : undefined}
                    >
                      <span className={styles.productName}>{p.label}</span>
                      <span className={styles.productBlurb}>{p.blurb}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.id}
              id={link.id}
              href={link.href}
              className={[styles.navLink, isActive(link.href) ? styles.active : ""].join(" ")}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.cta}>
          <FunControls />
          <ConnectWallet />
          <Button id="header-cta" href={OFFICIAL.TG_URL} size="sm">
            {CTA_LABELS.primary}
          </Button>
        </div>

        <button
          className={styles.burger}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Menu">
          <button
            className={styles.close}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
          <nav className={styles.overlayNav} aria-label="Menu">
            {NAV_GROUPS.map((g) => (
              <div key={g.id} className={styles.overlaySection}>
                <span className={styles.overlayGroup}>{g.label}</span>
                <div className={styles.overlayGrid}>
                  {g.items.map((p) => (
                    <Link key={p.id} href={p.href} className={styles.overlayLink} onClick={() => setMenuOpen(false)}>
                      {p.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className={styles.overlaySection}>
              <span className={styles.overlayGroup}>GL1TCH</span>
              <div className={styles.overlayGrid}>
                {NAV_LINKS.map((link) => (
                  <Link key={link.id} href={link.href} className={styles.overlayLink} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
          <div className={styles.overlayWallet}>
            <FunControls />
            <ConnectWallet />
          </div>
          <Button href={OFFICIAL.TG_URL} size="lg" className={styles.overlayCta}>
            {CTA_LABELS.primary}
          </Button>
        </div>
      )}
    </header>
  );
}
