"""Render the Aether app icon at all sizes iOS/iPadOS and PWAs need.

Design: a deep-night sky disc with a warm "aether" orb crested by a soft
horizon glow and a thin orbital ring. The artwork is rendered at 1024×1024
with 4× supersampling, then resampled with Lanczos for the smaller sizes.

iOS applies its own rounded-rectangle mask to apple-touch-icon, so the
artwork is full-bleed square (no self-rounded corners).
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent

# Output sizes.
APPLE_SIZES = [180, 167, 152, 120]  # apple-touch-icon variants
PWA_SIZES = [192, 512]              # manifest icons
FAVICON_SIZES = [32, 192]           # favicon + generic

# Palette tuned to match the app (styles/main.css, index.html theme color).
DEEP = (11, 16, 32)          # #0b1020 night base
MID = (22, 32, 68)           # midnight blue
HIGH = (58, 96, 168)         # upper sky highlight
ORB_WARM = (255, 241, 201)   # #fff1c9 warm aether orb core
ORB_GLOW = (255, 207, 140)   # amber glow
RING = (154, 209, 255)       # #9ad1ff soft atmospheric ring
STAR = (230, 240, 255)


def render_master(size: int = 1024) -> Image.Image:
    """Render the icon at `size` px (no corner masking, full-bleed)."""
    SS = 4  # supersampling factor
    W = size * SS
    img = Image.new("RGB", (W, W), DEEP)

    # --- Vertical sky gradient (top lighter than bottom).
    grad = Image.new("RGB", (1, W))
    gpx = grad.load()
    for y in range(W):
        t = y / (W - 1)
        # ease the transition so the horizon feels natural
        t = t * t * (3 - 2 * t)
        r = int(HIGH[0] * (1 - t) + DEEP[0] * t * 1.1)
        g = int(HIGH[1] * (1 - t) + DEEP[1] * t * 1.1)
        b = int(HIGH[2] * (1 - t) + DEEP[2] * t * 1.1)
        gpx[0, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
    img.paste(grad.resize((W, W)))

    # --- Radial darkening at the corners (vignette) via a mask.
    vignette = Image.new("L", (W, W), 0)
    vd = ImageDraw.Draw(vignette)
    cx = cy = W / 2
    max_r = math.hypot(cx, cy)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        r = max_r * t
        alpha = int(170 * (t ** 2.2))
        vd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=alpha)
    vignette = vignette.filter(ImageFilter.GaussianBlur(W * 0.02))
    dark = Image.new("RGB", (W, W), DEEP)
    img = Image.composite(dark, img, vignette)

    # --- Soft orbital ring (thin, slightly tilted ellipse).
    ring = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    ring_r = W * 0.38
    ring_h = ring_r * 0.28  # ellipse flattening
    rd.ellipse(
        (cx - ring_r, cy - ring_h, cx + ring_r, cy + ring_h),
        outline=RING + (120,),
        width=max(2, W // 220),
    )
    ring = ring.filter(ImageFilter.GaussianBlur(W * 0.004))
    img.paste(ring, (0, 0), ring)

    # Second, brighter arc on the front of the ring to suggest depth.
    arc = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arc)
    ad.arc(
        (cx - ring_r, cy - ring_h, cx + ring_r, cy + ring_h),
        start=15, end=165,
        fill=RING + (210,),
        width=max(3, W // 180),
    )
    arc = arc.filter(ImageFilter.GaussianBlur(W * 0.002))
    img.paste(arc, (0, 0), arc)

    # --- Outer warm glow around the orb.
    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    orb_r = W * 0.22
    orb_cy = cy - W * 0.02
    for i, alpha in enumerate([24, 38, 60, 90, 130]):
        r = orb_r * (1.9 - i * 0.18)
        gd.ellipse(
            (cx - r, orb_cy - r, cx + r, orb_cy + r),
            fill=ORB_GLOW + (alpha,),
        )
    glow = glow.filter(ImageFilter.GaussianBlur(W * 0.05))
    img.paste(glow, (0, 0), glow)

    # --- The orb itself, with a subtle top-light highlight.
    orb = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    od = ImageDraw.Draw(orb)
    od.ellipse(
        (cx - orb_r, orb_cy - orb_r, cx + orb_r, orb_cy + orb_r),
        fill=ORB_WARM + (255,),
    )
    # Highlight crescent (offset inner disc for a gentle sheen).
    hl = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hl_r = orb_r * 0.72
    hd.ellipse(
        (cx - hl_r - W * 0.015, orb_cy - hl_r - W * 0.04,
         cx + hl_r - W * 0.015, orb_cy + hl_r - W * 0.04),
        fill=(255, 255, 255, 70),
    )
    hl = hl.filter(ImageFilter.GaussianBlur(W * 0.02))
    orb.alpha_composite(hl)
    img.paste(orb, (0, 0), orb)

    # --- Horizon glow beneath the orb.
    horizon = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    hrd = ImageDraw.Draw(horizon)
    hy = cy + W * 0.16
    hrd.ellipse(
        (cx - W * 0.45, hy - W * 0.08, cx + W * 0.45, hy + W * 0.08),
        fill=ORB_GLOW + (90,),
    )
    horizon = horizon.filter(ImageFilter.GaussianBlur(W * 0.04))
    img.paste(horizon, (0, 0), horizon)

    # --- Scattered stars (deterministic layout).
    stars = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    # pseudo-random but fixed so output is reproducible
    import random
    rng = random.Random(7)
    for _ in range(60):
        sx = rng.random() * W
        sy = rng.random() * W * 0.55  # concentrate in upper half
        # skip stars that would overlap the orb
        if math.hypot(sx - cx, sy - orb_cy) < orb_r * 1.5:
            continue
        radius = rng.uniform(W * 0.0015, W * 0.004)
        a = int(rng.uniform(110, 220))
        sd.ellipse((sx - radius, sy - radius, sx + radius, sy + radius),
                   fill=STAR + (a,))
    stars = stars.filter(ImageFilter.GaussianBlur(W * 0.0012))
    img.paste(stars, (0, 0), stars)

    # Downsample from supersampled canvas.
    return img.resize((size, size), Image.LANCZOS)


def write_png(img: Image.Image, path: Path) -> None:
    img.save(path, "PNG", optimize=True)
    print(f"  wrote {path.name}  ({img.width}×{img.height})")


def main() -> None:
    print("rendering master…")
    master = render_master(1024)
    write_png(master, HERE / "icon-1024.png")

    for s in sorted(set(APPLE_SIZES + PWA_SIZES + FAVICON_SIZES), reverse=True):
        resized = master.resize((s, s), Image.LANCZOS)
        write_png(resized, HERE / f"icon-{s}.png")


if __name__ == "__main__":
    main()
