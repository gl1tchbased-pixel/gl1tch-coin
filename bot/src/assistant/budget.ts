/** Keeps the bot from flooding a chat or burning the free LLM quota. In memory: a restart resets it, which is fine. */

const DAY_MS = 86_400_000;
export const QUESTION_GAP_MS = 20_000;
export const CHAT_GAP_MS = 10 * 60_000;
export const USER_PER_DAY = 30;
export const TOTAL_PER_DAY = 500;

export class Budget {
  private day = 0;
  private total = 0;
  private perUser = new Map<number, number>();
  private lastSpoke = new Map<number, number>();

  /** Reserves one model call. `gapMs` is how long the bot must have been quiet in this chat: 0 when asked directly. */
  take(o: { chatId: number; userId: number; exempt: boolean; gapMs: number; now?: number }): boolean {
    const now = o.now ?? Date.now();
    const day = Math.floor(now / DAY_MS);
    if (day !== this.day) {
      this.day = day;
      this.total = 0;
      this.perUser.clear();
    }
    if (this.total >= TOTAL_PER_DAY) return false;
    const used = this.perUser.get(o.userId) ?? 0;
    if (!o.exempt && used >= USER_PER_DAY) return false;
    if (now - (this.lastSpoke.get(o.chatId) ?? -Infinity) < o.gapMs) return false;
    this.perUser.set(o.userId, used + 1);
    this.total++;
    return true;
  }

  /** Only actually speaking starts the gap: a message the model passed on mustn't silence the bot for the next one. */
  spoke(chatId: number, now = Date.now()): void {
    this.lastSpoke.set(chatId, now);
  }
}
