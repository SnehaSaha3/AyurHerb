import os
import base64

from groq import Groq

from schemas import (
    InvoiceRequest,
    InvoiceResponse,
)

from agents.invoice_pdf import (
    build_invoice_pdf,
)


client = Groq(
    api_key=os.environ.get(
        "GROQ_API_KEY"
    )
)


"""
Split responsibility deliberately:

LLM:
    - Writes ONE short human-readable invoice note.

Backend / ReportLab:
    - Transaction date/time
    - Invoice number
    - Crop
    - Quantity
    - Prices
    - Fees
    - GST
    - Grand total
    - Farmer payout
    - QR code
    - Verification URL

The LLM never generates financial figures or transaction
information appearing on the actual invoice.
"""


# ============================================================
# GENERATE SHORT INVOICE NOTE
# ============================================================

def _generate_note(
    req: InvoiceRequest,
) -> str:

    context = f"""
Order: {req.cropName}, {req.quantity} {req.unit}

Transaction date/time:
{req.transactionAt}

Crop subtotal (to farmer):
INR {req.cropSubtotal:,.2f}

Platform fee:
INR {req.platformFeeAmount:,.2f}
({req.platformFeePercent}%)

Transportation fee:
INR {req.transportationFeeAmount:,.2f}

GST on fees:
INR {req.gstOnFeesAmount:,.2f}

Grand total payable by company:
INR {req.grandTotal:,.2f}

Buyer:
{req.companyName}

Seller:
{req.farmerName}, {req.farmerLocation}

Farmer payment split:
{req.shipmentTranchePercent}% on shipment,
{req.deliveryTranchePercent}% on delivery
""".strip()

    completion = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": (
                    "Write ONE short note (maximum 2 sentences) "
                    "for the bottom of a B2B agricultural invoice. "
                    "Use professional plain language. "
                    "Use only the supplied information. "
                    "Never invent figures, dates, payment status, "
                    "blockchain claims, or other facts."
                ),
            },
            {
                "role": "user",
                "content": context,
            },
        ],
        temperature=0.3,
        max_tokens=120,
    )

    return (
        completion.choices[0].message.content
        or ""
    )


# ============================================================
# GENERATE INVOICE
# ============================================================

def generate_invoice(
    req: InvoiceRequest,
) -> InvoiceResponse:

    # --------------------------------------------------------
    # LLM ONLY WRITES THE NOTE
    # --------------------------------------------------------

    note = _generate_note(req)

    # --------------------------------------------------------
    # REPORTLAB BUILDS THE ACTUAL INVOICE
    # --------------------------------------------------------

    pdf_bytes = build_invoice_pdf(
        req,
        invoice_notes=note,
        verify_url=req.verifyUrl,
    )

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return InvoiceResponse(
        invoiceNumber=req.invoiceNumber,
        invoiceText=note,
        pdfBase64=base64.b64encode(
            pdf_bytes
        ).decode("utf-8"),
    )