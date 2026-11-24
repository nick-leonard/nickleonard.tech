"""Regenerate the "Nick Leonard" banner SVGs in public/index.html.

The banner is pixel art: █ is a filled pixel, ▒ is the violet left-edge shadow.
It used to be text in a <pre>, but block characters aren't in Google Fonts'
JetBrains Mono subsets, so phones drew them in a fallback font of a different
width and the letters smeared. As SVG it renders the same everywhere.

Edit ART (one row per line, 7 rows), then run:  python3 tools/banner_svg.py
It rewrites the <svg class="banner wide"> and <svg class="banner stack"> blocks
in place. "wide" is one line (desktop); "stack" puts Nick over Leonard (mobile).
"""

import re
from pathlib import Path

ART = """\
▒██     ▒██ ▒██           ▒██         ▒██                                                                 ▒██
▒████   ▒██               ▒██         ▒██                                                                 ▒██
▒████   ▒██ ▒██ ▒████████ ▒██   ▒██   ▒██         ▒████████ ▒████████ ▒████████ ▒████████ ▒████████ ▒████████
▒██ ▒██ ▒██ ▒██ ▒██       ▒██ ▒██     ▒██         ▒██   ▒██ ▒██   ▒██ ▒██   ▒██       ▒██ ▒██       ▒██   ▒██
▒██   ▒████ ▒██ ▒██       ▒████       ▒██         ▒████████ ▒██   ▒██ ▒██   ▒██ ▒████████ ▒██       ▒██   ▒██
▒██   ▒████ ▒██ ▒██       ▒██ ▒██     ▒██         ▒██       ▒██   ▒██ ▒██   ▒██ ▒██   ▒██ ▒██       ▒██   ▒██
▒██     ▒██ ▒██ ▒████████ ▒██   ▒██   ▒██████████ ▒████████ ▒████████ ▒██   ▒██ ▒████████ ▒██       ▒████████"""

SPLIT = 38  # column where "Leonard" starts; the stacked version breaks here
CELL_W, CELL_H = 6, 10  # one character cell of a 0.6em-wide monospace font at line-height 1
PAGE = Path(__file__).resolve().parent.parent / "public" / "index.html"


def runs(row: str, ch: str):
    """Yield (start, length) for each horizontal run of `ch` in a row."""
    for m in re.finditer(re.escape(ch) + "+", row):
        yield m.start(), m.end() - m.start()


def path_d(rows: list[str], ch: str) -> str:
    parts = []
    for y, row in enumerate(rows):
        for x, n in runs(row, ch):
            parts.append(f"M{x * CELL_W} {y * CELL_H}h{n * CELL_W}v{CELL_H}h-{n * CELL_W}z")
    return "".join(parts)


def svg(rows: list[str], kind: str) -> str:
    cols = max(len(r) for r in rows)
    w, h = cols * CELL_W, len(rows) * CELL_H
    g, p = f"bg-{kind}", f"bs-{kind}"
    return (
        f'<svg class="banner {kind}" viewBox="0 0 {w} {h}" aria-hidden="true" focusable="false" shape-rendering="crispEdges">'
        f'<defs><linearGradient id="{g}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{w}" y2="0">'
        f'<stop offset="0" stop-color="#ece6ff"/><stop offset="1" style="stop-color:var(--rose)"/></linearGradient>'
        f'<pattern id="{p}" patternUnits="userSpaceOnUse" width="2" height="2">'
        f'<rect width="1" height="1" style="fill:var(--violet)"/><rect x="1" y="1" width="1" height="1" style="fill:var(--violet)"/></pattern></defs>'
        f'<path fill="url(#{p})" d="{path_d(rows, "▒")}"/>'
        f'<path fill="url(#{g})" d="{path_d(rows, "█")}"/></svg>'
    )


def main() -> None:
    wide = ART.split("\n")
    stack = [r[:SPLIT].rstrip() for r in wide] + [""] + [r[SPLIT:] for r in wide]
    html = PAGE.read_text()
    for kind, rows in (("wide", wide), ("stack", stack)):
        new = svg(rows, kind)
        html, n = re.subn(rf'<svg class="banner {kind}".*?</svg>', lambda _: new, html, flags=re.S)
        if n != 1:
            raise SystemExit(f"expected one <svg class=\"banner {kind}\"> in {PAGE}, found {n}")
    PAGE.write_text(html)
    print(f"updated {PAGE}")


if __name__ == "__main__":
    main()
