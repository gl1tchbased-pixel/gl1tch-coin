# Builds a clean, formatted .docx (no external deps) for the GL1TCH Instagram
# setup guide. Pure stdlib: a .docx is just a ZIP of Office Open XML parts.
import zipfile
from xml.sax.saxutils import escape

OUT = "gl1tch-instagram-setup.docx"

# Brand colors
GREEN = "2E7D32"   # readable green on white (print/word friendly)
PURPLE = "5B2ECC"
GREY = "555555"
CODE_SHADE = "F0F2F0"

def run(text, *, b=False, i=False, sz=None, color=None, mono=False):
    rpr = "<w:rPr>"
    if b: rpr += "<w:b/>"
    if i: rpr += "<w:i/>"
    if mono: rpr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>'
    if sz: rpr += f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>'
    if color: rpr += f'<w:color w:val="{color}"/>'
    rpr += "</w:rPr>"
    # Preserve spaces; split newlines into <w:br/>
    parts = escape(text).split("\n")
    t = ""
    for idx, p in enumerate(parts):
        if idx: t += "<w:br/>"
        t += f'<w:t xml:space="preserve">{p}</w:t>'
    return f"<w:r>{rpr}{t}</w:r>"

def para(runs, *, align=None, shade=None, space_before=120, space_after=120, border=False):
    if isinstance(runs, str):
        runs = [run(runs)]
    ppr = "<w:pPr>"
    ppr += f'<w:spacing w:before="{space_before}" w:after="{space_after}"/>'
    if align: ppr += f'<w:jc w:val="{align}"/>'
    if shade: ppr += f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>'
    if border:
        ppr += ('<w:pBdr>'
                '<w:top w:val="single" w:sz="6" w:space="6" w:color="2E7D32"/>'
                '<w:left w:val="single" w:sz="6" w:space="6" w:color="2E7D32"/>'
                '<w:bottom w:val="single" w:sz="6" w:space="6" w:color="2E7D32"/>'
                '<w:right w:val="single" w:sz="6" w:space="6" w:color="2E7D32"/>'
                '</w:pBdr>')
    ppr += "</w:pPr>"
    return f"<w:p>{ppr}{''.join(runs)}</w:p>"

def h1(text):
    return para([run(text, b=True, sz=40, color=GREEN)], space_before=240, space_after=120)

def h2(text):
    return para([run(text, b=True, sz=30, color=PURPLE)], space_before=300, space_after=80)

def body(text, **kw):
    return para([run(text, sz=22)], **kw)

def bullet(text):
    return para([run("•  ", b=True, sz=22, color=GREEN), run(text, sz=22)], space_before=40, space_after=40)

def code(text):
    # monospace, shaded, bordered "copy this" box
    return para([run(text, mono=True, sz=20)], shade=CODE_SHADE, border=True, space_before=80, space_after=160)

def label(text):
    return para([run(text, b=True, sz=22, color=GREY)], space_before=160, space_after=20)

P = []
P.append(para([run("GL1TCH \U0001F47E Instagram Kurulum Rehberi", b=True, sz=52, color=GREEN)], align="center", space_after=40))
P.append(para([run("@gl1tch_infected  ·  Telefondan adim adim takip et. Mavi kutulardaki metinleri kopyala-yapistir.", i=True, sz=20, color=GREY)], align="center", space_after=240))

# 1
P.append(h2("1) Hesap turu  (TAMAM ✓)"))
P.append(body("Profesyonel hesaba (Creator/Business) gectin. Bu sayede analytics + link ozellikleri acik. Devam."))

# 2
P.append(h2("2) Profili Duzenle  →  Ad, Bio, Link"))
P.append(body("Profil sayfan → “Profili Duzenle”. Asagidaki uc alani doldur:"))

P.append(label("AD (Name):"))
P.append(code("GL1TCH \U0001F47E $GL1TCH"))

P.append(label("BIYOGRAFI (Bio):"))
P.append(code("\U0001F47E Rogue-AI cult on Solana\nZero tax · Fully renounced · 1 real utility\nDon't trust — verify \U0001F447"))

