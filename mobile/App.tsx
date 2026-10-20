import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const scroll = useRef<ScrollView>(null);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

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
      setResult(await scan(address));
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
  footer: { color: C.muted, fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 24 },
});
