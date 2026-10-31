#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh toàn bộ art asset cho Thanh Vân Tông Live RPC.

Pipeline: Python compose SVG (gradient, glow, hoạ tiết) -> headless Chrome/Edge
screenshot -> PNG đúng kích thước vào public/assets/. Không cần Pillow, không
dùng ảnh gốc của repo zane-tv (tránh vi phạm license).

Chạy: python tools/generate-assets.py
Cần:  Chrome hoặc Edge đã cài (tự dò). Đặt CHROME_PATH để chỉ định thủ công.
"""

import math
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)
TMP = pathlib.Path(os.environ.get("TEMP", "/tmp")) / "tutien-asset-render"
TMP.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Browser discovery
# ---------------------------------------------------------------------------

def find_browser():
    candidates = []
    if os.environ.get("CHROME_PATH"):
        candidates.append(os.environ["CHROME_PATH"])
    candidates += [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
    ]
    for c in candidates:
        if pathlib.Path(c).exists():
            return c
    for c in ("chrome", "chromium", "msedge"):
        found = shutil_which(c)
        if found:
            return found
    sys.exit("Không tìm thấy Chrome/Edge. Đặt biến môi trường CHROME_PATH.")


def shutil_which(name):
    for p in os.environ.get("PATH", "").split(os.pathsep):
        exe = pathlib.Path(p) / (name + (".exe" if os.name == "nt" else ""))
        if exe.exists():
            return str(exe)
    return None


def render(name, body_svg, w, h, transparent=False):
    """Render một SVG string (đã bọc <svg ...>) ra PNG qua headless browser."""
    bg = "transparent" if transparent else "#000000"
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{{margin:0;padding:0}}html,body{{width:{w}px;height:{h}px;overflow:hidden;background:{bg}}}</style>
</head><body>{body_svg}</body></html>"""
    html_path = TMP / (name + ".html")
    png_path = OUT / name
    html_path.write_text(html, encoding="utf-8")
    browser = find_browser()
    url = html_path.as_uri()
    cmd = [
        browser,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--force-color-profile=srgb",
        "--hide-scrollbars",
        "--window-size=%d,%d" % (w, h),
        "--screenshot=%s" % png_path.resolve(),
    ]
    if transparent:
        cmd.append("--default-background-color=00000000")
    cmd.append(url)
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if not png_path.exists():
        print(proc.stdout[-800:], proc.stderr[-800:])
        sys.exit("Render thất bại: " + name)
    print("✓", name, "%dx%d" % (w, h))


# ===========================================================================
# STAGE 1080x1920 — Tiên Điện Thanh Vân Tông
# Anchor bắt buộc (khớp live.css / live.js):
#   mặt Tông Chủ (540, 260) | hào quang tay (540, 502) | miệng lư hương (540, ~905)
#   6 đệm quỳ chân đứng y=1188 tại x=140,268,392,688,812,940
#   thảm đỏ x~320..760 (trên) -> 262..818 (dưới), y 1300 -> 1920
# ===========================================================================

def star_field(seed=7, n=42):
    pts = []
    rng = (seed * 2654435761) % (2**32)
    for _ in range(n):
        rng = (rng * 1103515245 + 12345) % (2**31)
        x = rng % 1080
        rng = (rng * 1103515245 + 12345) % (2**31)
        y = rng % 640
        rng = (rng * 1103515245 + 12345) % (2**31)
        r = 0.8 + (rng % 18) / 10.0
        o = 0.2 + (rng % 45) / 100.0
        pts.append(f'<circle cx="{x}" cy="{y}" r="{r:.1f}" fill="#ffeec4" opacity="{o:.2f}"/>')
    return "".join(pts)


def cloud_wisp(cx, cy, w, h, opacity):
    return (
        f'<ellipse cx="{cx}" cy="{cy}" rx="{w}" ry="{h}" fill="url(#mist)" opacity="{opacity}"/>'
    )


def gold_cloud_band(y, x0, x1, scale=1.0, opacity=0.85):
    """Dải mây triều (trống mây) chạy ngang — dùng cho panel/bục."""
    out = []
    step = int(120 * scale)
    x = x0
    while x < x1:
        out.append(
            f'<g transform="translate({x},{y}) scale({scale})" opacity="{opacity}">'
            '<path d="M0 0 C 8 -14 30 -16 38 -4 C 46 -18 72 -18 80 -4 C 96 -8 106 4 98 14 '
            'L 4 14 C -6 10 -6 6 0 0 Z" fill="none" stroke="url(#goldStroke)" stroke-width="2.4"/></g>'
        )
        x += step
    return "".join(out)


