// Full-screen QR scanner. Reads a QR code (a wallet/token address, a solana: pay link or any URL with an
// address in it) and hands the text back; App.tsx extracts the address the same way as for pasted text.
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

const C = { bg: "#0B0A14", text: "#F2F0FF", muted: "#9A95C0", signal: "#7CFF6B" };

export function QrScanner({ onScanned, onClose }: { onScanned: (text: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false); // the camera fires many events per second; take the first one only

  if (!permission) return <View style={s.root} />;

  if (!permission.granted) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.title}>Camera access</Text>
        <Text style={s.text}>
          GL1TCH uses the camera only to read a QR code on this screen. Nothing is recorded or uploaded.
        </Text>
        {permission.canAskAgain ? (
          <Pressable style={s.button} onPress={requestPermission}>
            <Text style={s.buttonText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Text style={s.text}>Camera access is turned off for GL1TCH. You can turn it on in Android settings.</Text>
        )}
        <Pressable onPress={onClose}>
          <Text style={s.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (done.current || !data) return;
          done.current = true;
          onScanned(data);
        }}
      />
      <View style={s.frame} pointerEvents="none" />
      <View style={s.bottom}>
        <Text style={s.text}>Point at a QR code with a token address or link.</Text>
        <Pressable style={s.button} onPress={onClose}>
          <Text style={s.buttonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: "center", padding: 24, gap: 16 },
  title: { color: C.text, fontSize: 22, fontWeight: "800" },
  text: { color: C.text, fontSize: 15, lineHeight: 21, textAlign: "center" },
  frame: {
    position: "absolute",
    alignSelf: "center",
    top: "28%",
    width: 240,
    height: 240,
    borderColor: C.signal,
    borderWidth: 3,
    borderRadius: 18,
  },
  bottom: { position: "absolute", left: 16, right: 16, bottom: 48, gap: 14, backgroundColor: "#0B0A14CC", borderRadius: 14, padding: 16 },
  button: { backgroundColor: C.signal, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: C.bg, fontWeight: "800", fontSize: 15 },
  link: { color: C.signal, fontWeight: "700", textAlign: "center" },
});
