"use client";

import { useMemo, useState } from "react";
import { ArchiveCard } from "@/components/ui/ArchiveCard";
import { loreEntries, loreCategories } from "@/content/lore";
import type { LoreCategory, LoreEntry } from "@/types/content";
import styles from "./LoreArchive.module.css";

type Filter = LoreCategory | "all";

export function LoreArchive() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LoreEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: loreEntries.length };
    for (const cat of loreCategories) {
      c[cat] = loreEntries.filter((e) => e.category === cat).length;
    }
    return c;
  }, []);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loreEntries
      .filter((e) => (filter === "all" ? true : e.category === filter))
      .filter((e) =>
        q === ""
          ? true
          : (e.title + e.body + e.archiveNumber).toLowerCase().includes(q)
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [filter, query]);

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lore#${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div className={styles.controls}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search the archive…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search lore fragments"
        />
        <div className={styles.filters} role="tablist" aria-label="Filter archive">
          <button
            className={[styles.tag, filter === "all" ? styles.active : ""].join(" ")}
            onClick={() => setFilter("all")}
          >
            all <span className={styles.count}>{counts.all}</span>
          </button>
          {loreCategories.map((cat) => (
            <button
              key={cat}
              className={[styles.tag, filter === cat ? styles.active : ""].join(" ")}
              onClick={() => setFilter(cat)}
            >
              {cat} <span className={styles.count}>{counts[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      <p className={styles.result}>
        {entries.length} transmission{entries.length === 1 ? "" : "s"} found
      </p>

      {entries.length === 0 ? (
        <p className={styles.empty}>No transmissions match that signal.</p>
      ) : (
        <div className={styles.grid}>
          {entries.map((entry) => (
            <ArchiveCard
              key={entry.id}
              entry={entry}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className={styles.modal}>
            <button
              className={styles.close}
              aria-label="Close"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
            <span className={styles.mArchive}>ARCHIVE // {selected.archiveNumber}</span>
            <span className={styles.mTime}>{selected.timestamp}</span>
            <h2 className={styles.mTitle}>{selected.title}</h2>
            <p className={styles.mBody}>{selected.body}</p>
            <div className={styles.mMeta}>
              <span>{selected.category}</span>
              {selected.integrity && <span>INTEGRITY {selected.integrity}</span>}
            </div>
            <button className={styles.copy} onClick={() => copyLink(selected.id)}>
              {copied ? "Link copied ✓" : "Copy link to fragment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