def stage_svg():
    W, H = 1080, 1920
    g = []
    g.append(f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">')

    # ------------------------------------------------------------------ defs
    g.append("""<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0a1126"/><stop offset="0.45" stop-color="#152648"/>
    <stop offset="0.8" stop-color="#1c3055"/><stop offset="1" stop-color="#141f3c"/>
  </linearGradient>
  <radialGradient id="hallGlow" cx="0.5" cy="0.42" r="0.75">
    <stop offset="0" stop-color="#3b5a86" stop-opacity="0.55"/>
    <stop offset="0.55" stop-color="#22375f" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#0a1126" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="mist" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#9fc8e8" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#9fc8e8" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="mural" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#123a40"/><stop offset="0.6" stop-color="#175055"/>
    <stop offset="1" stop-color="#0f3038"/>
  </linearGradient>
  <linearGradient id="goldStroke" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f5d78a"/><stop offset="1" stop-color="#b9873c"/>
  </linearGradient>
  <linearGradient id="woodDark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a2417"/><stop offset="1" stop-color="#201209"/>
  </linearGradient>
  <linearGradient id="pillar" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#241609"/><stop offset="0.35" stop-color="#4a2f1a"/>
    <stop offset="0.6" stop-color="#54371f"/><stop offset="1" stop-color="#1d1006"/>
  </linearGradient>
  <linearGradient id="redLacquer" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#a93240"/><stop offset="0.5" stop-color="#7c2129"/>
    <stop offset="1" stop-color="#4d1218"/>
  </linearGradient>
  <linearGradient id="carpet" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a2330"/><stop offset="1" stop-color="#571522"/>
  </linearGradient>
  <linearGradient id="carpetEdge" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e8bc63"/><stop offset="1" stop-color="#a5762f"/>
  </linearGradient>
  <linearGradient id="bronze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a7040"/><stop offset="0.55" stop-color="#5a4826"/>
    <stop offset="1" stop-color="#32280f"/>
  </linearGradient>
  <linearGradient id="statueRobe" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f4ecd8"/><stop offset="0.55" stop-color="#ded0ae"/>
    <stop offset="1" stop-color="#b3a17c"/>
  </linearGradient>
  <radialGradient id="statueSkin" cx="0.42" cy="0.35" r="0.9">
    <stop offset="0" stop-color="#f8e0a4"/><stop offset="0.7" stop-color="#e2b465"/>
    <stop offset="1" stop-color="#b8873b"/>
  </radialGradient>
  <radialGradient id="lanternBody" cx="0.38" cy="0.35" r="0.95">
    <stop offset="0" stop-color="#d4525c"/><stop offset="0.55" stop-color="#a03040"/>
    <stop offset="1" stop-color="#5c1620"/>
  </radialGradient>
  <radialGradient id="lanternGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#ffcf8a" stop-opacity="0.85"/>
    <stop offset="0.5" stop-color="#ff9d4d" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#ff9d4d" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="cyanGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#bff4ff" stop-opacity="0.95"/>
    <stop offset="0.45" stop-color="#6fd8f2" stop-opacity="0.45"/>
    <stop offset="1" stop-color="#6fd8f2" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="daoOrb" cx="0.5" cy="0.42" r="0.6">
    <stop offset="0" stop-color="#fffbe8"/><stop offset="0.5" stop-color="#ffe494"/>
    <stop offset="1" stop-color="#e8a94f"/>
  </radialGradient>
  <radialGradient id="vignette" cx="0.5" cy="0.46" r="0.85">
    <stop offset="0" stop-color="#000000" stop-opacity="0"/>
    <stop offset="0.72" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#020409" stop-opacity="0.55"/>
  </radialGradient>
  <linearGradient id="floorWood" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2e1d10"/><stop offset="1" stop-color="#160c05"/>
  </linearGradient>
  <linearGradient id="jadeStone" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3f6b62"/><stop offset="1" stop-color="#223c38"/>
  </linearGradient>
  <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="blur16"><feGaussianBlur stdDeviation="16"/></filter>
  <filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>
</defs>""")

    # ------------------------------------------------------------- backdrop
    g.append(f'<rect width="{W}" height="{H}" fill="url(#wall)"/>')
    g.append(f'<rect width="{W}" height="{H}" fill="url(#hallGlow)"/>')
    # hoạ tiết mây triều mờ trên tường
    pat = []
    for yy in range(140, 1150, 220):
        pat.append(gold_cloud_band(yy, 150, 940, scale=0.9, opacity=0.055))
    g.append("".join(pat))
    g.append(star_field())

    # ------------------------------------------------- trần nhà + dầm vàng
    g.append('<g>')
    g.append('<rect x="0" y="0" width="1080" height="92" fill="#080d1e"/>')
    g.append('<rect x="0" y="88" width="1080" height="7" fill="url(#goldStroke)" opacity="0.8"/>')
    for i in range(9):
        x0 = 30 + i * 118
        g.append(
            f'<rect x="{x0}" y="14" width="86" height="60" rx="6" fill="#0c1428" '
            'stroke="#c9a24f" stroke-opacity="0.22" stroke-width="1.4"/>'
        )
    g.append('</g>')

    # ------------------------------------------------- đĩa bích hoạ sau tượng
    g.append("""<g>
      <circle cx="540" cy="470" r="486" fill="url(#mural)" opacity="0.96"/>
      <circle cx="540" cy="470" r="486" fill="none" stroke="url(#goldStroke)" stroke-width="5" opacity="0.9"/>
      <circle cx="540" cy="470" r="458" fill="none" stroke="url(#goldStroke)" stroke-width="1.6" opacity="0.5"/>
      <circle cx="540" cy="470" r="420" fill="none" stroke="#7fe0c8" stroke-width="1.2" opacity="0.35" stroke-dasharray="10 14"/>
    </g>""")
    mountains = [
        (620, "#0d2c33", 150, 0.9),
        (560, "#14434a", 120, 0.9),
        (520, "#1d5a5c", 96, 0.85),
    ]
    for base, col, amp, op in mountains:
        pts = ["M0 960"]
        x = 0
        while x <= 1080:
            yv = base - amp * (0.55 + 0.45 * math.sin(x / 130.0 + base)) * math.exp(-((x - 540) ** 2) / 420000.0)
            pts.append(f"L{x} {yv:.0f}")
            x += 30
        pts.append("L1080 960 Z")
        g.append(f'<path d="{" ".join(pts)}" fill="{col}" opacity="{op}"/>')
    for cx, cy, w_, h_, o in [(300, 700, 240, 36, 0.5), (760, 640, 260, 40, 0.45), (540, 560, 300, 44, 0.35)]:
        g.append(cloud_wisp(cx, cy, w_, h_, o))
    g.append('<circle cx="540" cy="380" r="300" fill="url(#lanternGlow)" opacity="0.4" filter="url(#blur30)"/>')

    # ------------------------------------------------------------ cột hai bên
    for side in (0, 1):
        x = 58 if side == 0 else 962
        g.append(f"""<g>
          <rect x="{x}" y="92" width="60" height="1160" fill="url(#pillar)"/>
          <rect x="{x-8}" y="92" width="76" height="26" rx="6" fill="url(#goldStroke)"/>
          <rect x="{x-6}" y="1244" width="72" height="24" rx="5" fill="url(#woodDark)" stroke="#c9a24f" stroke-opacity="0.5"/>
        </g>""")
        for yy in range(200, 1180, 190):
            g.append(
                f'<rect x="{x+6}" y="{yy}" width="48" height="10" rx="5" fill="url(#goldStroke)" opacity="0.55"/>'
            )

    # ----------------------------------------------------- đèn lồng đỏ hai bên
    def lantern(cx, top):
        body_cy = top + 84
        s = []
        s.append(f'<line x1="{cx}" y1="0" x2="{cx}" y2="{top-6}" stroke="#5a3d1d" stroke-width="4"/>')
        s.append(f'<circle cx="{cx}" cy="{body_cy}" r="140" fill="url(#lanternGlow)" filter="url(#blur30)"/>')
        s.append(f'<rect x="{cx-24}" y="{top-8}" width="48" height="14" rx="5" fill="url(#goldStroke)"/>')
        # thân đèn tròn
        s.append(f'<ellipse cx="{cx}" cy="{body_cy}" rx="62" ry="76" fill="url(#lanternBody)"/>')
        # nan đèn dọc
        for k in (-1, 0, 1):
            rx = 62 - abs(k) * 18
            s.append(
                f'<ellipse cx="{cx}" cy="{body_cy}" rx="{rx}" ry="76" fill="none" '
                'stroke="#5c1620" stroke-width="1.6" opacity="0.55"/>'
            )
        # vùng sáng bên trong
        s.append(f'<ellipse cx="{cx}" cy="{body_cy}" rx="34" ry="46" fill="#ffdf9e" opacity="0.9" filter="url(#blur8)"/>')
        s.append(f'<ellipse cx="{cx-10}" cy="{body_cy-16}" rx="16" ry="22" fill="#fff3d0" opacity="0.8" filter="url(#blur8)"/>')
        # nắp đáy vàng
        s.append(f'<rect x="{cx-30}" y="{body_cy+68}" width="60" height="12" rx="5" fill="url(#goldStroke)"/>')
        s.append(f'<rect x="{cx-20}" y="{body_cy+80}" width="40" height="8" rx="4" fill="#8a5a1d"/>')
        # tua đỏ
        s.append(f"""<g stroke="#d9494f" stroke-width="3.4" stroke-linecap="round">
          <line x1="{cx-12}" y1="{body_cy+88}" x2="{cx-15}" y2="{body_cy+136}"/>
          <line x1="{cx}" y1="{body_cy+88}" x2="{cx}" y2="{body_cy+140}"/>
          <line x1="{cx+12}" y1="{body_cy+88}" x2="{cx+15}" y2="{body_cy+136}"/>
        </g>
        <circle cx="{cx}" cy="{body_cy+146}" r="6" fill="#e8bc63"/>""")
        return "".join(s)

    g.append(lantern(150, 250))
    g.append(lantern(930, 250))

    # =============================== TƯỢNG TÔNG CHỦ THANH VÂN (kim thân) ====
    # Vòng hào quang tĩnh (CSS sẽ xoay lớp ray động quanh tâm 540,260)
    g.append("""<g opacity="0.9">
      <circle cx="540" cy="270" r="196" fill="none" stroke="url(#goldStroke)" stroke-width="4" opacity="0.6"/>
      <circle cx="540" cy="270" r="226" fill="none" stroke="url(#goldStroke)" stroke-width="1.6" opacity="0.4" stroke-dasharray="4 10"/>
      <circle cx="540" cy="270" r="150" fill="url(#lanternGlow)" opacity="0.5" filter="url(#blur16)"/>
    </g>""")

    # Thân - áo bào ngọc trắnggold
    g.append("""<g>
      <ellipse cx="540" cy="700" rx="270" ry="60" fill="#0a1428" opacity="0.55" filter="url(#blur16)"/>
      <path d="M540 330 C 452 330 420 400 408 470 C 396 545 380 615 372 668 L708 668 C 700 615 684 545 672 470 C 660 400 628 330 540 330 Z" fill="url(#statueRobe)"/>
      <path d="M540 336 C 500 336 470 372 466 428 C 462 500 470 590 476 668 L604 668 C 610 590 618 500 614 428 C 610 372 580 336 540 336 Z" fill="#efe4c8"/>
      <path d="M476 470 Q 540 452 604 470 L 600 512 Q 540 494 480 512 Z" fill="url(#goldStroke)" opacity="0.8"/>
      <path d="M466 560 Q 540 540 614 560 L 611 592 Q 540 572 469 592 Z" fill="url(#goldStroke)" opacity="0.6"/>
      <path d="M408 470 C 380 545 372 615 372 668 L 470 668 C 466 590 460 520 470 452 Z" fill="#cabf9d" opacity="0.8"/>
      <path d="M672 470 C 700 545 708 615 708 668 L 610 668 C 614 590 620 520 610 452 Z" fill="#cabf9d" opacity="0.8"/>
    </g>""")

    # Tay kết ấn giữ đài sen (tâm 540,502 — khớp lotus-hand-halo)
    g.append("""<g>
      <ellipse cx="540" cy="505" rx="86" ry="30" fill="#e2c78e"/>
      <ellipse cx="540" cy="498" rx="60" ry="20" fill="#f4e3b2"/>
      <circle cx="540" cy="500" r="64" fill="url(#daoOrb)" opacity="0.95"/>
      <circle cx="540" cy="500" r="110" fill="url(#daoOrb)" opacity="0.4" filter="url(#blur16)"/>
      <path d="M508 476 Q 540 462 572 476 Q 540 492 508 476 Z" fill="#fff6d8" opacity="0.9"/>
      <path d="M500 502 Q 540 520 580 502 Q 540 538 500 502 Z" fill="#ffe9a8" opacity="0.85"/>
    </g>""")

    # Đầu - mặt tĩnh lặng nhắm mắt, tóc áo trùm chỉ còn khuôn mặt
    g.append("""<g>
      <ellipse cx="540" cy="262" rx="80" ry="94" fill="url(#statueSkin)"/>
      <path d="M458 268 C 456 200 490 160 540 160 C 590 160 624 200 622 268
               C 612 230 588 214 540 214 C 492 214 468 230 458 268 Z" fill="#33220d"/>
      <path d="M470 238 Q 500 224 520 236" fill="none" stroke="#33220d" stroke-width="5" stroke-linecap="round"/>
      <path d="M560 236 Q 580 224 610 238" fill="none" stroke="#33220d" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="540" cy="152" rx="30" ry="22" fill="#241708"/>
      <ellipse cx="540" cy="144" rx="30" ry="11" fill="#3d2a10"/>
      <rect x="556" y="138" width="56" height="7" rx="3.5" transform="rotate(10 556 138)" fill="#3fae94"/>
      <circle cx="610" cy="147" r="5.5" fill="#8fe8d8"/>
      <ellipse cx="458" cy="278" rx="12" ry="18" fill="#d9a54e"/>
      <ellipse cx="622" cy="278" rx="12" ry="18" fill="#d9a54e"/>
      <path d="M482 256 Q 502 246 520 254" fill="none" stroke="#6b4a1d" stroke-width="3" stroke-linecap="round"/>
      <path d="M560 254 Q 578 246 598 256" fill="none" stroke="#6b4a1d" stroke-width="3" stroke-linecap="round"/>
      <path d="M488 280 Q 504 292 522 282" fill="none" stroke="#5a3a12" stroke-width="4" stroke-linecap="round"/>
      <path d="M558 282 Q 576 292 592 280" fill="none" stroke="#5a3a12" stroke-width="4" stroke-linecap="round"/>
      <path d="M534 272 Q 529 296 536 304 Q 540 309 545 304 Q 551 296 546 272" fill="none" stroke="#a5762f" stroke-width="3" stroke-linecap="round"/>
      <path d="M524 328 Q 540 338 556 328" fill="none" stroke="#8a5a1d" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="494" cy="306" rx="9" ry="5" fill="#c99040" opacity="0.3"/>
      <ellipse cx="586" cy="306" rx="9" ry="5" fill="#c99040" opacity="0.3"/>
    </g>""")
    # râu dài bắt đầu dưới cằm, không che miệng
    g.append("""<path d="M508 344 Q 498 430 512 470 Q 540 486 568 470 Q 582 430 572 344 Q 556 362 540 362 Q 524 362 508 344 Z" fill="#e8d9b0" opacity="0.95"/>""")
    g.append("""<path d="M520 352 Q 514 424 526 456 Q 540 466 554 456 Q 566 424 560 352 Q 550 368 540 368 Q 530 368 520 352 Z" fill="#f6ecd2" opacity="0.75"/>""")

    # Toà sen ngọc dưới tượng
    g.append("""<g>
      <ellipse cx="540" cy="672" rx="300" ry="58" fill="url(#jadeStone)"/>
      <ellipse cx="540" cy="660" rx="300" ry="54" fill="#48786c"/>
      <path d="M300 662 Q 340 610 380 662 Q 420 610 460 662 Q 500 610 540 662 Q 580 610 620 662 Q 660 610 700 662 Q 740 610 780 662 L 780 690 L 300 690 Z" fill="#548c7c"/>
      <path d="M300 662 Q 340 610 380 662 Q 420 610 460 662 Q 500 610 540 662 Q 580 610 620 662 Q 660 610 700 662 Q 740 610 780 662" fill="none" stroke="url(#goldStroke)" stroke-width="3" opacity="0.9"/>
      <rect x="292" y="688" width="496" height="30" rx="10" fill="url(#jadeStone)" stroke="url(#goldStroke)" stroke-opacity="0.7" stroke-width="2"/>
    </g>""")

    # =============================== BÀN THỜ + PHẨM VẬT ======================
    g.append("""<g>
      <rect x="150" y="726" width="780" height="40" rx="8" fill="#5c2018"/>
      <rect x="150" y="726" width="780" height="10" rx="5" fill="url(#goldStroke)" opacity="0.9"/>
      <rect x="170" y="766" width="740" height="140" fill="url(#redLacquer)"/>
      <rect x="170" y="766" width="740" height="140" fill="none" stroke="#3a0d10" stroke-width="3"/>
      """ + gold_cloud_band(800, 200, 890, scale=0.8, opacity=0.8) + """
      """ + gold_cloud_band(876, 200, 890, scale=0.8, opacity=0.7) + """
      <circle cx="540" cy="836" r="34" fill="none" stroke="url(#goldStroke)" stroke-width="3"/>
      <circle cx="540" cy="836" r="22" fill="none" stroke="url(#goldStroke)" stroke-width="1.6" stroke-dasharray="5 6"/>
      <rect x="196" y="906" width="52" height="34" fill="#3a0f12"/>
      <rect x="832" y="906" width="52" height="34" fill="#3a0f12"/>
      <rect x="170" y="936" width="740" height="14" rx="6" fill="#2c090c"/>
    </g>""")

    # đèn lưu ly hai bên bàn thờ (quả đèn ngọc phát quang xanh)
    def spirit_lamp(cx, base_y):
        return f"""<g>
          <rect x="{cx-10}" y="{base_y-26}" width="20" height="10" rx="3" fill="url(#goldStroke)"/>
          <rect x="{cx-16}" y="{base_y-16}" width="32" height="8" rx="4" fill="url(#bronze)"/>
          <circle cx="{cx}" cy="{base_y-64}" r="52" fill="url(#cyanGlow)" filter="url(#blur8)"/>
          <path d="M{cx-18} {base_y-30} Q{cx-22} {base_y-52} {cx} {base_y-58} Q{cx+22} {base_y-52} {cx+18} {base_y-30} Q{cx} {base_y-20} {cx-18} {base_y-30} Z" fill="#9fe8e0" opacity="0.95"/>
          <ellipse cx="{cx}" cy="{base_y-42}" rx="10" ry="16" fill="#e8fffc"/>
          <path d="M{cx-10} {base_y-60} Q{cx} {base_y-74} {cx+10} {base_y-60}" fill="none" stroke="#7fd8c8" stroke-width="3"/>
        </g>"""

    g.append(spirit_lamp(330, 730))
    g.append(spirit_lamp(750, 730))

    # lễ vật: linh thạch hai bên
    g.append("""<g>
      <rect x="222" y="708" width="64" height="18" rx="6" fill="url(#bronze)"/>
      <path d="M228 708 L 240 676 L 262 690 L 280 672 L 280 708 Z" fill="#7fe0c8" opacity="0.9"/>
      <path d="M236 704 L 246 684 L 258 696 L 270 682 L 270 704 Z" fill="#b8f4ec" opacity="0.9"/>
      <circle cx="252" cy="662" r="26" fill="url(#cyanGlow)" opacity="0.7" filter="url(#blur8)"/>
    </g>""")
    g.append("""<g>
      <rect x="794" y="708" width="64" height="18" rx="6" fill="url(#bronze)"/>
      <path d="M800 708 L 812 678 L 834 692 L 852 674 L 852 708 Z" fill="#7fe0c8" opacity="0.9"/>
      <path d="M808 704 L 818 686 L 830 698 L 842 684 L 842 704 Z" fill="#b8f4ec" opacity="0.9"/>
      <circle cx="818" cy="662" r="26" fill="url(#cyanGlow)" opacity="0.7" filter="url(#blur8)"/>
    </g>""")

    # chuông đồng trái (khớp pill Thỉnh Chuông) + mõ gỗ phải
    g.append("""<g>
      <rect x="30" y="742" width="16" height="260" fill="url(#woodDark)"/>
      <rect x="126" y="742" width="16" height="260" fill="url(#woodDark)"/>
      <rect x="22" y="734" width="128" height="16" rx="6" fill="url(#goldStroke)" opacity="0.85"/>
      <rect x="22" y="994" width="128" height="12" rx="5" fill="url(#woodDark)"/>
      <line x1="85" y1="750" x2="85" y2="786" stroke="#3a2f1a" stroke-width="5"/>
      <path d="M42 786 Q 42 780 85 780 Q 128 780 128 786 L 122 922 Q 122 948 85 948 Q 48 948 48 922 Z" fill="url(#bronze)"/>
      <ellipse cx="85" cy="784" rx="43" ry="9" fill="#8a7040"/>
      <rect x="46" y="838" width="78" height="12" rx="6" fill="url(#goldStroke)" opacity="0.8"/>
      <path d="M56 890 Q 85 904 114 890" fill="none" stroke="url(#goldStroke)" stroke-width="2.4" opacity="0.7"/>
    </g>""")
    g.append("""<g>
      <rect x="936" y="878" width="96" height="16" rx="8" fill="url(#redLacquer)"/>
      <rect x="948" y="894" width="14" height="74" fill="url(#woodDark)"/>
      <rect x="1006" y="894" width="14" height="74" fill="url(#woodDark)"/>
      <ellipse cx="988" cy="852" rx="52" ry="30" fill="#4a2f1e"/>
      <ellipse cx="988" cy="846" rx="52" ry="26" fill="#5f3d26"/>
      <ellipse cx="988" cy="846" rx="30" ry="14" fill="#2b1a10"/>
      <path d="M948 834 Q 988 808 1028 834" fill="none" stroke="#c9a24f" stroke-width="2.4" opacity="0.6"/>
      <rect x="1020" y="816" width="8" height="34" rx="4" transform="rotate(18 1020 816)" fill="#8a5a2d"/>
    </g>""")

    # ================================= LƯ HƯƠNG ĐỈNH ĐỒNG TRUNG TÂM ==========
    # miệng lư tại y≈905 (khớp sticks JS: đáy y=910)
    g.append("""<g>
      <ellipse cx="540" cy="1032" rx="120" ry="22" fill="#0a1428" opacity="0.5" filter="url(#blur8)"/>
      <rect x="470" y="986" width="140" height="40" rx="10" fill="url(#jadeStone)" stroke="url(#goldStroke)" stroke-opacity="0.6" stroke-width="2"/>
      <path d="M468 906 Q 468 892 492 892 L 588 892 Q 612 892 612 906 L 604 972 Q 600 990 540 990 Q 480 990 476 972 Z" fill="url(#bronze)"/>
      <ellipse cx="540" cy="906" rx="72" ry="16" fill="#1d1710"/>
      <ellipse cx="540" cy="903" rx="72" ry="14" fill="#3d2f16"/>
      <path d="M468 908 Q 448 900 444 884" fill="none" stroke="#6b5a35" stroke-width="10" stroke-linecap="round"/>
      <path d="M612 908 Q 632 900 636 884" fill="none" stroke="#6b5a35" stroke-width="10" stroke-linecap="round"/>
      <rect x="528" y="868" width="24" height="30" rx="8" fill="url(#bronze)"/>
      <circle cx="540" cy="862" r="12" fill="url(#goldStroke)"/>
      <path d="M476 936 Q 540 956 604 936" fill="none" stroke="url(#goldStroke)" stroke-width="3" opacity="0.65"/>
      <circle cx="500" cy="950" r="5" fill="url(#goldStroke)" opacity="0.7"/>
      <circle cx="580" cy="950" r="5" fill="url(#goldStroke)" opacity="0.7"/>
      <path d="M516 896 Q 524 860 508 830 Q 494 806 512 780" fill="none" stroke="#cfd8e8" stroke-width="7" stroke-linecap="round" opacity="0.28" filter="url(#blur8)"/>
      <path d="M548 896 Q 556 856 540 822 Q 528 796 544 768" fill="none" stroke="#cfd8e8" stroke-width="8" stroke-linecap="round" opacity="0.32" filter="url(#blur8)"/>
      <path d="M578 898 Q 586 866 572 840 Q 562 818 576 796" fill="none" stroke="#cfd8e8" stroke-width="6" stroke-linecap="round" opacity="0.24" filter="url(#blur8)"/>
    </g>""")

    # =============================== BỘC BẬC + ĐỆM QUỲ VIP ===================
    for i, (top, x0, x1) in enumerate([(1040, 200, 880), (1102, 156, 924), (1164, 112, 968)]):
        h = 64 if i < 2 else 96
        g.append(
            f'<rect x="{x0}" y="{top}" width="{x1-x0}" height="{h}" fill="url(#jadeStone)" stroke="#0e1e1c" stroke-width="2"/>'
        )
        g.append(f'<rect x="{x0}" y="{top}" width="{x1-x0}" height="8" fill="#5d9484" opacity="0.8"/>')
        g.append(f'<rect x="{x0}" y="{top+10}" width="{x1-x0}" height="3" fill="url(#goldStroke)" opacity="0.4"/>')

    # mặt bục gỗ rộng nhất (chân VIP đứng y=1188) — rộng đủ chứa đệm mép
    g.append("""<g>
      <rect x="80" y="1164" width="920" height="46" fill="#4a3220"/>
      <rect x="80" y="1164" width="920" height="10" fill="#6b4a2e"/>
      <rect x="80" y="1174" width="920" height="4" fill="url(#goldStroke)" opacity="0.5"/>
      <rect x="80" y="1210" width="920" height="52" fill="url(#redLacquer)"/>
      """ + gold_cloud_band(1226, 130, 970, scale=0.75, opacity=0.75) + """
      <rect x="80" y="1258" width="920" height="10" rx="4" fill="#2c090c"/>
    </g>""")

    # 6 đệm quỳ gấm đỏ — TÂM X khớp VIP_CUSHION_COORDS, mặt đệm y≈1188
    def cushion(cx):
        return f"""<g>
          <ellipse cx="{cx}" cy="1216" rx="56" ry="18" fill="#6b1620"/>
          <ellipse cx="{cx}" cy="1208" rx="56" ry="18" fill="url(#redLacquer)"/>
          <ellipse cx="{cx}" cy="1206" rx="40" ry="11" fill="#a93240"/>
          <ellipse cx="{cx}" cy="1206" rx="40" ry="11" fill="none" stroke="url(#goldStroke)" stroke-width="1.6" opacity="0.8"/>
          <circle cx="{cx}" cy="1206" r="4.5" fill="url(#goldStroke)" opacity="0.9"/>
          <ellipse cx="{cx}" cy="1196" rx="46" ry="12" fill="#8a2330"/>
          <ellipse cx="{cx}" cy="1194" rx="46" ry="11" fill="#a93240"/>
        </g>"""

    for cx in (140, 268, 392, 688, 812, 940):
        g.append(cushion(cx))

    # =============================== SÀN + THẢM ĐỎ ==========================
    g.append(f"""<rect x="0" y="1268" width="{W}" height="{H-1268}" fill="url(#floorWood)"/>""")
    for yy in range(1290, 1920, 74):
        g.append(f'<rect x="0" y="{yy}" width="{W}" height="2.4" fill="#0d0704" opacity="0.7"/>')
    g.append('<ellipse cx="380" cy="1480" rx="300" ry="120" fill="#8a6a3a" opacity="0.06" filter="url(#blur30)"/>')
    g.append('<ellipse cx="760" cy="1620" rx="300" ry="120" fill="#8a6a3a" opacity="0.05" filter="url(#blur30)"/>')

    # thảm đỏ hình thang: mép trên (320..760) tại y1300 -> mép dưới (262..818) y1920
    g.append('<path d="M320 1300 L760 1300 L818 1920 L262 1920 Z" fill="url(#carpet)"/>')
    g.append('<path d="M320 1300 L760 1300 L818 1920 L262 1920 Z" fill="none" stroke="url(#carpetEdge)" stroke-width="10"/>')
    g.append('<path d="M338 1318 L742 1318 L796 1912 L284 1912 Z" fill="none" stroke="url(#carpetEdge)" stroke-width="3.4" opacity="0.9"/>')
    # bóng đổ hai mép thảm cho có chiều sâu
    g.append('<path d="M320 1300 L352 1300 L306 1920 L262 1920 Z" fill="#3f0d16" opacity="0.55"/>')
    g.append('<path d="M728 1300 L760 1300 L818 1920 L774 1920 Z" fill="#3f0d16" opacity="0.55"/>')
    # hàng hoạ tiết mây/diamond to dần theo chiều sâu — 5 cột
    rows = [(1348, 0.55), (1420, 0.66), (1492, 0.78), (1576, 0.92), (1672, 1.08), (1782, 1.26), (1892, 1.44)]
    for y, s in rows:
        t = (y - 1300) / 620.0
        left = 320 + (262 - 320) * t + 52
        right = 760 + (818 - 760) * t - 52
        mid = (left + right) / 2
        spread = (right - left) / 2
        for frac in (-0.8, -0.4, 0.0, 0.4, 0.8):
            cx = mid + spread * frac
            g.append(
                f'<g transform="translate({cx:.0f},{y}) scale({s})" opacity="0.75">'
                '<path d="M0 -24 L 18 0 L 0 24 L -18 0 Z" fill="none" stroke="url(#carpetEdge)" stroke-width="3"/>'
                '<circle r="6.5" fill="none" stroke="url(#carpetEdge)" stroke-width="2.2"/>'
                "</g>"
            )
    # medallion sen lớn ở cột giữa
    for y, s in [(1456, 0.85), (1624, 1.05), (1836, 1.3)]:
        t = (y - 1300) / 620.0
        mid = 540 + 20 * t
        g.append(
            f'<g transform="translate({mid:.0f},{y}) scale({s})" opacity="0.9">'
            '<path d="M0 -46 Q 32 -22 0 2 Q -32 -22 0 -46 Z" fill="none" stroke="url(#carpetEdge)" stroke-width="3"/>'
            '<path d="M0 46 Q 32 22 0 -2 Q -32 22 0 46 Z" fill="none" stroke="url(#carpetEdge)" stroke-width="3"/>'
            '<circle r="9" fill="url(#carpetEdge)" opacity="0.85"/>'
            "</g>"
        )

    # ánh sáng lan từ lư hương xuống thảm
    g.append('<ellipse cx="540" cy="1120" rx="330" ry="90" fill="url(#lanternGlow)" opacity="0.25" filter="url(#blur30)"/>')
    # làn khói mỏng quanh bàn thờ
    g.append('<ellipse cx="540" cy="760" rx="150" ry="60" fill="url(#mist)" opacity="0.25" filter="url(#blur16)"/>')

    # ==================================================================== vignette
    g.append(f'<rect width="{W}" height="{H}" fill="url(#vignette)"/>')
    g.append("</svg>")
    return "".join(g)


# ===========================================================================
# SPRITES — Đệ tử Thanh Vân Tông (nhìn từ LƯNG, áo bào xanh ngọc, búi tóc
# trâm ngọc, đai lụa trắng). Tỷ lệ canvas 2x so với repo gốc để nét trên 1080p:
#   walk: 200x480 (gốc 100x240) | còn lại: 278x380 (gốc 139x190)
# Rim light đặt TRƯỚC thân (backlight), bóng ellipse bake sẵn đáy canvas.
# ===========================================================================

SPRITE_DEFS = """<defs>
  <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a7c6e"/><stop offset="0.55" stop-color="#26584d"/>
    <stop offset="1" stop-color="#173831"/>
  </linearGradient>
  <linearGradient id="sleeve" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#417a6a"/><stop offset="1" stop-color="#20443c"/>
  </linearGradient>
  <linearGradient id="sash" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f2ead2"/><stop offset="1" stop-color="#cbbc96"/>
  </linearGradient>
  <linearGradient id="trousers" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2c4f45"/><stop offset="1" stop-color="#1a332c"/>
  </linearGradient>
  <radialGradient id="rimWarm" cx="0.72" cy="0.2" r="0.75">
    <stop offset="0" stop-color="#ffdf9e" stop-opacity="0.4"/>
    <stop offset="0.55" stop-color="#ffdf9e" stop-opacity="0.1"/>
    <stop offset="1" stop-color="#ffdf9e" stop-opacity="0"/>
  </radialGradient>
  <filter id="sb2"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="sb4"><feGaussianBlur stdDeviation="4"/></filter>
</defs>"""


def sprite_shadow(cx, cy, rx, ry=12):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#060a14" opacity="0.42" filter="url(#sb4)"/>'


def head_bun(cx, cy, r=30, pin=True):
    """Đầu nhìn từ lưng: tóc đen + búi + trâm ngọc."""
    s = []
    s.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r*1.06:.0f}" fill="#171310"/>')
    s.append(
        f'<path d="M{cx-r*0.9:.0f} {cy-r*0.2:.0f} Q {cx-r*0.55:.0f} {cy-r*1.25:.0f} {cx} {cy-r*1.18:.0f} '
        f'Q {cx+r*0.55:.0f} {cy-r*1.25:.0f} {cx+r*0.9:.0f} {cy-r*0.2:.0f} Q {cx+r*0.4:.0f} {cy+r*0.62:.0f} {cx} {cy+r*0.6:.0f} '
        f'Q {cx-r*0.4:.0f} {cy+r*0.62:.0f} {cx-r*0.9:.0f} {cy-r*0.2:.0f} Z" fill="#231c15"/>'
    )
    s.append(
        f'<path d="M{cx-r*0.7:.0f} {cy-r*0.55:.0f} Q {cx-r*0.2:.0f} {cy-r*1.05:.0f} {cx+r*0.5:.0f} {cy-r*0.5:.0f}" '
        'fill="none" stroke="#4a3b2c" stroke-width="2" opacity="0.55"/>'
    )
    s.append(f'<ellipse cx="{cx}" cy="{cy-r*1.28:.0f}" rx="{r*0.42:.0f}" ry="{r*0.36:.0f}" fill="#1d1712"/>')
    s.append(
        f'<ellipse cx="{cx-r*0.12:.0f}" cy="{cy-r*1.38:.0f}" rx="{r*0.2:.0f}" ry="{r*0.12:.0f}" fill="#453723" opacity="0.8"/>'
    )
    if pin:
        px = cx + r * 0.5
        py = cy - r * 1.26
        s.append(
            f'<rect x="{px:.0f}" y="{py:.0f}" width="{r*1.1:.0f}" height="5" rx="2.5" '
            f'transform="rotate(12 {px:.0f} {py:.0f})" fill="#3fae94"/>'
        )
        s.append(f'<circle cx="{px + r*1.02:.0f}" cy="{py - r*0.16:.0f}" r="3.4" fill="#8fe8d8"/>')
    # cổ áo lộ sau gáy
    s.append(f'<path d="M{cx-r*0.5:.0f} {cy+r*0.95:.0f} L {cx} {cy+r*1.28:.0f} L {cx+r*0.5:.0f} {cy+r*0.95:.0f}" '
             'fill="none" stroke="#e8e0c8" stroke-width="5" stroke-linejoin="round"/>')
    return "".join(s)


