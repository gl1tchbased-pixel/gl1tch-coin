/** Decides whether a message deserves an answer. Pure, so the "don't be a noisy bot" rules are testable. */

export type Trigger = "private" | "mention" | "reply" | "admin" | "ambient" | "chat";

export interface MessageFacts {
  text: string;
  chatType: string;
  officialGroup: boolean;
  fromAdmin: boolean;
  fromBot: boolean;
  mentionsBot: boolean;
  repliesToBot: boolean;
  repliesToOther: boolean;
  hasAddress: boolean;
}

const QUESTION_EN = /^(what|whats|what's|how|why|when|where|who|which|is|are|can|could|does|do|did|should|will|would|any)\b/i;
const QUESTION_TR =
  /(^|\s)(ne|neden|niye|niçin|nasıl|nedir|nerede|nereden|nereye|hangi|kim|kaç|kimin|m[ıiuü]|m[ıiuü]s[ıiuü]n|m[ıiuü]y[ıiuü]m|m[ıiuü]d[ıiuü]r|m[ıiuü]yd[ıiuü])(\s|$|[.,!])/i;

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (t.length < 6) return false;
  return t.includes("?") || QUESTION_EN.test(t) || QUESTION_TR.test(t);
}

/**
 * Being addressed always gets an answer. In our own groups the bot takes part: it answers questions and may join in
 * on anything else, unless two people are talking to each other. In other people's groups it's a guest, so it speaks
 * only when spoken to.
 */
export function classify(m: MessageFacts): Trigger | null {
  const text = m.text.trim();
  if (!text || text.startsWith("/") || m.fromBot) return null;
  if (m.chatType === "private") {
    // A bare address is the auto-scanner's job.
    return m.hasAddress && !looksLikeQuestion(text) ? null : "private";
  }
  if (m.chatType !== "group" && m.chatType !== "supergroup") return null;
  if (m.mentionsBot) return "mention";
  if (m.repliesToBot) return "reply";
  if (!m.officialGroup || m.repliesToOther || m.hasAddress) return null;
  if (!looksLikeQuestion(text)) return "chat";
  return m.fromAdmin ? "admin" : "ambient";
}
