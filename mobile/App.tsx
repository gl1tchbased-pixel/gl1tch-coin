import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useShareIntent } from "expo-share-intent";
import { extractAddress, scan, STATUS_COLOR, STATUS_ICON, VERDICT_COLOR, type ScanResult } from "./src/scan";
import { connectWallet, holdings, type Connected, type Holding } from "./src/wallet";
import { addToHistory, ago, loadHistory, saveHistory, type HistoryItem } from "./src/history";
import { QrScanner } from "./src/QrScanner";
import * as Notifications from "expo-notifications";
import { checkWatchlist, ensureNotifyPermission, loadWatchlist, saveWatchlist, syncSchedule } from "./src/watch";
import { addWatch, removeWatch, WATCH_CAP, type WatchItem } from "./src/watch-rules";

const C = { bg: "#0B0A14", card: "#15132A", border: "#2A2650", text: "#F2F0FF", muted: "#9A95C0", signal: "#7CFF6B" };
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

type Quick = { verdict: ScanResult["verdict"]; score: number; symbol: string | null } | { error: string };

export default function App() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Connected | null>(null);
  const [held, setHeld] = useState<Holding[] | null>(null);
  const [quick, setQuick] = useState<Record<string, Quick>>({});
  const [walletBusy, setWalletBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [watchBusy, setWatchBusy] = useState(false);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const handledTap = useRef<string | null>(null);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const lastTap = Notifications.useLastNotificationResponse();

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  // The background check updates stored baselines, so re-read the watchlist whenever the app comes back.
  const refreshWatch = useCallback(() => {
    loadWatchlist().then(setWatchlist);
  }, []);
  useEffect(() => {
    // Re-arm the background check at launch too (an app update or reinstall can drop the OS registration).
    loadWatchlist().then((list) => {
      setWatchlist(list);
      syncSchedule(list);
    });
    const sub = AppState.addEventListener("change", (state) => state === "active" && refreshWatch());
    return () => sub.remove();
  }, [refreshWatch]);

  const run = useCallback(async (raw: string) => {
    const address = extractAddress(raw);
    setError(null);
    setResult(null);
    if (!address) {
      setError("No token address found. Paste a contract address or a link that contains one.");
      return;
    }
    setInput(address);
    setBusy(true);
    try {
      const r = await scan(address);
      setResult(r);
      setHistory((h) => {
        const next = addToHistory(h, r);
        saveHistory(next);
        return next;
      });
      scroll.current?.scrollTo({ y: 0, animated: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  // A link or address shared from any app (Pump.fun, X, Telegram, a browser) is scanned on arrival.
  useEffect(() => {
    if (!hasShareIntent) return;
    run(shareIntent.text || shareIntent.webUrl || "");
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, run]);

  // Tapping a Watchtower alert opens the app on a fresh scan of that token.
  useEffect(() => {
    if (!lastTap || lastTap.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastTap.notification.request.identifier;
    if (handledTap.current === id) return;
    handledTap.current = id;
    const mint = lastTap.notification.request.content.data?.mint;
    if (typeof mint === "string") run(mint);
  }, [lastTap, run]);

  const isWatched = (r: ScanResult) => watchlist.some((w) => w.chain === r.chain && w.mint === r.mint);

  const stopWatch = async (chain: string, mint: string) => {
    setWatchMsg(null);
    const next = removeWatch(await loadWatchlist(), chain, mint);
    await saveWatchlist(next);
    setWatchlist(next);
    await syncSchedule(next);
  };

  const toggleWatch = async (r: ScanResult) => {
    if (isWatched(r)) return stopWatch(r.chain, r.mint);
    setWatchMsg(null);
    const out = addWatch(await loadWatchlist(), r);
    if (out.full) {
      setWatchMsg(`You're watching ${WATCH_CAP} tokens, the limit. Stop one to make room.`);
      return;
    }
    await saveWatchlist(out.list);
    setWatchlist(out.list);
    await syncSchedule(out.list);
    if (!(await ensureNotifyPermission())) {
      setWatchMsg("Notifications are off for GL1TCH, so alerts can't reach you. Turn them on in Android settings.");
    }
  };

  const checkNow = async () => {
    setWatchBusy(true);
    setWatchMsg(null);
    try {
      const { checked, alerts } = await checkWatchlist();
      setWatchMsg(
        alerts > 0
          ? `${alerts} of ${checked} checked got riskier: see the notification.`
          : `Checked ${checked} of ${watchlist.length}: nothing got worse.`,
      );
    } finally {
      setWatchBusy(false);
      refreshWatch();
    }
  };

  const connect = async (signIn: boolean) => {
    setWalletBusy(signIn ? "Waiting for the wallet to sign the message…" : "Waiting for the wallet…");
    setError(null);
    try {
      const w = await connectWallet(signIn);
      setWallet(w);
      setWalletBusy("Reading your tokens…");
      setHeld(await holdings(w.address));
    } catch (e) {
      setError(`Wallet: ${(e as Error).message}`);
    } finally {
      setWalletBusy(null);
    }
  };

  // Scan every held token, one at a time (the free API allows 40 scans a minute per IP).
  const scanAll = async () => {
    if (!held) return;
    for (const h of held.slice(0, 20)) {
      setWalletBusy(`Scanning ${short(h.mint)}…`);
      try {
        const r = await scan(h.mint);
        setQuick((q) => ({ ...q, [h.mint]: { verdict: r.verdict, score: r.score, symbol: r.symbol } }));
      } catch (e) {
        setQuick((q) => ({ ...q, [h.mint]: { error: (e as Error).message } }));
      }
      await new Promise((r) => setTimeout(r, 1600));
    }
    setWalletBusy(null);
  };

  if (qrOpen) {
    return (
      <QrScanner
        onClose={() => setQrOpen(false)}
        onScanned={(text) => {
          setQrOpen(false);
          run(text);
        }}
      />
    );
  }

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <Text style={s.brand}>GL1TCH</Text>
        <Text style={s.tagline}>Scan before you buy. Free, read-only, no signature.</Text>

        <View style={s.card}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Paste a token address or link"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => run(input)}
          />
          <Pressable style={[s.button, busy && s.buttonOff]} onPress={() => run(input)} disabled={busy}>
            {busy ? <ActivityIndicator color={C.bg} /> : <Text style={s.buttonText}>Scan</Text>}
          </Pressable>
          <Pressable style={s.buttonGhost} onPress={() => setQrOpen(true)} disabled={busy}>
            <Text style={s.buttonGhostText}>Scan a QR code</Text>
          </Pressable>
          <Text style={s.hint}>Tip: share a token link from any app to GL1TCH for an instant verdict.</Text>
        </View>

        {error && <Text style={s.error}>{error}</Text>}

        {result && (
          <View style={s.card}>
            <Text style={s.tokenName}>
              {result.symbol ? `$${result.symbol}` : short(result.mint)}
              <Text style={s.muted}>  {result.chain}</Text>
            </Text>
            <View style={s.verdictRow}>
              <Text style={[s.verdict, { color: VERDICT_COLOR[result.verdict] }]}>{result.verdict}</Text>
              <Text style={s.score}>
                {result.score}
                <Text style={s.muted}>/100</Text>
              </Text>
            </View>
            <Text style={s.bottomLine}>{result.bottomLine}</Text>
            {result.checks.map((c) => (
              <View key={c.key} style={s.check}>
                <Text style={[s.checkIcon, { color: STATUS_COLOR[c.status] }]}>{STATUS_ICON[c.status]}</Text>
                <View style={s.checkBody}>
                  <Text style={s.checkLabel}>
                    {c.label}
                    <Text style={s.muted}>  {c.value}</Text>
                  </Text>
                  <Text style={s.checkExplain}>{c.explain}</Text>
                </View>
              </View>
            ))}
            <Pressable onPress={() => Linking.openURL(`https://gl1tchbased.xyz/scan/${result.chain}-${result.mint}`)}>
              <Text style={s.link}>Full report on gl1tchbased.xyz →</Text>
            </Pressable>
            <Pressable style={s.buttonGhost} onPress={() => toggleWatch(result)}>
              <Text style={s.buttonGhostText}>{isWatched(result) ? "Watching ✓ · tap to stop" : "Watch this token"}</Text>
            </Pressable>
          </View>
        )}

        {(watchlist.length > 0 || watchMsg) && (
          <View style={s.card}>
            <Text style={s.section}>Watchtower</Text>
            <Text style={s.hint}>
              GL1TCH re-checks these about every hour, whenever Android allows it, and notifies you if one gets
              riskier. The list stays on this phone. If you force-stop the app, checks pause until you open it again.
            </Text>
            {watchlist.map((w) => (
              <View key={`${w.chain}:${w.mint}`} style={s.holding}>
                <Pressable style={s.watchName} onPress={() => run(w.mint)}>
                  <Text style={s.holdingMint}>
                    {w.symbol ? `$${w.symbol}` : short(w.mint)}
                    <Text style={s.muted}>  checked {ago(w.checkedAt)}</Text>
                  </Text>
                </Pressable>
                <Text style={[s.holdingVerdict, { color: VERDICT_COLOR[w.baseline.verdict] }]}>
                  {w.baseline.verdict} {w.baseline.score}
                </Text>
                <Pressable onPress={() => stopWatch(w.chain, w.mint)} hitSlop={8}>
                  <Text style={s.stop}>Stop</Text>
                </Pressable>
              </View>
            ))}
            {watchlist.length > 0 && (
              <Pressable style={[s.buttonGhost, watchBusy && s.buttonOff]} onPress={checkNow} disabled={watchBusy}>
                {watchBusy ? <ActivityIndicator color={C.signal} /> : <Text style={s.buttonGhostText}>Check now</Text>}
              </Pressable>
            )}
            {watchMsg && <Text style={s.hint}>{watchMsg}</Text>}
          </View>
        )}

        {history.length > 0 && (
          <View style={s.card}>
            <Text style={s.section}>Recent scans</Text>
            <Text style={s.hint}>Saved on this phone only. Tap to see the saved verdict, scan again for a fresh one.</Text>
            {history.map((h) => (
              <Pressable
                key={`${h.result.chain}:${h.result.mint}`}
                style={s.holding}
                onPress={() => {
                  setError(null);
                  setInput(h.result.mint);
                  setResult(h.result);
                  scroll.current?.scrollTo({ y: 0, animated: true });
                }}
              >
                <Text style={s.holdingMint}>
                  {h.result.symbol ? `$${h.result.symbol}` : short(h.result.mint)}
                  <Text style={s.muted}>  {ago(h.at)}</Text>
                </Text>
                <Text style={[s.holdingVerdict, { color: VERDICT_COLOR[h.result.verdict] }]}>
                  {h.result.verdict} {h.result.score}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={s.card}>
          <Text style={s.section}>Your wallet</Text>
          {!wallet ? (
            <>
              <Text style={s.hint}>
                Connect read-only to risk-check every token you hold. GL1TCH only reads your address; it never asks
                for a transaction signature.
              </Text>
              <Pressable style={s.buttonGhost} onPress={() => connect(false)} disabled={!!walletBusy}>
                <Text style={s.buttonGhostText}>Connect wallet (read-only)</Text>
              </Pressable>
              <Pressable style={s.buttonGhost} onPress={() => connect(true)} disabled={!!walletBusy}>
                <Text style={s.buttonGhostText}>Sign in with Solana (prove ownership)</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.hint}>
                {short(wallet.address)} {wallet.signedIn ? "· ownership verified by signed message" : "· read-only"}
              </Text>
              {held && held.length === 0 && <Text style={s.hint}>No tokens with a balance in this wallet.</Text>}
              {held && held.length > 0 && (
                <Pressable style={s.button} onPress={scanAll} disabled={!!walletBusy}>
                  <Text style={s.buttonText}>Scan all {Math.min(held.length, 20)} tokens</Text>
                </Pressable>
              )}
              {held?.slice(0, 20).map((h) => {
                const q = quick[h.mint];
                return (
                  <Pressable key={h.mint} style={s.holding} onPress={() => run(h.mint)}>
                    <Text style={s.holdingMint}>{q && "symbol" in q && q.symbol ? `$${q.symbol}` : short(h.mint)}</Text>
                    {q && "verdict" in q ? (
                      <Text style={[s.holdingVerdict, { color: VERDICT_COLOR[q.verdict] }]}>
                        {q.verdict} {q.score}
                      </Text>
                    ) : q && "error" in q ? (
                      <Text style={s.muted}>no data</Text>
                    ) : (
                      <Text style={s.muted}>tap to scan</Text>
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
          {walletBusy && <Text style={s.hint}>{walletBusy}</Text>}
        </View>

        <Text style={s.footer}>
          A verdict is a risk signal, not a guarantee, and never financial advice. Open source (MIT) ·
          gl1tchbased.xyz
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  page: { padding: 16, paddingTop: 56, gap: 14 },
  brand: { color: C.signal, fontSize: 32, fontWeight: "800", letterSpacing: 2 },
  tagline: { color: C.muted, fontSize: 14, marginTop: -8 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  input: { color: C.text, borderColor: C.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  button: { backgroundColor: C.signal, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonOff: { opacity: 0.6 },
  buttonText: { color: C.bg, fontWeight: "800", fontSize: 15 },
  buttonGhost: { borderColor: C.signal, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  buttonGhostText: { color: C.signal, fontWeight: "700" },
  hint: { color: C.muted, fontSize: 13, lineHeight: 18 },
  error: { color: "#FF4D6D", fontSize: 14 },
  tokenName: { color: C.text, fontSize: 20, fontWeight: "700" },
  muted: { color: C.muted, fontSize: 13, fontWeight: "400" },
  verdictRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  verdict: { fontSize: 24, fontWeight: "800" },
  score: { color: C.text, fontSize: 28, fontWeight: "800" },
  bottomLine: { color: C.text, fontSize: 14, lineHeight: 20 },
  check: { flexDirection: "row", gap: 10, paddingTop: 8, borderTopColor: C.border, borderTopWidth: 1 },
  checkIcon: { fontSize: 18, fontWeight: "800", width: 18, textAlign: "center" },
  checkBody: { flex: 1, gap: 2 },
  checkLabel: { color: C.text, fontSize: 14, fontWeight: "600" },
  checkExplain: { color: C.muted, fontSize: 13, lineHeight: 18 },
  link: { color: C.signal, fontWeight: "700", marginTop: 4 },
  section: { color: C.text, fontSize: 17, fontWeight: "700" },
  holding: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopColor: C.border, borderTopWidth: 1 },
  holdingMint: { color: C.text, fontSize: 14 },
  holdingVerdict: { fontSize: 13, fontWeight: "700" },
  watchName: { flex: 1 },
  stop: { color: C.muted, fontSize: 13, marginLeft: 12, textDecorationLine: "underline" },
  footer: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 24 },
});
