// Recent scans, kept on the phone only (AsyncStorage). Lets a user re-open a verdict without a network call
// and see at a glance which tokens they already checked. Nothing here is sent anywhere.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ScanResult } from "./scan";

const KEY = "gl1tch.history.v1";
const MAX = 20;

export interface HistoryItem {
  result: ScanResult;
  at: number; // ms since epoch, when the scan finished
}

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    return Array.isArray(list) ? list.filter((h) => h?.result?.mint && h.result.verdict) : [];
  } catch {
    return []; // corrupt or unavailable storage must never block scanning
  }
}

/** Newest first, one entry per token (a re-scan replaces the old verdict). */
export function addToHistory(list: HistoryItem[], result: ScanResult, at = Date.now()): HistoryItem[] {
  const id = (r: ScanResult) => `${r.chain}:${r.mint}`;
  return [{ result, at }, ...list.filter((h) => id(h.result) !== id(result))].slice(0, MAX);
}

export async function saveHistory(list: HistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // best effort: the in-memory list still works for this session
  }
}

export function ago(at: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - at) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