def sash_knot(cx, cy):
    """Nơ đai lụa sau lưng + hai dải buông."""
    return f"""<g>
      <circle cx="{cx}" cy="{cy}" r="8" fill="url(#sash)"/>
      <circle cx="{cx}" cy="{cy}" r="8" fill="none" stroke="#a4977a" stroke-width="1.2"/>
      <path d="M{cx-3} {cy+6} Q {cx-10} {cy+36} {cx-4} {cy+58}" fill="none" stroke="url(#sash)" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M{cx+3} {cy+6} Q {cx+10} {cy+34} {cx+5} {cy+54}" fill="none" stroke="url(#sash)" stroke-width="6.5" stroke-linecap="round"/>
    </g>"""


# ---------------------------------------------------------------------------
# Pose: ĐI BỘ (canvas 200x480)
# ---------------------------------------------------------------------------

def sprite_walk(direction=1):
    W, H = 200, 480
    cx = 100
    flip = -1 if direction < 0 else 1
    g = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">', SPRITE_DEFS]
    g.append(sprite_shadow(cx, 458, 62, 12))
    # hào quang viền sau lưng (trước thân)
    g.append(f'<ellipse cx="{cx+30}" cy="250" rx="64" ry="170" fill="url(#rimWarm)" filter="url(#sb4)"/>')
    # chân sau lộ dưới vạt
    back_x = cx + flip * 26
    front_x = cx - flip * 20
    g.append(f"""<g>
      <path d="M{back_x-16} 396 L{back_x+14} 396 L{back_x+10} 446 L{back_x-12} 446 Z" fill="url(#trousers)"/>
      <ellipse cx="{back_x-2}" cy="452" rx="17" ry="8" fill="#241a12"/>
      <ellipse cx="{front_x}" cy="430" rx="14" ry="7" fill="#241a12" opacity="0.85"/>
    </g>""")
    # áo bào dài vạt xoát theo hướng đi
    g.append(f"""<g>
      <path d="M{cx-52} 158
               C {cx-62} 220 {cx-58} 300 {cx-40-flip*6} 368
               C {cx-30-flip*8} 398 {cx-14-flip*10} 416 {cx+2-flip*12} 424
               L {cx+38-flip*6} 424
               C {cx+52-flip*2} 400 {cx+60} 340 {cx+58} 268
               C {cx+56} 210 {cx+50} 178 {cx+44} 158 Z" fill="url(#robe)"/>
      <path d="M{cx-52} 158 C {cx-62} 220 {cx-58} 300 {cx-40-flip*6} 368" fill="none" stroke="#122b25" stroke-width="3" opacity="0.7"/>
      <path d="M{cx+58} 268 C {cx+60} 340 {cx+52-flip*2} 400 {cx+38-flip*6} 424" fill="none" stroke="#0f2a24" stroke-width="3" opacity="0.6"/>
      <path d="M{cx-10} 300 C {cx-12} 340 {cx-16} 380 {cx-24} 412" fill="none" stroke="#122b25" stroke-width="2.4" opacity="0.5"/>
      <path d="M{cx+16} 300 C {cx+18} 340 {cx+20} 380 {cx+16} 416" fill="none" stroke="#122b25" stroke-width="2.4" opacity="0.5"/>
    </g>""")
    # tay: ống tay rộng vung theo bước, đầu cuff chụm (không lộ bàn tay)
    g.append(f"""<g>
      <path d="M{cx-50} 170
               C {cx-76} 202 {cx-86-flip*12} 252 {cx-80-flip*16} 296
               C {cx-78-flip*14} 312 {cx-64-flip*12} 316 {cx-56-flip*10} 306
               C {cx-60-flip*12} 260 {cx-56} 214 {cx-42} 184 Z" fill="url(#sleeve)"/>
      <path d="M{cx-80-flip*16} 296 C {cx-78-flip*14} 312 {cx-64-flip*12} 316 {cx-56-flip*10} 306"
            fill="none" stroke="#122b25" stroke-width="2.6" opacity="0.7"/>
      <path d="M{cx+48} 168
               C {cx+68} 198 {cx+74+flip*8} 244 {cx+70+flip*14} 288
               C {cx+66+flip*12} 304 {cx+52+flip*10} 306 {cx+46+flip*8} 296
               C {cx+52+flip*10} 252 {cx+52} 208 {cx+40} 180 Z" fill="url(#sleeve)"/>
      <path d="M{cx+70+flip*14} 288 C {cx+66+flip*12} 304 {cx+52+flip*10} 306 {cx+46+flip*8} 296"
            fill="none" stroke="#122b25" stroke-width="2.6" opacity="0.7"/>
    </g>""")
    g.append(sash_knot(cx, 214))
    # cổ + đầu
    g.append(f'<path d="M{cx-22} 152 L{cx+22} 152 L{cx+18} 170 L{cx-18} 170 Z" fill="#2c5a4e"/>')
    g.append(head_bun(cx, 116, 30))
    g.append("</svg>")
    return "".join(g)


