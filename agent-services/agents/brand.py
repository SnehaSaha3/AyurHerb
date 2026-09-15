from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.platypus import Image


"""
Central brand definition — every generated document uses the
same AyurHerb branding.

The logo is the ORIGINAL AyurHerb logo:
frontend/src/assets/logo-transparent.png
"""

BRAND_NAME = "AyurHerb"
BRAND_TAGLINE = "Traceable Herbs. Verified Farms."

# Herbal green palette
HEX_PRIMARY = "#1F5C3F"
HEX_ACCENT = "#8FB996"
HEX_DARK = "#12241A"
HEX_MUTED = "#6B7A70"
HEX_BG_STRIP = "#EFF5F1"

COLOR_PRIMARY = HexColor(HEX_PRIMARY)
COLOR_ACCENT = HexColor(HEX_ACCENT)
COLOR_DARK = HexColor(HEX_DARK)
COLOR_MUTED = HexColor(HEX_MUTED)
COLOR_BG_STRIP = HexColor(HEX_BG_STRIP)


# ============================================================
# ORIGINAL AYURHERB LOGO
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

LOGO_PATH = (
    PROJECT_ROOT
    / "frontend"
    / "src"
    / "assets"
    / "logo-transparent.png"
)


def get_logo(width: float = 120):
    """
    Return the original AyurHerb PNG logo.

    The logo asset is shared with the frontend so generated
    documents use the actual brand identity.
    """

    if not LOGO_PATH.exists():
        raise FileNotFoundError(
            f"AyurHerb logo not found at: {LOGO_PATH}"
        )

    # Preserve the PNG's aspect ratio.
    from PIL import Image as PILImage

    with PILImage.open(LOGO_PATH) as img:
        original_width, original_height = img.size

    aspect_ratio = original_height / original_width
    height = width * aspect_ratio

    return Image(
        str(LOGO_PATH),
        width=width,
        height=height,
    )


def draw_logo(x: float = 0, y: float = 0, size: float = 36):
    """
    Compatibility wrapper for the existing invoice layout.

    The old implementation drew a placeholder logo.
    This now returns the ORIGINAL AyurHerb PNG.
    """

    # Existing invoice calls draw_logo(size=30).
    # Keep that call working without changing invoice_pdf.py.
    return get_logo(width=size * 3.5)