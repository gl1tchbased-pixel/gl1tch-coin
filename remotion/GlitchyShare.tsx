import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";

type Props = { aspect: "square" | "landscape" | "portrait" };

export const GlitchyShare: React.FC<Props> = ({ aspect }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const isSquare = aspect === "square" || aspect === "portrait";
  const isPortrait = aspect === "portrait";

  // ---- shared motion -------------------------------------------------------
  const bob = Math.sin((frame / fps) * Math.PI * 0.85) * (isSquare ? 18 : 14);
  const mascotIn = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const mascotScale = interpolate(mascotIn, [0, 1], [0.92, 1]);

  // Glitch flicker windows scale with duration
  const fl1 = Math.round(durationInFrames * 0.39);
  const fl2 = Math.round(durationInFrames * 0.72);
  const inFlicker = (frame >= fl1 && frame <= fl1 + 4) || (frame >= fl2 && frame <= fl2 + 4);
  const flickerOffset = inFlicker ? Math.sin(frame * 9) * 5 : 0;
  const mascotFilter = inFlicker
    ? `drop-shadow(${flickerOffset}px 26px 70px ${PURPLE}66) drop-shadow(${-flickerOffset}px 0 36px ${GREEN}55)`
    : `drop-shadow(0 26px 70px ${PURPLE}55) drop-shadow(0 0 36px ${GREEN}28)`;

  const wj1 = Math.round(durationInFrames * 0.50);
  const wj2 = Math.round(durationInFrames * 0.83);
  const jitter = (frame >= wj1 && frame <= wj1 + 6) || (frame >= wj2 && frame <= wj2 + 6);
  const splitX = jitter ? Math.sin(frame * 12) * 6 : 0;

  const auroraScale = 1 + Math.sin((frame / fps) * Math.PI * 0.6) * 0.04;
  const haloOpacity = 0.5 + Math.sin((frame / fps) * Math.PI * 0.9) * 0.15;
  const dotPulse = 0.7 + Math.sin((frame / fps) * Math.PI * 2) * 0.3;
  const scanY = -(frame % 60);
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  const chips = ["$GL1TCH", "SOLANA", "0% TAX", "RENOUNCED"];
  // Scale stagger to total duration
  const chipBase = Math.round(durationInFrames * 0.33);
  const chipStep = Math.max(4, Math.round(durationInFrames * 0.055));
  const chipDelays = chips.map((_, i) => chipBase + i * chipStep);

  // ============================================================ SQUARE / PORTRAIT
  if (isSquare) {
    // Portrait (1080×1920) is for IG Reels / TikTok / Stories.
    // Reels UI eats ~280px top (username header) + ~450px bottom (like/comment/caption).
    // Keep all critical content inside the safe band [340 → 1450].
    const mascotSize = isPortrait ? 720 : 760;
    const mascotCenterTop = isPortrait ? 340 : 60;
    const contentTop = isPortrait ? 1080 : 760;
    const wordmarkSize = isPortrait ? 180 : 200;
    const taglineSize = isPortrait ? 34 : 38;
    const chipSize = isPortrait ? 22 : 26;
    const topBadgeTop = isPortrait ? 280 : 70;
    const chipsBottom = isPortrait ? 480 : 70;

    const wordmarkOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });
    const wordmarkY = interpolate(spring({ frame: frame - 8, fps, config: { damping: 14 } }), [0, 1], [30, 0]);
    const taglineOpacity = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp" });

    return (
      <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
        {/* Backdrop */}
        <Img
          src={staticFile("brand/og-bg.png")}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.45 }}
        />

        {/* Top-fade + bottom-darken so text reads */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(5,5,5,0.45) 0%, rgba(5,5,5,0.20) 40%, rgba(5,5,5,0.65) 70%, rgba(5,5,5,0.96) 100%)",
          }}
        />

        {/* Aurora centered behind mascot */}
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 200,
              width: 820,
              height: 820,
              marginLeft: -410,
              borderRadius: 9999,
              background: `radial-gradient(circle, ${PURPLE}55 0%, ${PURPLE}18 42%, transparent 68%)`,
              filter: "blur(16px)",
              transform: `scale(${auroraScale})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 360,
              width: 460,
              height: 460,
              marginLeft: -230,
              borderRadius: 9999,
              background: `radial-gradient(circle, ${GREEN}26 0%, transparent 65%)`,
              opacity: haloOpacity,
            }}
          />
        </AbsoluteFill>

        {/* Scanlines */}
        <AbsoluteFill
          style={{
            opacity: 0.14,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 4px)",
            backgroundPosition: `0 ${scanY}px`,
          }}
        />

        {/* HUD corners */}
        {[
          { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
          { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
          { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
          { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        ].map((c, i) => {
          const { b, ...pos } = c;
          const o = interpolate(frame, [0, 20], [0, 0.7], { extrapolateRight: "clamp" });
          return <div key={i} style={{ position: "absolute", ...pos, width: 50, height: 50, opacity: o, ...b }} />;
        })}

        {/* Top signal badge */}
        <div
          style={{
            position: "absolute",
            top: topBadgeTop,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${10 + dotPulse * 12}px ${GREEN}`, opacity: dotPulse }} />
          <div style={{ fontFamily: "monospace", fontSize: 26, letterSpacing: 6, color: GREEN }}>
            GL1TCH · SIGNAL_LIVE
          </div>
        </div>

        {/* MASCOT — top center, hero */}
        <Img
          src={staticFile("brand/glitchy-1024-t.png")}
          style={{
            position: "absolute",
            left: "50%",
            top: mascotCenterTop,
            width: mascotSize,
            height: mascotSize,
            marginLeft: -mascotSize / 2,
            objectFit: "contain",
            opacity: 0.97 * mascotIn,
            transform: `translateY(${bob}px) scale(${mascotScale})`,
            filter: mascotFilter,
          }}
        />

        {/* Wordmark — centered */}
        <div
          style={{
            position: "absolute",
            top: contentTop,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: wordmarkOpacity,
            transform: `translateY(${wordmarkY}px)`,
          }}
        >
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 3, left: 6 + splitX, fontSize: wordmarkSize, fontWeight: 800, letterSpacing: -8, color: PURPLE, opacity: 0.55 }}>GL1TCH</div>
            <div style={{ position: "absolute", top: -3, left: -6 - splitX, fontSize: wordmarkSize, fontWeight: 800, letterSpacing: -8, color: GREEN, opacity: 0.55 }}>GL1TCH</div>
            <div style={{ fontSize: wordmarkSize, fontWeight: 800, letterSpacing: -8, color: "#F5F7F8", textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>GL1TCH</div>
          </div>
        </div>

        {/* Tagline + cursor */}
        <div
          style={{
            position: "absolute",
            top: contentTop + (isPortrait ? 200 : 210),
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
            opacity: taglineOpacity,
          }}
        >
          <div style={{ width: 5, height: taglineSize + 6, background: GREEN, boxShadow: `0 0 16px ${GREEN}` }} />
          <div style={{ fontFamily: "monospace", fontSize: taglineSize, fontWeight: 700, letterSpacing: 5, color: "#F5F7F8" }}>INFECT THE INTERNET</div>
          <div style={{ width: taglineSize / 3, height: taglineSize + 2, background: GREEN, marginLeft: 4, opacity: cursorOn ? 1 : 0.15, boxShadow: `0 0 14px ${GREEN}` }} />
        </div>

        {/* Chips — bottom centered (above Reels safe zone for portrait) */}
        <div
          style={{
            position: "absolute",
            bottom: chipsBottom,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {chips.map((b, i) => {
            const s = spring({ frame: frame - chipDelays[i], fps, config: { damping: 14, stiffness: 110 } });
            const y = interpolate(s, [0, 1], [40, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);
            return (
              <div
                key={b}
                style={{
                  fontFamily: "monospace",
                  fontSize: chipSize,
                  letterSpacing: 2,
                  color: i === 0 ? INK : GREEN,
                  background: i === 0 ? GREEN : "rgba(5,5,5,0.75)",
                  border: `1px solid ${i === 0 ? GREEN : "rgba(124,255,79,0.32)"}`,
                  borderRadius: 9999,
                  padding: "10px 22px",
                  boxShadow: i === 0 ? `0 0 22px ${GREEN}55` : "none",
                  fontWeight: i === 0 ? 700 : 400,
                  transform: `translateY(${y}px)`,
                  opacity: op,
                }}
              >
                {b}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ============================================================ LANDSCAPE
  const mascotSize = 560;
  const mascotRight = 20;
  const mascotTop = 35;
  const contentPadL = 60;
  const contentPadT = 70;
  const contentWidth = 720;
  const wordmarkSize = 168;
  const taglineSize = 36;
  const chipSize = 22;

  const wordmarkOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });
  const wordmarkY = interpolate(spring({ frame: frame - 8, fps, config: { damping: 14 } }), [0, 1], [30, 0]);
  const taglineOpacity = interpolate(frame, [25, 55], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
      <Img src={staticFile("brand/og-bg.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.82) 38%, rgba(5,5,5,0.50) 62%, rgba(5,5,5,0.30) 100%)",
        }}
      />
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            right: -80,
            top: 20,
            width: 660,
            height: 660,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${PURPLE}55 0%, ${PURPLE}18 42%, transparent 68%)`,
            filter: "blur(14px)",
            transform: `scale(${auroraScale})`,
            transformOrigin: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 250,
            width: 340,
            height: 340,
            borderRadius: 9999,
            background: `radial-gradient(circle, ${GREEN}28 0%, transparent 65%)`,
            opacity: haloOpacity,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: 0.16,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 4px)",
          backgroundPosition: `0 ${scanY}px`,
        }}
      />
      {[
        { top: 40, left: 40, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { top: 40, right: 40, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        { bottom: 40, left: 40, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
        { bottom: 40, right: 40, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
      ].map((c, i) => {
        const { b, ...pos } = c;
        const o = interpolate(frame, [0, 20], [0, 0.7], { extrapolateRight: "clamp" });
        return <div key={i} style={{ position: "absolute", ...pos, width: 50, height: 50, opacity: o, ...b }} />;
      })}
      <Img
        src={staticFile("brand/glitchy-1024-t.png")}
        style={{
          position: "absolute",
          right: mascotRight,
          top: mascotTop,
          width: mascotSize,
          height: mascotSize,
          objectFit: "contain",
          opacity: 0.96 * mascotIn,
          transform: `translateY(${bob}px) scale(${mascotScale})`,
          filter: mascotFilter,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: contentPadL,
          top: contentPadT,
          width: contentWidth,
          height: height - 2 * contentPadT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ width: 12, height: 12, borderRadius: 9999, background: GREEN, boxShadow: `0 0 ${10 + dotPulse * 12}px ${GREEN}`, opacity: dotPulse }} />
          <div style={{ fontFamily: "monospace", fontSize: 22, letterSpacing: 6, color: GREEN }}>GL1TCH · SIGNAL_LIVE</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 32, opacity: wordmarkOpacity, transform: `translateY(${wordmarkY}px)` }}>
          <div style={{ position: "relative", display: "flex" }}>
            <div style={{ position: "absolute", top: 3, left: 6 + splitX, fontSize: wordmarkSize, fontWeight: 800, letterSpacing: -7, color: PURPLE, opacity: 0.55 }}>GL1TCH</div>
            <div style={{ position: "absolute", top: -3, left: -6 - splitX, fontSize: wordmarkSize, fontWeight: 800, letterSpacing: -7, color: GREEN, opacity: 0.55 }}>GL1TCH</div>
            <div style={{ fontSize: wordmarkSize, fontWeight: 800, letterSpacing: -7, color: "#F5F7F8", textShadow: "0 6px 50px rgba(5,5,5,0.95)" }}>GL1TCH</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingLeft: 6, opacity: taglineOpacity }}>
            <div style={{ width: 5, height: taglineSize + 8, background: GREEN, boxShadow: `0 0 16px ${GREEN}` }} />
            <div style={{ fontFamily: "monospace", fontSize: taglineSize, fontWeight: 700, letterSpacing: 5, color: "#F5F7F8", textShadow: "0 2px 24px rgba(0,0,0,0.9)" }}>INFECT THE INTERNET</div>
            <div style={{ width: taglineSize / 3, height: taglineSize + 4, background: GREEN, marginLeft: 4, opacity: cursorOn ? 1 : 0.15, boxShadow: `0 0 14px ${GREEN}` }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {chips.map((b, i) => {
            const s = spring({ frame: frame - chipDelays[i], fps, config: { damping: 14, stiffness: 110 } });
            const y = interpolate(s, [0, 1], [40, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);
            return (
              <div
                key={b}
                style={{
                  fontFamily: "monospace",
                  fontSize: chipSize,
                  letterSpacing: 2,
                  color: i === 0 ? INK : GREEN,
                  background: i === 0 ? GREEN : "rgba(5,5,5,0.7)",
                  border: `1px solid ${i === 0 ? GREEN : "rgba(124,255,79,0.32)"}`,
                  borderRadius: 9999,
                  padding: "10px 22px",
                  boxShadow: i === 0 ? `0 0 22px ${GREEN}55` : "none",
                  fontWeight: i === 0 ? 700 : 400,
                  transform: `translateY(${y}px)`,
                  opacity: op,
                }}
              >
                {b}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