# ---------------------------------------------------------------------------
# Pose: QUỲ (canvas 278x380) — tay khoanh trong áo, chỉ thấy nếp áo hai bên
# ---------------------------------------------------------------------------

def sprite_kneel(lower=0.0):
    W, H = 278, 380
    cx = 139
    drop = lower * 34
    pool = 78 + lower * 14
    top_y = 66 + drop
    g = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">', SPRITE_DEFS]
    g.append(sprite_shadow(cx, 366, pool - 4, 12))
    g.append(f'<ellipse cx="{cx+30}" cy="200" rx="60" ry="130" fill="url(#rimWarm)" filter="url(#sb4)"/>')
    base_y = 356
    # vạt áo pooling quanh chân quỳ
    g.append(f"""<g>
      <path d="M{cx-pool} {base_y}
               C {cx-pool-8} {base_y-46} {cx-pool+6} {base_y-70} {cx-pool+26} {base_y-74}
               L {cx+pool-26} {base_y-74}
               C {cx+pool-6} {base_y-70} {cx+pool+8} {base_y-46} {cx+pool} {base_y} Z" fill="url(#robe)"/>
      <path d="M{cx-pool} {base_y} C {cx-pool-8} {base_y-46} {cx-pool+6} {base_y-70} {cx-pool+26} {base_y-74}
              L {cx-pool+40} {base_y-74} C {cx-pool+22} {base_y-58} {cx-pool+16} {base_y-30} {cx-pool+18} {base_y} Z" fill="#122b25" opacity="0.75"/>
      <path d="M{cx+pool-40} {base_y-74} C {cx+pool-22} {base_y-58} {cx+pool-16} {base_y-30} {cx+pool-18} {base_y} L {cx+pool} {base_y} C {cx+pool+8} {base_y-46} {cx+pool-6} {base_y-70} {cx+pool-26} {base_y-74} Z" fill="#122b25" opacity="0.5"/>
    </g>""")
    ty = top_y + 66
    # thân
    g.append(f"""<g>
      <path d="M{cx-46} {top_y+58}
               C {cx-58} {ty+30} {cx-60} {ty+90} {cx-50} {base_y-72}
               L {cx+50} {base_y-72}
               C {cx+60} {ty+90} {cx+58} {ty+30} {cx+46} {top_y+58} Z" fill="url(#robe)"/>
      <path d="M{cx-46} {top_y+58} C {cx-58} {ty+30} {cx-60} {ty+90} {cx-50} {base_y-72}" fill="none" stroke="#122b25" stroke-width="3" opacity="0.7"/>
      <path d="M{cx+46} {top_y+58} C {cx+58} {ty+30} {cx+60} {ty+90} {cx+50} {base_y-72}" fill="none" stroke="#0f2a24" stroke-width="3" opacity="0.6"/>
      <path d="M{cx-46} {top_y+58} C {cx-40} {ty+60} {cx-38} {ty+120} {cx-42} {base_y-72} L {cx-18} {base_y-72} C {cx-16} {ty+110} {cx-18} {ty+50} {cx-20} {top_y+62} Z" fill="#122b25" opacity="0.45"/>
      <path d="M{cx-48} {ty+34} C {cx-54} {ty+60} {cx-52} {ty+86} {cx-44} {base_y-84}" fill="none" stroke="#16352e" stroke-width="4" opacity="0.55" stroke-linecap="round"/>
      <path d="M{cx+48} {ty+34} C {cx+54} {ty+60} {cx+52} {ty+86} {cx+44} {base_y-84}" fill="none" stroke="#16352e" stroke-width="4" opacity="0.55" stroke-linecap="round"/>
    </g>""")
    g.append(sash_knot(cx, ty + 18))
    g.append(f'<path d="M{cx-18} {top_y+52} L{cx+18} {top_y+52} L{cx+15} {top_y+70} L{cx-15} {top_y+70} Z" fill="#2c5a4e"/>')
    g.append(head_bun(cx, top_y + 22, 27))
    g.append("</svg>")
    return "".join(g)


