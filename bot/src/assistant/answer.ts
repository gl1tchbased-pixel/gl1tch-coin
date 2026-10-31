import { OFFICIAL } from "../content.js";
import { getScanData, type ScanData } from "../scan.js";
import { KNOWLEDGE, SKIP_RULE, SYSTEM_RULES, liveFacts } from "./knowledge.js";
import { chat, type ChatMessage } from "./llm.js";
import { allowedAddresses, isSkip, sanitizeReply } from "./sanitize.js";

const MAX_TOOL_ROUNDS = 2;
const MAX_INPUT = 1200;
const MAX_QUOTE = 500;

const SCAN_TOOL = {
  type: "function",
  function: {
    name: "scan_token",
    description: "Run the GL1TCH safety scanner on one token, by contract address or name. Read-only.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Contract address, or the token's name or ticker" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

function scanSummary(d: ScanData & { candidates?: unknown[] }): string {
  return JSON.stringify({
    name: d.name,
    symbol: d.symbol,
    chain: d.chain,
    address: d.mint,
    verdict: d.verdict,
    score: d.score,
    confidence: d.confidence,
    summary: d.bottomLine,
    checks: d.checks.map((c) => `${c.status}: ${c.label} = ${c.value}`),
    risks: d.risks?.map((r) => r.name),
    priceUsd: d.meta.priceUsd,
    liquidityUsd: d.meta.liquidityUsd,
    marketCapUsd: d.meta.marketCap,
    otherTokensWithThisName: Math.max(0, (d.candidates?.length ?? 1) - 1),
    report: `${OFFICIAL.SITE}/scan/${encodeURIComponent(d.chain)}-${encodeURIComponent(d.mint)}`,
  });
}

async function runScanTool(rawArgs: string): Promise<string> {
  try {
    const { query } = JSON.parse(rawArgs) as { query?: unknown };
    if (typeof query !== "string" || !query.trim()) return JSON.stringify({ error: "no query" });
    const d = await getScanData(query.slice(0, 100), undefined, "bot");
    return d ? scanSummary(d) : JSON.stringify({ error: "nothing found, ask for the contract address" });
  } catch {
    return JSON.stringify({ error: "scanner unavailable right now" });
  }
}

export interface Exchange {
  question: string;
  answer: string;
}

export interface AnswerInput {
  question: string;
  quoted?: string;
  history?: Exchange[];
  maySkip: boolean;
}

/** Returns the text to send, or null when the model passed or the LLM is unavailable. */
export async function answer(i: AnswerInput): Promise<string | null> {
  const system = [SYSTEM_RULES, `PROJECT FACTS\n${KNOWLEDGE}`, await liveFacts(), i.maySkip ? SKIP_RULE : ""].filter(Boolean).join("\n\n");
  const question = i.question.slice(0, MAX_INPUT);
  const quoted = i.quoted?.slice(0, MAX_QUOTE);
  const user = quoted ? `They are replying to this message:\n"""${quoted}"""\n\nTheir message:\n"""${question}"""` : `"""${question}"""`;

  const messages: ChatMessage[] = [{ role: "system", content: system }];
  for (const h of i.history ?? []) {
    messages.push({ role: "user", content: `"""${h.question}"""` }, { role: "assistant", content: h.answer });
  }
  messages.push({ role: "user", content: user });

  const toolOutputs: string[] = [];
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // The last round goes without tools, which forces a written answer.
    const reply = await chat(messages, round < MAX_TOOL_ROUNDS ? [SCAN_TOOL] : undefined);
    if (!reply) return null;
    if (!reply.toolCalls.length) {
      if (!reply.content || isSkip(reply.content)) return null;
      return sanitizeReply(reply.content, allowedAddresses(question, quoted ?? "", ...toolOutputs)) || null;
    }
    messages.push({ role: "assistant", content: reply.content || null, tool_calls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      const output = call.function.name === "scan_token" ? await runScanTool(call.function.arguments) : JSON.stringify({ error: "unknown tool" });
      toolOutputs.push(output);
      messages.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }
  return null;
}
