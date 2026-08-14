import io
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing

from agents.brand import (
    BRAND_NAME, BRAND_TAGLINE,
    COLOR_PRIMARY, COLOR_ACCENT, COLOR_DARK, COLOR_MUTED, COLOR_BG_STRIP,
    HEX_MUTED, HEX_ACCENT,
    draw_logo,
)
from schemas import InvoiceRequest

"""
pip install reportlab qrcode[pil]

Produces an actual formatted invoice PDF — letterhead, structured
line-item table, tranche/payment-terms table, embedded QR linking to
the public verify page, footer. The LLM-written narrative (from
invoice_agent.py's text generation) is used only for a short "notes"
paragraph — the financial figures themselves are laid out
programmatically from real request fields, never from model output.
That split matters: numbers on an invoice should never come from a
language model, formatted text can.
"""

styles = getSampleStyleSheet()

style_body = ParagraphStyle(
    "body", parent=styles["Normal"], fontName="Helvetica", fontSize=9.5,
    textColor=COLOR_DARK, leading=13,
)
style_label = ParagraphStyle(
    "label", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8,
    textColor=COLOR_MUTED, leading=11,
)
style_notes = ParagraphStyle(
    "notes", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=8.5,
    textColor=COLOR_MUTED, leading=12,
)


def _make_qr_flowable(verify_url: str, size_mm: float = 28) -> Image:
    qr = qrcode.QRCode(border=1, box_size=8)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#12241A", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Image(buf, width=size_mm * mm, height=size_mm * mm)


def _letterhead(invoice_number: str, order_id: str) -> list:
    logo_drawing = draw_logo(0, 0, size=30)

    header_table = Table(
        [[logo_drawing, Paragraph(
            f'<font size="7" color="{HEX_MUTED}">'
            f'INVOICE #{invoice_number}<br/>Order ref: {order_id}</font>',
            style_body,
        )]],
        colWidths=[90 * mm, 80 * mm],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))

    tagline = Paragraph(
        f'<font size="8" color="{HEX_ACCENT}"><i>{BRAND_TAGLINE}</i></font>',
        style_body,
    )

    return [
        header_table,
        Spacer(1, 2 * mm),
        tagline,
        Spacer(1, 3 * mm),
        HRFlowable(width="100%", thickness=1.2, color=COLOR_PRIMARY),
        Spacer(1, 5 * mm),
    ]


def _party_block(req: InvoiceRequest) -> Table:
    data = [
        [Paragraph("BILL TO (COMPANY)", style_label), Paragraph("SHIP FROM (FARMER)", style_label)],
        [
            Paragraph(f"<b>{req.companyName}</b><br/>GSTIN: {req.companyGstNumber}", style_body),
            Paragraph(f"<b>{req.farmerName}</b><br/>{req.farmerLocation}", style_body),
        ],
    ]
    t = Table(data, colWidths=[85 * mm, 85 * mm])
    t.setStyle(TableStyle([
        ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
    ]))
    return t


def _line_items_table(req: InvoiceRequest) -> Table:
    """Crop line item only — this is the GST-exempt goods portion.
    Fee breakdown is a separate table (_charges_table) since fees are
    taxable services under GST, crop value is not. Keeping them apart
    is what makes this read as a real Indian B2B invoice."""
    header = ["Description", "Quantity", "Unit Price (INR)", "Amount (INR)"]
    unit_price = req.cropSubtotal / req.quantity if req.quantity else 0
    row = [
        f"{req.cropName} (raw agricultural produce — GST exempt)",
        f"{req.quantity:,.2f} {req.unit}",
        f"{unit_price:,.2f}",
        f"{req.cropSubtotal:,.2f}",
    ]

    t = Table([header, row], colWidths=[65 * mm, 30 * mm, 40 * mm, 35 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _charges_table(req: InvoiceRequest) -> Table:
    """Platform fee + transportation + GST + grand total — the part
    that makes this an honest payment invoice, not just a crop
    price sheet. GST is applied only to the taxable service lines."""
    data = [
        ["Charges", "", "Amount (INR)"],
        ["Crop subtotal (GST exempt)", "", f"{req.cropSubtotal:,.2f}"],
        [f"Platform service fee ({req.platformFeePercent:.1f}%)", "", f"{req.platformFeeAmount:,.2f}"],
        ["Transportation & logistics fee", "", f"{req.transportationFeeAmount:,.2f}"],
        [f"GST on fees ({req.gstOnFeesPercent:.0f}%)", "", f"{req.gstOnFeesAmount:,.2f}"],
        ["Grand Total (Payable by Company)", "", f"INR {req.grandTotal:,.2f}"],
    ]
    t = Table(data, colWidths=[95 * mm, 20 * mm, 55 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_STRIP),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, COLOR_PRIMARY),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 10.5),
        ("TEXTCOLOR", (0, -1), (-1, -1), COLOR_PRIMARY),
        ("TOPPADDING", (0, -1), (-1, -1), 8),
    ]))
    return t


def _payment_terms_table(req: InvoiceRequest) -> Table:
    """Farmer payout terms — tranches are a % of cropSubtotal ONLY.
    The farmer receives 100% of the crop value; fees are the
    company's cost, never deducted from what the farmer is owed."""
    shipment_amt = req.cropSubtotal * req.shipmentTranchePercent / 100
    delivery_amt = req.cropSubtotal * req.deliveryTranchePercent / 100

    data = [
        ["Milestone (Farmer Payout)", "Release %", "Amount (INR)"],
        ["On shipment start", f"{req.shipmentTranchePercent}%", f"{shipment_amt:,.2f}"],
        ["On confirmed delivery", f"{req.deliveryTranchePercent}%", f"{delivery_amt:,.2f}"],
        ["Total to farmer", "100%", f"{req.cropSubtotal:,.2f}"],
    ]
    t = Table(data, colWidths=[70 * mm, 35 * mm, 40 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_STRIP),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_DARK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, COLOR_MUTED),
        ("LINEABOVE", (0, -1), (-1, -1), 0.5, COLOR_MUTED),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    return t


def build_invoice_pdf(req: InvoiceRequest, invoice_notes: str, verify_url: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
    )

    story = []
    story += _letterhead(req.invoiceNumber, req.orderId)
    story.append(_party_block(req))
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("ORDER DETAILS", style_label))
    story.append(Spacer(1, 2 * mm))
    story.append(_line_items_table(req))
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("PAYMENT DUE FROM COMPANY", style_label))
    story.append(Spacer(1, 2 * mm))
    story.append(_charges_table(req))
    story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("ESCROW RELEASE TERMS", style_label))
    story.append(Spacer(1, 2 * mm))
    story.append(_payment_terms_table(req))
    story.append(Spacer(1, 8 * mm))

    if invoice_notes:
        story.append(Paragraph("NOTES", style_label))
        story.append(Spacer(1, 1.5 * mm))
        story.append(Paragraph(invoice_notes, style_notes))
        story.append(Spacer(1, 8 * mm))

    qr_table = Table(
        [[_make_qr_flowable(verify_url), Paragraph(
            f'<font size="8" color="{HEX_MUTED}">'
            f"Scan to verify this order's crop provenance and invoice details.<br/>"
            f"Farmers: print this code on shipment packs.</font>",
            style_body,
        )]],
        colWidths=[30 * mm, 130 * mm],
    )
    qr_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story.append(qr_table)

    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_ACCENT))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        f'<font size="7" color="{HEX_MUTED}">'
        f"Generated by {BRAND_NAME} — funds held in platform escrow (Razorpay, test mode) "
        f"until milestone release, verified on-chain.</font>",
        style_body,
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()