# ---------------------------------------------------------------------------
# Pose: CÚI NGƯỜI (canvas 278x380) — bowMid cúi ~45°, bow sấp sâu
# hai bàn tay chống đất trước mặt
# ---------------------------------------------------------------------------

def sprite_bow(depth):
    W, H = 278, 380
    cx = 139
    g = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">', SPRITE_DEFS]
    g.append(sprite_shadow(cx, 366, 86, 12))
    base_y = 356
    g.append(f'<ellipse cx="{cx+34}" cy="220" rx="62" ry="120" fill="url(#rimWarm)" filter="url(#sb4)"/>')
    if depth < 0.5:
        hump_y = 128
        head_y = 196
        g.append(f"""<g>
          <path d="M{cx-80} {base_y}
                   C {cx-88} {base_y-44} {cx-74} {base_y-72} {cx-52} {base_y-76}
                   L {cx+52} {base_y-76}
                   C {cx+74} {base_y-72} {cx+88} {base_y-44} {cx+80} {base_y} Z" fill="url(#robe)"/>
          <path d="M{cx-56} {base_y-72}
                   C {cx-84} {base_y-108} {cx-70} {hump_y+40} {cx-20} {hump_y}
                   C {cx+26} {hump_y-12} {cx+58} {hump_y+30} {cx+56} {base_y-72} Z" fill="url(#robe)"/>
          <path d="M{cx-20} {hump_y} C {cx+26} {hump_y-12} {cx+58} {hump_y+30} {cx+56} {base_y-72}" fill="none" stroke="#0f2a24" stroke-width="3" opacity="0.6"/>
          <path d="M{cx-56} {base_y-72} C {cx-84} {base_y-108} {cx-70} {hump_y+40} {cx-20} {hump_y}" fill="none" stroke="#122b25" stroke-width="3" opacity="0.7"/>
        </g>""")
        # hai ống tay duỗi từ vai xuống đất, bàn tay úp đất
        g.append(f"""<g>
          <path d="M{cx-34} {hump_y+10}
                   C {cx-56} {hump_y+30} {cx-66} {hump_y+90} {cx-60} {base_y-26}
                   C {cx-58} {base_y-10} {cx-44} {base_y-10} {cx-40} {base_y-24}
                   C {cx-40} {hump_y+80} {cx-34} {hump_y+30} {cx-24} {hump_y+14} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx-50}" cy="{base_y-12}" rx="15" ry="8" fill="#e8d8b8"/>
          <path d="M{cx+32} {hump_y+8}
                   C {cx+54} {hump_y+28} {cx+64} {hump_y+88} {cx+58} {base_y-26}
                   C {cx+56} {base_y-10} {cx+42} {base_y-10} {cx+38} {base_y-24}
                   C {cx+38} {hump_y+78} {cx+32} {hump_y+28} {cx+22} {hump_y+12} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx+48}" cy="{base_y-12}" rx="15" ry="8" fill="#e8d8b8"/>
        </g>""")
        g.append(sash_knot(cx - 12, hump_y + 66))
        g.append(head_bun(cx + 2, head_y, 26))
    else:
        hump_y = 108
        g.append(f"""<g>
          <path d="M{cx-84} {base_y}
                   C {cx-92} {base_y-42} {cx-78} {base_y-70} {cx-56} {base_y-74}
                   L {cx+56} {base_y-74}
                   C {cx+78} {base_y-70} {cx+92} {base_y-42} {cx+84} {base_y} Z" fill="url(#robe)"/>
          <path d="M{cx-58} {base_y-70}
                   C {cx-96} {base_y-96} {cx-64} {hump_y+8} {cx-8} {hump_y-6}
                   C {cx+44} {hump_y-16} {cx+70} {hump_y+40} {cx+58} {base_y-70} Z" fill="url(#robe)"/>
          <path d="M{cx-8} {hump_y-6} C {cx+44} {hump_y-16} {cx+70} {hump_y+40} {cx+58} {base_y-70}" fill="none" stroke="#0f2a24" stroke-width="3" opacity="0.6"/>
          <path d="M{cx-58} {base_y-70} C {cx-96} {base_y-96} {cx-64} {hump_y+8} {cx-8} {hump_y-6}" fill="none" stroke="#122b25" stroke-width="3" opacity="0.7"/>
        </g>""")
        g.append(f"""<g>
          <path d="M{cx-16} {hump_y+2}
                   C {cx-44} {hump_y+18} {cx-58} {hump_y+80} {cx-56} {base_y-24}
                   C {cx-56} {base_y-8} {cx-42} {base_y-8} {cx-38} {base_y-22}
                   C {cx-38} {hump_y+72} {cx-28} {hump_y+26} {cx-12} {hump_y+12} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx-46}" cy="{base_y-10}" rx="15" ry="8" fill="#e8d8b8"/>
          <path d="M{cx+14} {hump_y}
                   C {cx+42} {hump_y+16} {cx+56} {hump_y+78} {cx+54} {base_y-24}
                   C {cx+54} {base_y-8} {cx+40} {base_y-8} {cx+36} {base_y-22}
                   C {cx+36} {hump_y+70} {cx+28} {hump_y+24} {cx+10} {hump_y+10} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx+44}" cy="{base_y-10}" rx="15" ry="8" fill="#e8d8b8"/>
        </g>""")
        g.append(sash_knot(cx - 8, hump_y + 78))
        g.append(head_bun(cx - 2, hump_y + 34, 25))
    g.append("</svg>")
    return "".join(g)


