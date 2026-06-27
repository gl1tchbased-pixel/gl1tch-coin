import Link from "next/link";
import { PROJECT_NAME, SOCIAL_LINKS, FOOTER_LINKS } from "@/content/site";
import { DISCLAIMER } from "@/lib/official";
import { XIcon, TelegramIcon, InstagramIcon, RedditIcon, GlobeIcon } from "@/components/icons/SocialIcons";
import styles from "./Footer.module.css";

const ICONS: Record<string, React.FC<{ size?: number }>> = {
  "social-x": XIcon,
  "social-tg": TelegramIcon,
  "social-ig": InstagramIcon,
  "social-rd": RedditIcon,
  "social-links": GlobeIcon,
};

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.top}>
          <span className={styles.wordmark}>{PROJECT_NAME}</span>
          <nav className={styles.social} aria-label="Social">
            {SOCIAL_LINKS.map((link) => {
              const external = link.href.startsWith("http");
              const Icon = ICONS[link.id];
              const inner = (
                <>
                  {Icon && <Icon size={16} />}
                  <span>{link.label}</span>
                </>
              );
              return external ? (
                <a
                  key={link.id}
                  id={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  {inner}
                </a>
              ) : (
                <Link key={link.id} id={link.id} href={link.href} className={styles.socialLink}>
                  {inner}
                </Link>
              );
            })}
          </nav>
        </div>
        <nav className={styles.resources} aria-label="Resources">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.id} id={link.id} href={link.href} className={styles.resourceLink}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className={styles.disclaimer}>
          ⚠ Official updates only through verified channels. {DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}
