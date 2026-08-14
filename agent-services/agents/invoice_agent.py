import os
import base64
from groq import Groq
from schemas import InvoiceRequest, InvoiceResponse
from agents.invoice_pdf import build_invoice_pdf

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

"""
Split responsibility, deliberately:
  - The LLM writes ONE short human-readable note (e.g. why this order
    was approved, any relevant context) — text is a fine place for an
    LLM to add value.
  - reportlab lays out every number on the actual invoice, from the
    real request fields. A model never touches the figures a company
    or farmer will read as the amount they're owed/paying — that's
    not a place for a generative step, autonomous agent or not.

Returns both: invoiceText for in-app display, pdfBase64 for the actual
branded document (download, email attachment, or print-and-scan QR).
"""


def _generate_note(req: InvoiceRequest) -> str:
    context = f"""
Order: {req.cropName}, {req.quantity} {req.unit}
Crop subtotal (to farmer): INR {req.cropSubtotal:,.2f}
Platform fee: INR {req.platformFeeAmount:,.2f} ({req.platformFeePercent}%)
Transportation fee: INR {req.transportationFeeAmount:,.2f}
GST on fees: INR {req.gstOnFeesAmount:,.2f}
Grand total payable by company: INR {req.grandTotal:,.2f}
Buyer: {req.companyName}
Seller: {req.farmerName}, {req.farmerLocation}
Farmer payment split: {req.shipmentTranchePercent}% on shipment, {req.deliveryTranchePercent}% on delivery
""".strip()

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Write ONE short note (max 2 sentences) for the bottom of a "
                    "B2B agricultural invoice. Professional, plain language. "
                    "Use only the data given — never invent figures or claims "
                    "not present in the input."
                ),
            },
            {"role": "user", "content": context},
        ],
        temperature=0.3,
        max_tokens=120,
    )
    return completion.choices[0].message.content or ""


def generate_invoice(req: InvoiceRequest) -> InvoiceResponse:
    note = _generate_note(req)
    pdf_bytes = build_invoice_pdf(req, invoice_notes=note, verify_url=req.verifyUrl)

    return InvoiceResponse(
        invoiceNumber=req.invoiceNumber,
        invoiceText=note,
        pdfBase64=base64.b64encode(pdf_bytes).decode("utf-8"),
    )