# ---------------------------------------------------------------------------
# Pose: NẰM SẤP (canvas 278x380)
# ---------------------------------------------------------------------------

def sprite_prostrate(deep=False):
    W, H = 278, 380
    cx = 139
    g = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">', SPRITE_DEFS]
    g.append(sprite_shadow(cx, 366, 92, 12))
    base_y = 358
    if not deep:
        peak_y = 150
        g.append(f'<ellipse cx="{cx+30}" cy="230" rx="62" ry="110" fill="url(#rimWarm)" filter="url(#sb4)"/>')
        g.append(f"""<g>
          <path d="M{cx-86} {base_y}
                   C {cx-94} {base_y-40} {cx-80} {base_y-66} {cx-58} {base_y-70}
                   L {cx+58} {base_y-70}
                   C {cx+80} {base_y-66} {cx+94} {base_y-40} {cx+86} {base_y} Z" fill="url(#robe)"/>
          <path d="M{cx-58} {base_y-66}
                   C {cx-98} {base_y-88} {cx-72} {peak_y+22} {cx-16} {peak_y}
                   C {cx+38} {peak_y-14} {cx+72} {peak_y+34} {cx+58} {base_y-66} Z" fill="url(#robe)"/>
          <path d="M{cx-16} {peak_y} C {cx+38} {peak_y-14} {cx+72} {peak_y+34} {cx+58} {base_y-66}" fill="none" stroke="#0f2a24" stroke-width="3" opacity="0.6"/>
          <path d="M{cx-58} {base_y-66} C {cx-98} {base_y-88} {cx-72} {peak_y+22} {cx-16} {peak_y}" fill="none" stroke="#122b25" stroke-width="3" opacity="0.7"/>
        </g>""")
        # tay gập, bàn tay úp hai bên đầu, cánh tay nối liền vai
        g.append(f"""<g>
          <path d="M{cx-24} {peak_y+6}
                   C {cx-48} {peak_y+10} {cx-64} {peak_y+34} {cx-62} {peak_y+64}
                   C {cx-60} {peak_y+82} {cx-48} {peak_y+86} {cx-42} {peak_y+76}
                   C {cx-40} {peak_y+52} {cx-34} {peak_y+26} {cx-22} {peak_y+16} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx-50}" cy="{peak_y+80}" rx="14" ry="8" fill="#e8d8b8"/>
          <path d="M{cx+22} {peak_y+4}
                   C {cx+46} {peak_y+8} {cx+62} {peak_y+32} {cx+60} {peak_y+62}
                   C {cx+58} {peak_y+80} {cx+46} {peak_y+84} {cx+40} {peak_y+74}
                   C {cx+38} {peak_y+50} {cx+32} {peak_y+24} {cx+20} {peak_y+14} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx+48}" cy="{peak_y+78}" rx="14" ry="8" fill="#e8d8b8"/>
        </g>""")
        g.append(sash_knot(cx - 6, peak_y + 66))
        g.append(head_bun(cx - 4, peak_y + 30, 24))
    else:
        body_top = 216
        g.append(f'<ellipse cx="{cx+30}" cy="260" rx="64" ry="90" fill="url(#rimWarm)" filter="url(#sb4)"/>')
        g.append(f"""<g>
          <path d="M{cx-88} {base_y}
                   C {cx-96} {base_y-36} {cx-84} {base_y-58} {cx-62} {base_y-62}
                   L {cx+60} {base_y-62}
                   C {cx+84} {base_y-58} {cx+96} {base_y-36} {cx+88} {base_y} Z" fill="url(#robe)"/>
          <path d="M{cx-62} {base_y-58}
                   C {cx-92} {base_y-72} {cx-70} {body_top+10} {cx-10} {body_top}
                   C {cx+50} {body_top-8} {cx+76} {body_top+30} {cx+60} {base_y-58} Z" fill="url(#robe)"/>
          <path d="M{cx-10} {body_top} C {cx+50} {body_top-8} {cx+76} {body_top+30} {cx+60} {base_y-58}" fill="none" stroke="#0f2a24" stroke-width="3" opacity="0.55"/>
          <path d="M{cx-62} {base_y-58} C {cx-92} {base_y-72} {cx-70} {body_top+10} {cx-10} {body_top}" fill="none" stroke="#122b25" stroke-width="3" opacity="0.65"/>
        </g>""")
        # hai cánh tay duỗi thẳng ra trước qua đầu, bàn tay úp đất
        g.append(f"""<g>
          <path d="M{cx-10} {body_top+2}
                   C {cx-38} {body_top-6} {cx-68} {body_top+8} {cx-84} {body_top+26}
                   C {cx-94} {body_top+38} {cx-88} {body_top+50} {cx-78} {body_top+48}
                   C {cx-58} {body_top+44} {cx-30} {body_top+32} {cx-12} {body_top+20} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx-86}" cy="{body_top+42}" rx="15" ry="8" fill="#e8d8b8"/>
          <path d="M{cx+8} {body_top}
                   C {cx+36} {body_top-8} {cx+66} {body_top+6} {cx+82} {body_top+24}
                   C {cx+92} {body_top+36} {cx+86} {body_top+48} {cx+76} {body_top+46}
                   C {cx+56} {body_top+42} {cx+28} {body_top+30} {cx+10} {body_top+18} Z" fill="url(#sleeve)"/>
          <ellipse cx="{cx+84}" cy="{body_top+40}" rx="15" ry="8" fill="#e8d8b8"/>
        </g>""")
        g.append(sash_knot(cx - 2, body_top + 52))
        g.append(head_bun(cx - 14, body_top + 26, 23))
    g.append("</svg>")
    return "".join(g)


# ===========================================================================
# MAIN
# ===========================================================================

def main():
    print("Render art Thanh Vân Tông ->", OUT)
    # 1. nền tiên điện
    render("sect_master_stage.png", stage_svg(), 1080, 1920)
    # 2. 8 frame đệ tử (cùng tỷ lệ canvas với repo gốc, scale 2x)
    render("devotee_walk.png", sprite_walk(+1), 200, 480, transparent=True)
    render("devotee_walk_2.png", sprite_walk(-1), 200, 480, transparent=True)
    render("devotee_kneel_down.png", sprite_kneel(lower=1.0), 278, 380, transparent=True)
    render("devotee.png", sprite_kneel(lower=0.0), 278, 380, transparent=True)
    render("devotee_bow_mid.png", sprite_bow(depth=0.0), 278, 380, transparent=True)
    render("devotee_bow.png", sprite_bow(depth=1.0), 278, 380, transparent=True)
    render("devotee_prostrate.png", sprite_prostrate(deep=False), 278, 380, transparent=True)
    render("devotee_prostrate_deep.png", sprite_prostrate(deep=True), 278, 380, transparent=True)
    print("Xong. Đã ghi đè public/assets/*.png")


if __name__ == "__main__":
    main()
