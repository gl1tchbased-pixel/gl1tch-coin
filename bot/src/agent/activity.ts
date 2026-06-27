/** Tracks aggregate, privacy-safe Telegram activity for the current day.
 *  Only counts — never stores message content. Rolls over at local midnight
 *  in the configured timezone. */

export interface DailyStats {
  date: string; // YYYY-MM-DD in the tracker's timezone
  messages: number;
  uniquePosters: number;
  newMembers: number;
}

/** YYYY-MM-DD for a timestamp in a given IANA timezone. */
export function dayKey(at: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
}

export class ActivityTracker {
  private timezone: string;
  private now: () => number;
  private date: string;
  private messages = 0;
  private posters = new Set<number>();
  private newMembers = 0;

  constructor(timezone = "Europe/Istanbul", now: () => number = Date.now) {
    this.timezone = timezone;
    this.now = now;
    this.date = dayKey(this.now(), this.timezone);
  }

  private rollover(): void {
    const today = dayKey(this.now(), this.timezone);
    if (today !== this.date) {
      this.date = today;
      this.messages = 0;
      this.posters = new Set();
      this.newMembers = 0;
    }
  }

  recordMessage(userId?: number): void {
    this.rollover();
    this.messages += 1;
    if (typeof userId === "number") this.posters.add(userId);
  }

  recordJoin(): void {
    this.rollover();
    this.newMembers += 1;
  }

  snapshot(): DailyStats {
    this.rollover();
    return {
      date: this.date,
      messages: this.messages,
      uniquePosters: this.posters.size,
      newMembers: this.newMembers,
    };
  }
}
