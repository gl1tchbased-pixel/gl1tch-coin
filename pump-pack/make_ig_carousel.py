# Generates 5 premium GL1TCH manifesto carousel slides as standalone HTML
# (1080x1350), brand-styled. Rendered to PNG via Chrome headless afterwards.
import base64, os, pathlib

ROOT = pathlib.Path(r"C:\Users\MSI\Desktop\coin")
OUT = ROOT / "assets" / "instagram"
OUT.mkdir(parents=True, exist_ok=True)

logo_path = ROOT / "public" / "brand" / "gl1tch-logo-256.png"
logo_b64 = base64.b64encode(logo_path.read_bytes()).decode() if logo_path.exists() else ""
LOGO = f"data:image/png;base64,{logo_b64}" if logo_b64 else ""

HEAD = """<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;background:#050505;overflow:hidden}
.slide{position:relative;width:1080px;height:1350px;background:#050505;
  padding:96px;display:flex;flex-direction:column;
  font-family:"Segoe UI",Arial,sans-serif;color:#f5f7f8;overflow:hidden}
.grid{position:absolute;inset:0;background-image:
  linear-gradient(rgba(124,255,79,.045) 1px,transparent 1px),
  linear-gradient(90deg,rgba(124,255,79,.045) 1px,transparent 1px);
  background-size:60px 60px;pointer-events:none}
.glow{position:absolute;left:50%;top:-10%;width:1200px;height:1200px;transform:translateX(-50%);
  background:radial-gradient(circle,rgba(124,255,79,.16),transparent 60%);pointer-events:none}
.glow2{position:absolute;right:-15%;bottom:-10%;width:900px;height:900px;
  background:radial-gradient(circle,rgba(122,60,255,.14),transparent 60%);pointer-events:none}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,
  rgba(255,255,255,.018) 0 2px,transparent 2px 5px);pointer-events:none}
.top{position:relative;display:flex;align-items:center;gap:22px;z-index:3}
.logo{width:64px;height:64px;border-radius:14px;border:1px solid rgba(124,255,79,.35);
  box-shadow:0 0 26px rgba(124,255,79,.25)}
.wm{font-family:"Consolas",monospace;font-weight:700;font-size:34px;letter-spacing:3px;color:#f5f7f8}
.num{margin-left:auto;font-family:"Consolas",monospace;font-size:26px;letter-spacing:3px;color:rgba(245,247,248,.4)}
.main{position:relative;flex:1;display:flex;flex-direction:column;justify-content:center;z-index:3}
.kick{font-family:"Consolas",monospace;font-size:30px;letter-spacing:8px;text-transform:uppercase;
  color:#7cff4f;margin-bottom:34px}
.h{font-weight:800;line-height:1.04;letter-spacing:-2px;text-transform:uppercase}
.g{color:#7cff4f}
.glitch{text-shadow:4px 0 rgba(122,60,255,.85),-4px 0 rgba(124,255,79,.85)}
.sub{margin-top:40px;font-size:38px;line-height:1.45;color:rgba(245,247,248,.72);font-weight:400}
.sub b{color:#f5f7f8;font-weight:600}
.checks{margin-top:50px;display:flex;flex-direction:column;gap:26px}
.chk{display:flex;align-items:center;gap:24px;font-size:40px;font-weight:600}
.tick{width:52px;height:52px;border-radius:50%;background:#7cff4f;color:#050505;font-size:30px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 20px rgba(124,255,79,.4)}
.ladder{margin-top:46px;display:flex;flex-direction:column;gap:16px}
.rk{display:flex;align-items:center;gap:20px;padding:20px 28px;border:1px solid rgba(124,255,79,.18);
  border-radius:16px;background:rgba(18,19,26,.6);font-family:"Consolas",monospace;font-size:32px}
.rk.top{border-color:#7a3cff;background:linear-gradient(90deg,rgba(122,60,255,.22),transparent 70%)}
.rk .t{margin-left:auto;font-size:24px;color:rgba(245,247,248,.5)}
.foot{position:relative;z-index:3;display:flex;flex-direction:column;gap:26px}
.bar{display:flex;gap:10px}
.bar i{height:6px;flex:1;border-radius:6px;background:rgba(245,247,248,.12)}
.bar i.on{background:#7cff4f;box-shadow:0 0 14px rgba(124,255,79,.5)}
.fline{font-family:"Consolas",monospace;font-size:30px;letter-spacing:2px;color:rgba(245,247,248,.6)}
.fline b{color:#7cff4f}
.cta{display:inline-flex;align-items:center;gap:18px;align-self:flex-start;
  padding:26px 46px;border-radius:16px;background:#7cff4f;color:#050505;
  font-weight:800;font-size:40px;letter-spacing:1px;box-shadow:0 0 40px rgba(124,255,79,.45);text-transform:uppercase}
</style></head><body>"""

