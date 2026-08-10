import re
from schemas import VerifyCompanyResponse

# Real GSTIN format: 15 chars, e.g. 22AAAAA0000A1Z5
GSTIN_PATTERN = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$")

def verify_company_identity(gst_number: str) -> VerifyCompanyResponse:
    """
    MOCKED — real GST/company-registry verification needs a paid KYB
    provider (Karza, Signzy, IDfy) with business onboarding, or
    government API Setu access. Direct GSTIN portal scraping is
    blocked by Cloudflare and isn't a path worth pursuing.

    This checks GSTIN *format* only (India's real checksum structure)
    and mocks a pass. Swap the marked block for a real API call later
    — same input/output shape, no other code needs to change.
    """
    gst = (gst_number or "").upper().strip()

    if not GSTIN_PATTERN.match(gst):
        return VerifyCompanyResponse(passed=False, reason="Invalid GSTIN format")

    # --- MOCK: replace with real KYB provider call ---
    return VerifyCompanyResponse(passed=True, reason="Mock verification passed (format valid)")
    # ---------------------------------------------------