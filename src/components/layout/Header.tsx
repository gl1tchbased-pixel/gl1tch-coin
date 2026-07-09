"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ConnectWallet } from "@/components/web3/ConnectWallet";
import { NAV_LINKS, PROJECT_NAME, CTA_LABELS } from "@/content/site";
import { OFFICIAL } from "@/lib/official";
import styles from "./Header.module.css";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          {NAV_LINKS.map((link) => {
            const featured = "featured" in link && link.featured;
            return (
              <Link
                key={link.id}
                id={link.id}
                href={link.href}
                className={featured ? `${styles.navLink} ${styles.navFeatured}` : styles.navLink}
              >
                {link.label}
                {featured && <span className={styles.navBadge}>NEW</span>}
              </Link>
            );
          })}
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
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <button
            className={styles.close}
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
          <nav className={styles.overlayNav}>
            {NAV_LINKS.map((link) => {
              const featured = "featured" in link && link.featured;
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  className={featured ? `${styles.overlayLink} ${styles.overlayFeatured}` : styles.overlayLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                  {featured && <span className={styles.navBadge}>NEW</span>}
                </Link>
              );
            })}
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
