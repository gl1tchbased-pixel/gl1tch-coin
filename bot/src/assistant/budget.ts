/** Keeps the bot from flooding a chat or burning the free LLM quota. In memory: a restart resets it, which is fine. */

const DAY_MS = 86_400_000;
export const AMBIENT_GAP_MS = 20_000;
export const USER_PER_DAY = 30;
export const TOTAL_PER_DAY = 500;

export class Budget {
  private day = 0;
  private total = 0;
  private perUser = new Map<number, number>();
  private lastAmbient = new Map<number, number>();

  /** Reserves one answer. `ambient` means nobody asked the bot directly, so the per-chat gap applies. */
  take(o: { chatId: number; userId: number; exempt: boolean; ambient: boolean; now?: number }): boolean {
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
    if (o.ambient && now - (this.lastAmbient.get(o.chatId) ?? -Infinity) < AMBIENT_GAP_MS) return false;
    if (o.ambient) this.lastAmbient.set(o.chatId, now);
    this.perUser.set(o.userId, used + 1);
    this.total++;
    return true;
  }
}
