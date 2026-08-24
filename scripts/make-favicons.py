#!/usr/bin/env python3
"""
Generates the favicon set for thelongweekends.com from the site's own LW mark.

Why the letterforms are drawn as geometry instead of typeset: the mark in the
navbar is JetBrains Mono ExtraBold "LW" on a #ff2b63 tile, and JetBrains Mono is
not installed here (the site loads it from Google Fonts at runtime, which this
sandbox cannot reach). Substituting DejaVu or Liberation Mono would produce a tab
icon that visibly does not match the header, which is the exact complaint this
work is fixing. So the glyphs are constructed as polygons in the same geometric,
flat-terminal, heavy-stem idiom. Every output — including the SVG — comes from the
numbers below, so the vector and the rasters cannot drift apart.

Three deliberate departures from the on-page mark, all optical:

1. The mark fills 62-74% of the tile width, against ~43% in the navbar. A 36px
   navbar chip sits beside a wordmark that says the name; a favicon is read alone
   in a tab strip. Push the mark to the edges or it reads as a coloured square.

2. The W is wider than a monospaced advance allows (1.06 cap heights against the
   L's 0.62). At this stroke weight a strictly monospaced W has counters under one
   pixel at 32px, so they fill in and the letter becomes a block.

3. Sizes at or below 32px get their own metrics — lighter strokes, wider W, larger
   cap height. Scaling one drawing down does not work here: a W needs seven
   alternating features across its width, and at 16px there are only about six
   pixels to put them in. The first attempt used one set of metrics everywhere and
   the 16px icon read as "LH", because the middle apex bridged to the outer strokes
   through 1.2px counters. See SMALL below.
Run it from the repo root with `python3 scripts/make-favicons.py`, which writes
straight into public/. Needs Pillow and ImageMagick's `convert` on PATH.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import subprocess, sys, os

BRAND = (255, 43, 99, 255)  # --brand / #ff2b63, straight from the site tokens
WHITE = (255, 255, 255, 255)

R_RATIO = 0.26  # tile corner radius; navbar is rounded-[0.625rem] on 36px = 0.278

# Glyph metrics in units of the cap height. `tw` is the fraction of the tile the
# whole mark spans, from which the cap height is derived.
STANDARD = dict(s_stem=0.22, s_w=0.20, l_w=0.62, gap=0.16, w_w=1.06, m=0.12)

# Below ~32px the counters have to be bought from the stems: lighter strokes, a
# wider W, tighter sidebearings, and a bigger mark overall. The apex height stays
# at 0.12 because that value already balances the upper and lower counters —
# moving it robs one to feed the other.
#
# These numbers were picked by rendering five candidates at 16px and reading them,
# not by taste. The measure is the narrowest W counter in pixels: 1.84px reads as
# "LH", 2.42px reads as "LW". Going lighter still (or dropping the tile radius to
# reclaim the corner pixels) buys another 0.4px, which is not worth having the
# 16px icon be the only square one in the set.
SMALL = dict(s_stem=0.18, s_w=0.14, l_w=0.56, gap=0.12, w_w=1.20, m=0.12)


def metrics_for(target, tw):
    """`target` is the final pixel size, which selects the metric set."""
    g = dict(SMALL if target <= 32 else STANDARD)
    g["hc"] = tw / (g["l_w"] + g["gap"] + g["w_w"])
    return g


def mark_polys(S, tw, target=None):
    """Polygons for the LW mark on an S x S tile, in pixels.

    `S` is the canvas being drawn on, `target` the size the icon will end up at.
    They differ because rendering supersamples: a 16px icon is drawn at 128px and
    scaled down, and the metric set must still be chosen for 16, not 128. Keying
    off the canvas instead is the bug that silently disabled all the small-size
    tuning the first time this ran — the output was identical to the untuned pass.
    """
    g = metrics_for(target if target is not None else S, tw)
    hc = g["hc"] * S
    total = (g["l_w"] + g["gap"] + g["w_w"]) * hc
    x0 = (S - total) / 2.0
    y0 = (S - hc) / 2.0
    polys = []

    # --- L: stem plus foot, both flat-terminal rectangles ---
    s = g["s_stem"] * hc
    polys.append([(x0, y0), (x0 + s, y0), (x0 + s, y0 + hc), (x0, y0 + hc)])
    polys.append([
        (x0, y0 + hc - s), (x0 + g["l_w"] * hc, y0 + hc - s),
        (x0 + g["l_w"] * hc, y0 + hc), (x0, y0 + hc),
    ])

    # --- W: four parallelograms with vertical cuts ---
    # Each runs exactly from one horizontal guide to another, so no shape can
    # spill past the cap line or the baseline and nothing needs clipping. All four
    # are wound the same direction, so a nonzero fill rule unions the overlaps at
    # the apex and the valleys instead of punching them out.
    wx = x0 + (g["l_w"] + g["gap"]) * hc
    sw = g["s_w"] * hc
    span = (g["w_w"] - g["s_w"]) * hc     # left edge of stroke 1 to left edge of 4
    p = span / 2                           # left edge of the middle apex
    v1 = p / (2 - g["m"])                  # left valley, solved so strokes 1 and 2
    v2 = span - v1                         # lean at one angle. v2 mirrors it.
    m = g["m"] * hc

    def para(xt, yt, xb, yb):
        return [
            (wx + xt, y0 + yt), (wx + xt + sw, y0 + yt),
            (wx + xb + sw, y0 + yb), (wx + xb, y0 + yb),
        ]

    polys.append(para(0, 0, v1, hc))       # cap line -> left valley
    polys.append(para(p, m, v1, hc))       # apex     -> left valley
    polys.append(para(p, m, v2, hc))       # apex     -> right valley
    polys.append(para(span, 0, v2, hc))    # cap line -> right valley
    return polys


def render(S, rounded, tw, scale=8):
    """Draw at scale x and downsample — that is where the antialiasing comes from."""
    Z = S * scale
    img = Image.new("RGBA", (Z, Z), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, Z - 1, Z - 1], radius=R_RATIO * Z, fill=BRAND)
    else:
        # Full bleed, no transparency. iOS composites apple-touch-icon onto an
        # opaque backdrop and applies its own squircle, so transparent corners come
        # back as a halo; Android crops maskable icons the same way.
        d.rectangle([0, 0, Z - 1, Z - 1], fill=BRAND)
    # Metrics are chosen for the final size S, then drawn at Z and scaled down, so
    # the small-size tuning survives the supersample.
    for poly in mark_polys(Z, tw, target=S):
        d.polygon([(x, y) for x, y in poly], fill=WHITE)
    return img.resize((S, S), Image.LANCZOS)


def svg(S, tw):
    def fmt(v):
        return f"{v:.3f}".rstrip("0").rstrip(".")

    def poly_d(poly):
        head = f"M{fmt(poly[0][0])} {fmt(poly[0][1])}"
        return head + "".join(f"L{fmt(x)} {fmt(y)}" for x, y in poly[1:]) + "Z"

    d = "".join(poly_d(p) for p in mark_polys(S, tw, target=64))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" '
        f'role="img" aria-label="The Long Weekends">\n'
        f'  <rect width="{S}" height="{S}" rx="{fmt(R_RATIO * S)}" fill="#ff2b63"/>\n'
        f'  <path fill="#fff" fill-rule="nonzero" d="{d}"/>\n'
        f"</svg>\n"
    )


# Mark width per family. The tab-strip icons run wide; the two platform families
# are inset because both crop the corners. A maskable icon must keep its content
# inside a circle of 80% diameter: at tw=0.62 the mark's corner sits 0.361 of the
# side from centre, comfortably inside the 0.40 limit. At tw=0.68 it is 0.387 —
# inside, but with no margin for how each launcher rounds.
TW_TAB = 0.68        # favicon.svg, favicon-96x96.png, and the 48px ico entry
TW_TAB_SMALL = 0.80  # 16 and 32, which need every pixel they can get
TW_PLATFORM = 0.62   # apple-touch-icon, web-app-manifest-*

OUT = sys.argv[1] if len(sys.argv) > 1 else str(
    Path(__file__).resolve().parent.parent / "public")
os.makedirs(OUT, exist_ok=True)

render(96, True, TW_TAB).save(f"{OUT}/favicon-96x96.png")
render(180, False, TW_PLATFORM).save(f"{OUT}/apple-touch-icon.png")
render(192, False, TW_PLATFORM).save(f"{OUT}/web-app-manifest-192x192.png")
render(512, False, TW_PLATFORM).save(f"{OUT}/web-app-manifest-512x512.png")
with open(f"{OUT}/favicon.svg", "w", encoding="utf-8") as f:
    f.write(svg(64, TW_TAB))

# favicon.ico carries 16/32/48. Each is rendered at its own size rather than
# resized from one bitmap, so both the small-size metrics and the antialiasing are
# tuned per entry.
tmp = []
for n in (16, 32, 48):
    p = f"/tmp/ico-{n}.png"
    render(n, True, TW_TAB_SMALL if n <= 32 else TW_TAB).save(p)
    tmp.append(p)
subprocess.run(["convert", *tmp, f"{OUT}/favicon.ico"], check=True)

print("wrote:", sorted(os.listdir(OUT)))
