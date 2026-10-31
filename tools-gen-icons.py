"""生成可爱吉祥物风格的图标（圆脸 + 大眼 + 大笑 + 腮红 + 小星星）。"""
from PIL import Image, ImageDraw
import math
import os

OUT = r"D:\小工具\LibreTV-src\public\icons"
PREVIEW = r"D:\小工具\LibreTV\tools\logo-preview.png"
os.makedirs(OUT, exist_ok=True)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, c1, c2):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x / size * 0.55 + y / size * 0.45)
            px[x, y] = lerp(c1, c2, t)
    return img


def make(size):
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.28)
    bg = Image.new("RGBA", (s, s), (26, 18, 42, 255))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)
    img.paste(bg, (0, 0), mask)

    grad = gradient(s, (139, 92, 255), (34, 211, 238)).convert("RGBA")
    inner = grad.copy()
    inner.putalpha(mask.point(lambda v: int(v * 0.30)))
    img.alpha_composite(inner)

    ring = Image.new("L", (s, s), 0)
    ImageDraw.Draw(ring).rounded_rectangle(
        [s * 0.03, s * 0.03, s * 0.97, s * 0.97], radius=int(radius * 0.92), outline=255, width=max(2, int(s * 0.028))
    )
    rg = grad.copy()
    rg.putalpha(ring)
    img.alpha_composite(rg)

    # 耳朵
    ear = (176, 148, 122, 255)
    d.ellipse([s * 0.20, s * 0.20, s * 0.36, s * 0.36], fill=ear)
    d.ellipse([s * 0.64, s * 0.20, s * 0.80, s * 0.36], fill=ear)

    # 脑袋 + 头顶高光
    d.ellipse([s * 0.18, s * 0.24, s * 0.82, s * 0.86], fill=(198, 168, 138, 255))
    d.ellipse([s * 0.28, s * 0.28, s * 0.72, s * 0.44], fill=(214, 188, 160, 255))

    # 眼睛
    for cx in (0.375, 0.625):
        x = s * cx
        d.ellipse([x - s * 0.052, s * 0.455, x + s * 0.052, s * 0.565], fill=(28, 22, 18, 255))
        d.ellipse([x - s * 0.020, s * 0.472, x + s * 0.004, s * 0.500], fill=(255, 255, 255, 255))

    # 腮红
    for cx in (0.285, 0.715):
        x = s * cx
        d.ellipse([x - s * 0.055, s * 0.585, x + s * 0.055, s * 0.645], fill=(240, 140, 150, 110))

    # 大白牙笑容
    d.rounded_rectangle([s * 0.335, s * 0.60, s * 0.665, s * 0.745], radius=int(s * 0.07), fill=(255, 255, 255, 255))
    d.line([s * 0.50, s * 0.605, s * 0.50, s * 0.742], fill=(226, 205, 185, 255), width=max(1, int(s * 0.012)))

    def star(cx, cy, r, color):
        pts = []
        for i in range(8):
            ang = i * math.pi / 4
            rr = r if i % 2 == 0 else r * 0.36
            pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
        d.polygon(pts, fill=color)

    star(s * 0.845, s * 0.175, s * 0.055, (255, 200, 230, 255))
    star(s * 0.915, s * 0.295, s * 0.030, (255, 170, 210, 210))

    return img.resize((size, size), Image.LANCZOS)


for size in (48, 96, 144, 192, 512):
    make(size).save(os.path.join(OUT, f"icon-{size}.png"))
    print("saved icon-%d.png" % size)
make(180).save(os.path.join(OUT, "apple-touch-icon.png"))
make(64).save(r"D:\小工具\LibreTV-src\public\favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
make(192).save(PREVIEW)
print("done")