P.append(label("BAGLANTI (Website / Link):"))
P.append(code("https://coin-three-mu.vercel.app/links"))
P.append(body("Not: Birden fazla link eklemek istersen (Telegram, Chart), “Baglanti ekle” ile sunlari da koyabilirsin — ama tek link yeterli, /links sayfasi zaten hepsini iceriyor:"))
P.append(bullet("https://t.me/gl1tch_infected   →  baslik: Telegram"))
P.append(bullet("https://dexscreener.com/solana/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump   →  baslik: Chart"))

# 3
P.append(h2("3) Profil Fotografi \U0001F4F8"))
P.append(body("En kolay yol — logoyu kendi press sayfamizdan indir:"))
P.append(bullet("Telefon tarayicisinda ac:  https://coin-three-mu.vercel.app/press"))
P.append(bullet("“Logos & Imagery” bolumunde Avatar A veya Logo 256² kartina dokun → indir."))
P.append(bullet("Instagram'da profil fotografi olarak yukle. (IG yuvarlak kirpar — ortali logo iyi durur.)"))

# 4
P.append(h2("4) Highlight (One Cikanlar) — 5 kapsul"))
P.append(body("Story'leri kalicilastir; profili profesyonel gosterir. Olusturulacak kapsuller:"))
P.append(bullet("WTF is GL1TCH  —  lore / manifesto, “ne bu?”"))
P.append(bullet("How to Buy  —  3 adim: cuzdan → SOL → Jupiter"))
P.append(bullet("Verify / Trust  —  sifir vergi, renounced, RugCheck, give-back"))
P.append(bullet("Ranks  —  Observer → Ghost Node merkezi"))
P.append(bullet("Memes  —  en iyi gorseller / videolar"))

# 5
P.append(h2("5) Karsilikli Dogrulama (sahte hesaplari oldurur)"))
P.append(body("Site zaten IG'yi resmi olarak listeliyor. Simdi diger kanallardan da baglayalim:"))
P.append(bullet("X (@gl1tchbased) ve Telegram bio'larina ekle:  \U0001F4F8 IG: @gl1tch_infected"))
P.append(label("TG / X duyuru metni:"))
P.append(code("Official Instagram is now live → instagram.com/gl1tch_infected\nAnything else is fake. \U0001F47E"))

# 6
P.append(h2("6) Icerik Plani"))
P.append(bullet("IG = gorsel/video. Oncelik REELS — organik erisim Reels'te."))
P.append(bullet("Cadence: haftada 3-4 Reel + gunluk 1-2 Story."))
P.append(label("Hashtag seti:"))
P.append(code("#solana  #memecoin  #crypto  #solanamemecoins  #gl1tch"))

# 7
P.append(h2("7) Ilk Gonderi (siradaki adim)"))
P.append(body("Profili bitirince ilk posta gecelim. Iki secenek hazirlayabilirim:"))
P.append(bullet("5 slaytlik MANIFESTO CAROUSEL (hook → ne → sifir vergi → utility → CTA)"))
P.append(bullet("REEL senaryosu (hook + sahneler + caption + hashtag)"))

# Appendix
P.append(h2("Ek: Resmi Linkler & Kontrat"))
P.append(bullet("Site:  https://coin-three-mu.vercel.app"))
P.append(bullet("Resmi Linkler:  https://coin-three-mu.vercel.app/links"))
P.append(bullet("Press Kit (logo indir):  https://coin-three-mu.vercel.app/press"))
P.append(bullet("X:  https://x.com/gl1tchbased"))
P.append(bullet("Telegram:  https://t.me/gl1tch_infected"))
P.append(bullet("Instagram:  https://instagram.com/gl1tch_infected"))
P.append(label("Kontrat Adresi (CA):"))
P.append(code("3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump"))
P.append(para([run("⚠ Sadece bu sayfadaki linklere guven. Adminler asla once DM atmaz.", i=True, sz=18, color=GREY)], space_before=200))

body_xml = "".join(P)

document = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    f'<w:body>{body_xml}'
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
    '<w:pgMar w:top="1134" w:bottom="1134" w:left="1134" w:right="1134"/></w:sectPr>'
    '</w:body></w:document>'
)

content_types = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '</Types>'
)

rels = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    '</Relationships>'
)

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", rels)
    z.writestr("word/document.xml", document)

print("WROTE", OUT)
