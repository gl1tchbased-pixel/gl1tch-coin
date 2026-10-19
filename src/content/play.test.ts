import { describe, expect, it } from "vitest";
import { PLAY_DECK, DECK_SIZE, isRugByRules, playRows, weeklyDeck, playTitle, deckWeek } from "./play";

describe("Rug or Not? deck", () => {
  it("has 16–24 cards with unique tickers and ids", () => {
    expect(PLAY_DECK.length).toBeGreaterThanOrEqual(16);
    expect(PLAY_DECK.length).toBeLessThanOrEqual(24);
    expect(new Set(PLAY_DECK.map((c) => c.ticker)).size).toBe(PLAY_DECK.length);
    expect(new Set(PLAY_DECK.map((c) => c.id)).size).toBe(PLAY_DECK.length);
  });

  it("every answer follows the rules the game teaches", () => {
    for (const c of PLAY_DECK) expect([c.ticker, isRugByRules(c)]).toEqual([c.ticker, c.rug]);
  });

  it("a rug always shows a red row and a safe card never does", () => {
    for (const c of PLAY_DECK) {
      const bad = playRows(c).some((r) => r.tone === "bad");
      expect([c.ticker, bad]).toEqual([c.ticker, c.rug]);
    }
  });

  it("uses no real ticker and no resolvable address", () => {
    const real = ["$GL1TCH", "$BONK", "$PEPE", "$WIF", "$SOL", "$USDC", "$POPCAT", "$BOME", "$MEW", "$TRUMP"];
    for (const c of PLAY_DECK) {
      expect(real).not.toContain(c.ticker);
      expect(c.addr).toMatch(/^[A-Za-z0-9]{4}…[A-Za-z0-9]{4}$/);
    }
  });

  it("keeps the pool trick card: a high top holder that is the pool is SAFE", () => {
    const traps = PLAY_DECK.filter((c) => c.topIsPool);
    expect(traps.length).toBeGreaterThan(0);
    for (const t of traps) { expect(t.topHolderPct).toBeGreaterThan(30); expect(t.rug).toBe(false); }
  });

  it("each week deals 8 distinct cards: one trap, four rugs, three safe", () => {
    for (let w = -2; w < 120; w++) {
      const d = weeklyDeck(w);
      expect(d).toHaveLength(DECK_SIZE);
      expect(new Set(d.map((c) => c.id)).size).toBe(DECK_SIZE);
      expect(d.filter((c) => c.topIsPool)).toHaveLength(1);
      expect(d.filter((c) => c.rug)).toHaveLength(4);
      expect(d.findIndex((c) => c.topIsPool)).toBeGreaterThanOrEqual(2);
    }
  });

  it("is the same all week and rotates between weeks", () => {
    const t = Date.UTC(2026, 10, 3, 12);
    expect(deckWeek(t)).toBe(deckWeek(t + 2 * 24 * 3600 * 1000));
    const ids = (w: number) => weeklyDeck(w).map((c) => c.id).join();
    const distinct = new Set(Array.from({ length: 8 }, (_, w) => ids(w)));
    expect(distinct.size).toBeGreaterThan(5);
  });

  it("titles follow the score bands", () => {
    expect(playTitle(8)).toBe("Ghost Node detective");
    expect(playTitle(7)).toBe("Core Node");
    expect(playTitle(6)).toBe("Core Node");
    expect(playTitle(5)).toBe("Signal Bearer");
    expect(playTitle(4)).toBe("Signal Bearer");
    expect(playTitle(3)).toBe("Observer");
    expect(playTitle(0)).toBe("Observer");
  });
});
