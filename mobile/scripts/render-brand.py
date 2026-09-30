from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CREAM = (255, 248, 241, 255)
TERRACOTTA = (154, 52, 18, 255)
INK = (28, 25, 23, 255)
WHITE = (255, 255, 255, 255)
ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets" / "images"
PUBLIC = ROOT / "public"
ICON_ASSETS = ROOT / "assets" / "expo.icon" / "Assets"


def cubic(p0: tuple[float, float], p1: tuple[float, float], p2: tuple[float, float], p3: tuple[float, float], steps: int) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def transform(points: list[tuple[float, float]], scale: float, ox: float, oy: float) -> list[tuple[float, float]]:
    return [(ox + x * scale, oy + y * scale) for x, y in points]


def stroke(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], color: tuple[int, int, int, int], width: float) -> None:
    xy = [(round(x), round(y)) for x, y in points]
    draw.line(xy, fill=color, width=max(1, round(width)), joint="curve")
    radius = max(1, round(width / 2))
    for x, y in (xy[0], xy[-1]):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=color)


def draw_mark(
    canvas: Image.Image,
    *,
    size: int,
    pad: float,
    stroke_color: tuple[int, int, int, int],
    nib_color: tuple[int, int, int, int],
    stroke_outer: float = 1.7,
    stroke_inner: float = 1.3,
) -> None:
    view_w, view_h = 44.0, 48.0
    inner = size * (1 - pad * 2)
    scale = inner / view_h
    ox = (size - view_w * scale) / 2
    oy = (size - view_h * scale) / 2
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    outer = transform(
        cubic((14, 10), (30, 9), (38, 15), (38, 22), 72) + cubic((38, 22), (38, 29), (30, 35), (14, 33), 72)[1:],
        scale,
        ox,
        oy,
    )
    inner_arc = transform(
        cubic((20, 17), (28, 17.4), (31, 19.6), (31, 22.2), 56) + cubic((31, 22.2), (31, 24.8), (28, 26.8), (20, 27.2), 56)[1:],
        scale,
        ox,
        oy,
    )
    stem = transform([(14, 10), (14, 33)], scale, ox, oy)
    nib = transform([(11.2, 32.2), (16.8, 32.2), (16.8, 42), (14, 46), (11.2, 42)], scale, ox, oy)
    stroke(draw, outer, stroke_color, stroke_outer * scale)
    stroke(draw, inner_arc, stroke_color, stroke_inner * scale)
    stroke(draw, stem, stroke_color, stroke_outer * scale)
    draw.polygon([(round(x), round(y)) for x, y in nib], fill=nib_color)
    canvas.alpha_composite(overlay)


def square(size: int, background: tuple[int, int, int, int] | None, **mark: object) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    draw_mark(canvas, size=size, **mark)  # type: ignore[arg-type]
    return canvas


def supersample(size: int, background: tuple[int, int, int, int] | None, **mark: object) -> Image.Image:
    factor = 4 if size >= 64 else 8
    raw = square(size * factor, background, **mark)
    return raw.resize((size, size), Image.Resampling.LANCZOS)


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG")


def og_image() -> Image.Image:
    width, height = 1200, 630
    image = Image.new("RGBA", (width, height), CREAM)
    mark = supersample(
        360,
        None,
        pad=0.08,
        stroke_color=INK,
        nib_color=TERRACOTTA,
        stroke_outer=1.6,
        stroke_inner=1.2,
    )
    image.alpha_composite(mark, (96, (height - 360) // 2))
    draw = ImageDraw.Draw(image)
    font_title = ImageFont.truetype("C:/Windows/Fonts/georgiai.ttf", 118)
    font_dek = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 32)
    draw.text((480, 212), "Prosa", font=font_title, fill=INK[:3])
    draw.text((482, 360), "Uma lição de vinte minutos por dia.", font=font_dek, fill=(68, 64, 60))
    return image


def main() -> None:
    icon = supersample(1024, TERRACOTTA, pad=0.2, stroke_color=CREAM, nib_color=CREAM, stroke_outer=2.1, stroke_inner=1.55)
    splash = supersample(1024, CREAM, pad=0.18, stroke_color=INK, nib_color=TERRACOTTA, stroke_outer=1.6, stroke_inner=1.2)
    foreground = supersample(1024, None, pad=0.24, stroke_color=TERRACOTTA, nib_color=TERRACOTTA, stroke_outer=1.8, stroke_inner=1.35)
    monochrome = supersample(1024, None, pad=0.24, stroke_color=(0, 0, 0, 255), nib_color=(0, 0, 0, 255), stroke_outer=1.9, stroke_inner=1.4)
    background = Image.new("RGBA", (1024, 1024), CREAM)
    favicon = supersample(48, TERRACOTTA, pad=0.16, stroke_color=CREAM, nib_color=CREAM, stroke_outer=2.4, stroke_inner=1.8)
    touch = supersample(180, TERRACOTTA, pad=0.18, stroke_color=CREAM, nib_color=CREAM, stroke_outer=2.15, stroke_inner=1.6)

    save(icon, IMAGES / "icon.png")
    save(splash, IMAGES / "splash-icon.png")
    save(foreground, IMAGES / "android-icon-foreground.png")
    save(background, IMAGES / "android-icon-background.png")
    save(monochrome, IMAGES / "android-icon-monochrome.png")
    save(favicon, IMAGES / "favicon.png")
    save(touch, PUBLIC / "apple-touch-icon.png")
    save(favicon, PUBLIC / "favicon.png")
    save(og_image(), PUBLIC / "og.png")
    favicon.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    save(icon, ICON_ASSETS / "prosa-icon.png")


if __name__ == "__main__":
    main()
