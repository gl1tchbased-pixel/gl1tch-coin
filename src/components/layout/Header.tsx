"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { NAV_LINKS, NAV_PRODUCTS, PROJECT_NAME, CTA_LABELS } from "@/content/site";
import { OFFICIAL } from "@/lib/official";
import styles from "./Header.module.css";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const productsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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

  // Navigating closes both menus.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setProductsOpen(false);
    setMenuOpen(false);
  }

  // Products menu: Escape closes and returns focus, a click outside closes.
  useEffect(() => {
    if (!productsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProductsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!productsRef.current?.contains(e.target as Node)) setProductsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [productsOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const productActive = NAV_PRODUCTS.some((p) => isActive(p.href));

  // Hover opens for mouse users; a short delay keeps the panel from flickering shut.
  // A click right after a hover-open keeps it open instead of toggling it shut.
  const hoverOpened = useRef(false);
  const hoverOpen = () => {
    window.clearTimeout(closeTimer.current);
    if (!productsOpen) hoverOpened.current = true;
    setProductsOpen(true);
  };
  const onTriggerClick = () => {
    if (hoverOpened.current) {
      hoverOpened.current = false;
      setProductsOpen(true);
      return;
    }
    setProductsOpen((o) => !o);
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      hoverOpened.current = false;
      setProductsOpen(false);
    }, 160);
  };

  return (
    <header className={[styles.header, scrolled ? styles.solid : ""].join(" ")}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label={`${PROJECT_NAME} home`}>
          <span className={styles.logo}>
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

        <nav className={styles.nav} aria-label="Primary">
          <div
            className={styles.products}
            ref={productsRef}
            onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen()}
            onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
          >
            <button
              ref={triggerRef}
              type="button"
              className={[styles.navLink, styles.trigger, productActive ? styles.active : ""].join(" ")}
              aria-expanded={productsOpen}
              aria-controls="products-menu"
              onClick={onTriggerClick}
            >
              Products
              <span className={styles.caret} aria-hidden="true" />
            </button>
            <div
              id="products-menu"
              className={styles.panel}
              data-open={productsOpen ? "1" : "0"}
              hidden={!productsOpen}
            >
              {NAV_PRODUCTS.map((p) => (
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
            <span className={styles.overlayGroup}>Products</span>
            {NAV_PRODUCTS.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className={styles.overlayLink}
                onClick={() => setMenuOpen(false)}
              >
                {p.label}
              </Link>
            ))}
            <span className={styles.overlayGroup}>GL1TCH</span>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={styles.overlayLink}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.overlayWallet}>
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
