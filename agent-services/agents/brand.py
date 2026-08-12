from reportlab.lib.colors import HexColor
from reportlab.graphics.shapes import Drawing, Path, String

"""
Central brand definition — every generated document (invoice now,
future reports/certificates) pulls from here so the look stays
consistent without re-specifying colors per file.

PLACEHOLDER LOGO: I don't have your actual AyurHerb logo asset, so
draw_logo() below renders a simple programmatic leaf mark + wordmark
as a stand-in. The moment you have a real logo file (PNG/SVG), replace
draw_logo() with:

    from reportlab.platypus import Image
    def get_logo_flowable(width=120):
        return Image("assets/ayurherb_logo.png", width=width, height=width * 0.4)

...and swap its usage in invoice_pdf.py accordingly. Nothing else in
the invoice layout needs to change — logo placement is already
isolated to one spot in the letterhead.
"""

BRAND_NAME = "AyurHerb"
BRAND_TAGLINE = "Traceable Herbs. Verified Farms."

# Herbal green palette — adjust to your real brand guide when you have one.
# Plain hex strings (for Paragraph <font color="..."> tags, which need a
# bare hex string, not a reportlab Color object) live alongside the Color
# objects (for Table/Drawing styling, which need the objects).
HEX_PRIMARY = "#1F5C3F"
HEX_ACCENT = "#8FB996"
HEX_DARK = "#12241A"
HEX_MUTED = "#6B7A70"
HEX_BG_STRIP = "#EFF5F1"

COLOR_PRIMARY = HexColor(HEX_PRIMARY)     # deep herb green
COLOR_ACCENT = HexColor(HEX_ACCENT)       # sage
COLOR_DARK = HexColor(HEX_DARK)           # near-black green, for body text
COLOR_MUTED = HexColor(HEX_MUTED)         # muted gray-green, for secondary text
COLOR_BG_STRIP = HexColor(HEX_BG_STRIP)   # very light background band


def draw_logo(x: float, y: float, size: float = 36) -> Drawing:
    """A simple leaf-mark placeholder. Returns a Drawing positioned at (x, y)."""
    d = Drawing(size * 2, size)

    leaf = Path(fillColor=COLOR_PRIMARY, strokeColor=None)
    leaf.moveTo(size * 0.1, size * 0.1)
    leaf.curveTo(size * 0.1, size * 0.8, size * 0.6, size, size * 0.95, size * 0.95)
    leaf.curveTo(size * 0.9, size * 0.5, size * 0.6, size * 0.1, size * 0.1, size * 0.1)
    leaf.closePath()
    d.add(leaf)

    vein = Path(strokeColor=COLOR_BG_STRIP, strokeWidth=1.5, fillColor=None)
    vein.moveTo(size * 0.2, size * 0.15)
    vein.lineTo(size * 0.75, size * 0.85)
    d.add(vein)

    d.add(
        String(
            size * 1.15, size * 0.32,
            BRAND_NAME,
            fontName="Helvetica-Bold",
            fontSize=size * 0.5,
            fillColor=COLOR_PRIMARY,
        )
    )

    return d