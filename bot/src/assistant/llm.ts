/** Groq chat completions (OpenAI-compatible, free tier). Limits: console.groq.com/settings/limits */

const API = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"];
const TIMEOUT_MS = 25_000;

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ChatReply {
  content: string;
  toolCalls: ToolCall[];
}

export const isLlmConfigured = (): boolean => Boolean(process.env.GROQ_API_KEY);

/** Tries each model in turn. Returns null when all fail: callers decide whether silence is acceptable. */
export async function chat(messages: ChatMessage[], tools?: unknown[]): Promise<ChatReply | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  for (const model of MODELS) {
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_completion_tokens: 1500, temperature: 0.4, ...(tools ? { tools } : {}) }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!r.ok) {
        console.warn(`[assistant] ${model} answered ${r.status}`);
        continue;
      }
      const j = (await r.json()) as { choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }> };
      const m = j.choices?.[0]?.message;
      const content = (m?.content ?? "").trim();
      const toolCalls = m?.tool_calls ?? [];
      if (content || toolCalls.length) return { content, toolCalls };
    } catch (e) {
      console.warn(`[assistant] ${model} failed: ${(e as Error).message}`);
    }
  }
  return null;
}
