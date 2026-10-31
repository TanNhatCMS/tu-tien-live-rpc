#!/usr/bin/env python3
"""Vẽ lại asset placeholder cho Thanh Vân Tông bằng PIL.

Không dùng ảnh Phật gốc. Art này là placeholder có chủ đích, đủ để chạy
màn hình live mà không vỡ layout; thay bằng art hoàn chỉnh khi có họa sĩ.
Chạy: python3 tools/generate-assets.py  (ghi đè public/assets/*.png)
"""
from PIL import Image, ImageDraw
import pathlib, math

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

def stage():
    W, H = 1080, 1920
    img = Image.new("RGB", (W, H), (8, 20, 38))
    d = ImageDraw.Draw(img, "RGBA")
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(8+20*t), int(20+45*t), int(38+55*t)))
    # stars
    for x, y in [(80,120),(220,220),(400,90),(650,180),(900,110),(300,320),(760,300),(950,420),(150,450)]:
        d.ellipse([x-2,y-2,x+2,y+2], fill=(255,255,220,200))
    # moon + glow
    d.ellipse([790,80,990,280], fill=(255,240,180,60))
    d.ellipse([820,110,960,250], fill=(255,244,190,255))
    # mountain layers
    layers = [(1400,(25,55,80)), (1550,(18,45,68)), (1680,(12,35,55))]
    for base, col in layers:
        pts = [(0,1920)]
        for x in range(0, 1081, 90):
            pts.append((x, base - int(120*math.sin(x/180.0+base))))
        pts.append((1080,1920))
        d.polygon(pts, fill=col+(255,))
    # mist
    for y, a in [(1250,40),(1400,50),(1550,60)]:
        d.ellipse([-50,y,1130,y+90], fill=(200,220,240,a))
    # platform
    d.rectangle([140,1620,940,1700], fill=(45,75,100,255))
    d.rectangle([120,1700,960,1730], fill=(30,55,80,255))
    # pavilion pillars + roof
    for x in (210, 870):
        d.rectangle([x,1380,x+28,1620], fill=(120,60,40,255))
    d.polygon([(150,1380),(930,1380),(840,1280),(240,1280)], fill=(160,50,40,255))
    d.polygon([(130,1400),(950,1400),(930,1380),(150,1380)], fill=(200,80,50,255))
    # lanterns
    for x in (260, 820):
        d.line([(x,1280),(x,1330)], fill=(255,220,120,255), width=3)
        d.ellipse([x-28,1330,x+28,1380], fill=(255,190,60,255))
    # sect master silhouette on platform, centre
    cx = 540
    d.polygon([(cx-90,1620),(cx+90,1620),(cx+60,1450),(cx-60,1450)], fill=(225,235,245,255))
    d.ellipse([cx-38,1380,cx+38,1455], fill=(255,220,180,255))
    d.ellipse([cx-30,1370,cx+30,1400], fill=(30,30,40,255))  # topknot
    d.line([(cx+70,1420),(cx+130,1500)], fill=(180,200,220,255), width=6)  # sword
    img.save(OUT / "sect_master_stage.png")
    print("sect_master_stage.png", img.size)

def disciple(name, lean=0, squash=1.0, flat=False):
    W, H = 400, 520
    im = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(im)
    if flat:
        # prostrate: robe horizontal, head at front
        d.polygon([(60,400),(340,400),(340,460),(60,460)], fill=(225,235,245,255))
        d.ellipse([300,380,360,440], fill=(255,220,180,255))
        d.ellipse([310,370,350,395], fill=(30,30,40,255))
        im.save(OUT / name); print(name); return
    top = int(180 * (1-squash) + 60)
    bottom = 480
    head_cx = 200 + lean
    head_cy = top + 55
    # sword back
    d.line([(head_cx+50, head_cy-10),(head_cx+110, head_cy+80)], fill=(170,195,215,255), width=7)
    # robe
    d.polygon([(head_cx-70, head_cy+70),(head_cx+70, head_cy+70),
               (head_cx+95, bottom),(head_cx-95, bottom)], fill=(225,235,245,255))
    d.polygon([(head_cx-70, head_cy+70),(head_cx+70, head_cy+70),
               (head_cx+30, bottom),(head_cx-30, bottom)], fill=(180,205,230,255))
    # belt
    d.rectangle([head_cx-72, head_cy+210, head_cx+72, head_cy+228], fill=(120,70,40,255))
    # head + topknot
    d.ellipse([head_cx-38, head_cy-38, head_cx+38, head_cy+38], fill=(255,220,180,255))
    d.ellipse([head_cx-18, head_cy-52, head_cx+18, head_cy-22], fill=(30,30,40,255))
    # feet / kneel base
    if squash < 1.0:
        d.ellipse([head_cx-95, bottom-25, head_cx+95, bottom+5], fill=(200,215,230,255))
    im.save(OUT / name)
    print(name)

if __name__ == "__main__":
    stage()
    disciple("devotee.png", lean=0, squash=0.85)          # kneel
    disciple("devotee_walk.png", lean=8, squash=1.0)
    disciple("devotee_walk_2.png", lean=-8, squash=1.0)
    disciple("devotee_kneel_down.png", lean=10, squash=0.65)
    disciple("devotee_bow.png", lean=35, squash=0.75)
    disciple("devotee_bow_mid.png", lean=20, squash=0.80)
    disciple("devotee_prostrate.png", flat=True)
    disciple("devotee_prostrate_deep.png", flat=True)