def slide(num, inner, bar_on):
    bars = "".join(f'<i class="{"on" if i<=bar_on else ""}"></i>' for i in range(1,6))
    logo = f'<img class="logo" src="{LOGO}">' if LOGO else '<div class="logo"></div>'
    return (HEAD +
      f'<div class="slide"><div class="grid"></div><div class="glow"></div><div class="glow2"></div><div class="scan"></div>'
      f'<div class="top">{logo}<span class="wm">GL1TCH</span><span class="num">0{num} / 05</span></div>'
      f'<div class="main">{inner}</div>'
      f'<div class="foot"><div class="bar">{bars}</div></div>'
      f'</div></body></html>')

slides = {}

# 1 — COVER / HOOK
slides[1] = slide(1,
  '<div class="kick">$GL1TCH &nbsp;//&nbsp; Solana</div>'
  '<div class="h" style="font-size:118px">The internet has a <span class="g glitch">glitch</span>.</div>'
  '<div class="sub" style="font-size:44px">And it&rsquo;s spreading. \U0001F47E</div>', 1)

# 2 — ORIGIN
slides[2] = slide(2,
  '<div class="h" style="font-size:78px">It studied the feed. Learned how <span class="g">attention</span> spreads. Then it <span class="g glitch">escaped</span>.</div>'
  '<div class="sub">GL1TCH &mdash; a <b>rogue-AI cult</b>, born on Solana.</div>', 2)

# 3 — TRUST
slides[3] = slide(3,
  '<div class="h" style="font-size:88px">No tax. No owner. <span class="g glitch">No tricks.</span></div>'
  '<div class="checks">'
  '<div class="chk"><span class="tick">✓</span>0% buy / 0% sell tax</div>'
  '<div class="chk"><span class="tick">✓</span>Mint &amp; freeze authority revoked</div>'
  '<div class="chk"><span class="tick">✓</span>Liquidity locked</div>'
  '<div class="chk"><span class="tick">✓</span>RugCheck: clean</div>'
  '</div>'
  '<div class="sub" style="margin-top:46px;font-size:36px">Don&rsquo;t trust &mdash; <b>verify.</b></div>', 3)

# 4 — UTILITY
slides[4] = slide(4,
  '<div class="h" style="font-size:80px">Holding isn&rsquo;t hoping. It&rsquo;s <span class="g glitch">access.</span></div>'
  '<div class="ladder">'
  '<div class="rk">Observer<span class="t">free</span></div>'
  '<div class="rk">Infected<span class="t">100K+</span></div>'
  '<div class="rk">Signal Bearer<span class="t">1M+</span></div>'
  '<div class="rk">Core Node<span class="t">5M+</span></div>'
  '<div class="rk top">Ghost Node \U0001F47E<span class="t">10M+</span></div>'
  '</div>'
  '<div class="sub" style="margin-top:40px;font-size:34px">Your bag = your rank. Token-gated rooms. <b>One real utility, live now.</b></div>', 4)

# 5 — CTA
slides[5] = slide(5,
  '<div class="h" style="font-size:104px">Join the <span class="g glitch">Infected.</span> \U0001F47E</div>'
  '<div class="sub" style="font-size:40px">Buy on Jupiter &nbsp;·&nbsp; Verify on-chain</div>'
  '<div style="margin-top:54px"><span class="cta">Link in bio →</span></div>'
  '<div class="fline" style="margin-top:40px">\U0001F4F8 <b>@gl1tch_infected</b></div>', 5)

for n, html in slides.items():
    (OUT / f"slide{n}.html").write_text(html, encoding="utf-8")
    print("wrote", OUT / f"slide{n}.html")
print("LOGO_EMBEDDED", bool(LOGO))
