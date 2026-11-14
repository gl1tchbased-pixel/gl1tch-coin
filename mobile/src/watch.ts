// Watchtower on the phone: a watchlist kept on this device, re-checked in the background (Android WorkManager,
// about every hour when the OS allows it), with a local notification when a token gets riskier. No account,
// no push server: nothing about the watchlist leaves the phone except the public scan requests themselves,
// which are tagged as automated so they don't count as people's scans.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { scan } from "./scan";
import { baselineFrom, mergeBaseline, worsened, type WatchItem } from "./watch-rules";

export const WATCH_TASK = "gl1tch-watchtower";
const KEY = "gl1tch.watch.v1";
const CHANNEL = "watchtower";
const INTERVAL_MIN = 60;
const GAP_MS = 1500; // between re-checks: the free API allows 40 scans a minute per IP

export async function loadWatchlist(): Promise<WatchItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as WatchItem[]) : [];
    return Array.isArray(list) ? list.filter((w) => w?.mint && w.baseline?.verdict) : [];
  } catch {
    return [];
  }
}

export async function saveWatchlist(list: WatchItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // best effort
  }
}

/** Run the background re-check only while something is watched. */
export async function syncSchedule(list: WatchItem[]): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(WATCH_TASK);
    if (list.length > 0 && !registered) await BackgroundTask.registerTaskAsync(WATCH_TASK, { minimumInterval: INTERVAL_MIN });
    if (list.length === 0 && registered) await BackgroundTask.unregisterTaskAsync(WATCH_TASK);
  } catch {
    // background work unavailable (e.g. restricted by the OS): "Check now" still works
  }
}

/** Creates the channel first (Android 13 shows the prompt only once a channel exists), then asks. */
export async function ensureNotifyPermission(): Promise<boolean> {
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Watchtower alerts",
      description: "A watched token got riskier",
      importance: Notifications.AndroidImportance.HIGH,
    });
    const now = await Notifications.getPermissionsAsync();
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const name = (w: WatchItem) => (w.symbol ? `$${w.symbol}` : `${w.mint.slice(0, 4)}…${w.mint.slice(-4)}`);

async function notify(w: WatchItem, changes: string[]): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${name(w)} got riskier`,
      body: changes.join(" · "),
      data: { chain: w.chain, mint: w.mint },
    },
    trigger: { channelId: CHANNEL },
  });
}

/**
 * Re-scan every watched token, alert on what got worse, store the new baselines. Writes are merged into the
 * latest stored list, so a token added or removed meanwhile (in the app or by another run) is kept as is.
 */
export async function checkWatchlist(): Promise<{ checked: number; alerts: number }> {
  const list = await loadWatchlist();
  const updated = new Map<string, WatchItem>();
  let alerts = 0;
  for (const [i, w] of list.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
    try {
      const r = await scan(w.mint, undefined, "mobile-watch");
      const cur = baselineFrom(r);
      const changes = worsened(w.baseline, cur);
      const next: WatchItem = { ...w, symbol: r.symbol ?? w.symbol, baseline: mergeBaseline(w.baseline, cur), checkedAt: Date.now() };
      if (changes.length > 0) {
        alerts++;
        await notify(next, changes).catch(() => {});
      }
      updated.set(`${w.chain}:${w.mint}`, next);
    } catch {
      // scan failed (offline, rate limit): keep the old baseline and try again next run
    }
  }
  const latest = await loadWatchlist();
  await saveWatchlist(latest.map((w) => updated.get(`${w.chain}:${w.mint}`) ?? w));
  return { checked: updated.size, alerts };
}

// Must be defined at module load (index.ts imports this file), so Android can run it with the app closed.
TaskManager.defineTask(WATCH_TASK, async () => {
  try {
    await checkWatchlist();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Show alerts as a banner even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true, // on Android, false hides the drop-down banner
    shouldSetBadge: false,
  }),
});
