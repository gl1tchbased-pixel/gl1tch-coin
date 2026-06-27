import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "GL1TCH — Infect The Internet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#7CFF4F";
const PURPLE = "#7A3CFF";
const INK = "#050505";

export default async function OpengraphImage() {
  const bgData = await readFile(join(process.cwd(), "assets/og-bg.png"), "base64");
  const bgSrc = `data:image/png;base64,${bgData}`;
  const mascotData = await readFile(join(process.cwd(), "assets/glitchy-mascot.png"), "base64");
  const mascotSrc = `data:image/png;base64,${mascotData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: INK,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cinematic backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={bgSrc}
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.55,
          }}
        />

        {/* Heavy left-side darken so the wordmark always reads */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(5,5,5,0.96) 0%, rgba(5,5,5,0.82) 38%, rgba(5,5,5,0.50) 62%, rgba(5,5,5,0.30) 100%)",
          }}
        />

        {/* Purple aurora behind the mascot — softer, on-brand */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: 20,
            width: 660,
            height: 660,
            display: "flex",
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(122,60,255,0.38) 0%, rgba(122,60,255,0.10) 42%, transparent 68%)",
            filter: "blur(12px)",
          }}
        />
        {/* Subtle green halo accent */}
        <div
          style={{
            position: "absolute",
            right: 120,
            top: 250,
            width: 340,
            height: 340,
            display: "flex",
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(124,255,79,0.16) 0%, transparent 65%)",
          }}
        />

        {/* Fine scanline grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: 0.18,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 4px)",
          }}
        />

        {/* HUD corner brackets */}
        {[
          { pos: { top: 40, left: 40 }, b: { borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
          { pos: { top: 40, right: 40 }, b: { borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
          { pos: { bottom: 40, left: 40 }, b: { borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` } },
          { pos: { bottom: 40, right: 40 }, b: { borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` } },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              ...c.pos,
              width: 42,
              height: 42,
              display: "flex",
              ...c.b,
              opacity: 0.7,
            }}
          />
        ))}

        {/* GLITCHY MASCOT — anchored right, hero element */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={mascotSrc}
          width={560}
          height={560}
          style={{
            position: "absolute",
            right: 20,
            top: 35,
            width: 560,
            height: 560,
            objectFit: "contain",
            opacity: 0.96,
            filter:
              "drop-shadow(0 26px 70px rgba(122,60,255,0.42)) drop-shadow(0 0 36px rgba(124,255,79,0.18))",
          }}
        />

        {/* CONTENT — anchored left column */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            width: 720,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "70px 60px",
          }}
        >
          {/* Top: signal badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: GREEN,
                boxShadow: `0 0 14px ${GREEN}`,
              }}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: 22,
                letterSpacing: 3,
                color: GREEN,
              }}
            >
              coin-three-mu.vercel.app · SIGNAL_LIVE
            </div>
          </div>

          {/* Middle: wordmark + tagline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ position: "relative", display: "flex" }}>
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: 6,
                  display: "flex",
                  fontSize: 168,
                  fontWeight: 800,
                  letterSpacing: -7,
                  color: PURPLE,
                  opacity: 0.5,
                }}
              >
                GL1TCH
              </div>
              <div
                style={{
                  position: "absolute",
                  top: -3,
                  left: -6,
                  display: "flex",
                  fontSize: 168,
                  fontWeight: 800,
                  letterSpacing: -7,
                  color: GREEN,
                  opacity: 0.5,
                }}
              >
                GL1TCH
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 168,
                  fontWeight: 800,
                  letterSpacing: -7,
                  color: "#F5F7F8",
                  textShadow: "0 6px 50px rgba(5,5,5,0.95)",
                }}
              >
                GL1TCH
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                paddingLeft: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 4,
                  height: 44,
                  background: GREEN,
                  boxShadow: `0 0 16px ${GREEN}`,
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontFamily: "monospace",
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: 5,
                  color: "#F5F7F8",
                  textShadow: "0 2px 24px rgba(0,0,0,0.9)",
                }}
              >
                INFECT THE INTERNET
              </div>
            </div>
          </div>

          {/* Bottom: trust chips */}
          <div style={{ display: "flex", gap: 14 }}>
            {["$GL1TCH", "SOLANA", "0% TAX", "RENOUNCED"].map((b, i) => (
              <div
                key={b}
                style={{
                  display: "flex",
                  fontFamily: "monospace",
                  fontSize: 22,
                  letterSpacing: 2,
                  color: i === 0 ? INK : GREEN,
                  background: i === 0 ? GREEN : "rgba(5,5,5,0.7)",
                  border: `1px solid ${i === 0 ? GREEN : "rgba(124,255,79,0.32)"}`,
                  borderRadius: 9999,
                  padding: "9px 20px",
                  boxShadow: i === 0 ? "0 0 22px rgba(124,255,79,0.45)" : "none",
                  fontWeight: i === 0 ? 700 : 400,
                  backdropFilter: "blur(6px)",
                }}
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
