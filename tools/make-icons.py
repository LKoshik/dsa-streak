#!/usr/bin/env python3
"""OPTIONAL helper: redraws the PNG icons from the SVG flame in src/pwa/.

Not part of the build and not needed to run the app: the PNG files are already committed.
Only run this after you change the flame in src/pwa/icon.svg or src/pwa/icon-maskable.svg.
Needs Python 3 with Pillow (pip install pillow). No Node dependency is added.

  python3 tools/make-icons.py

(No Python? Any SVG-to-PNG tool does the same job; see the sizes in HANDOFF.md.)
"""
import re
from pathlib import Path
from PIL import Image, ImageDraw

PWA = Path(__file__).resolve().parent.parent / "src" / "pwa"
SS = 4  # draw 4x bigger, then shrink: smooth edges

# (svg source, output file, pixel size)
JOBS = [
    ("icon.svg", "icon-192.png", 192),
    ("icon.svg", "icon-512.png", 512),
    ("icon-maskable.svg", "icon-maskable-512.png", 512),
    ("icon-maskable.svg", "apple-touch-icon.png", 180),
]


def hex_color(text):
    text = text.lstrip("#")
    return tuple(int(text[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def cubic(p0, p1, p2, p3, steps=40):
    out = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
        ))
    return out


def path_points(d):
    """Only absolute M, C and Z (all these icons use)."""
    tokens = re.findall(r"[MCZ]|-?\d+\.?\d*", d)
    points, i, cur = [], 0, (0, 0)
    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        if cmd == "M":
            cur = (float(tokens[i]), float(tokens[i + 1]))
            i += 2
            points.append(cur)
        elif cmd == "C":
            while i < len(tokens) and tokens[i] not in "MCZ":
                a, b, c = [(float(tokens[i + k]), float(tokens[i + k + 1])) for k in (0, 2, 4)]
                points += cubic(cur, a, b, c)
                cur = c
                i += 6
        # Z: the polygon closes by itself
    return points


def render(svg_text, size):
    px = size * SS
    k = px / 512
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    rect = re.search(r'<rect[^>]*fill="(#[0-9a-fA-F]{6})"', svg_text)
    radius = re.search(r'<rect[^>]*rx="(\d+)"', svg_text)
    draw.rounded_rectangle([0, 0, px - 1, px - 1], radius=(int(radius.group(1)) * k if radius else 0), fill=hex_color(rect.group(1)))
    # the flame group: translate(256 256) scale(S) translate(-256 -254)
    s = float(re.search(r"scale\(([\d.]+)\)", svg_text).group(1))
    for fill, d in re.findall(r'<path fill="(#[0-9a-fA-F]{6})" d="([^"]+)"', svg_text):
        pts = [((x - 256) * s + 256, (y - 254) * s + 256) for x, y in path_points(d)]
        draw.polygon([(x * k, y * k) for x, y in pts], fill=hex_color(fill))
    return img.resize((size, size), Image.LANCZOS)


for source, target, size in JOBS:
    render((PWA / source).read_text(), size).save(PWA / target, optimize=True)
    print("wrote", target, f"{size}x{size}")
