import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

import Order from "../models/order";
import Company from "../models/company";
import Farmer from "../models/farmer";
import Shipment from "../models/shipment";

/*
 * ============================================================
 * AYURHERB BRAND
 * ============================================================
 *
 * Actual logo:
 *
 * frontend/src/assets/logo-transparent.png
 *
 * Controller location:
 * backend/src/controllers/
 *
 * Therefore:
 * ../../../frontend/src/assets/logo-transparent.png
 */
const AYURHERB_LOGO = path.resolve(
  __dirname,
  "../../../frontend/src/assets/logo-transparent.png"
);

/*
 * ============================================================
 * PDF BRAND TOKENS
 * ============================================================
 */

const PDF_COLORS = {
  dark: "#12241A",
  darkGreen: "#173D2A",
  green: "#356B47",
  greenBright: "#4D8B5F",
  lightGreen: "#EAF4ED",
  lighterGreen: "#F4F8F5",
  border: "#D7E2DA",
  text: "#202820",
  muted: "#6B776F",
  white: "#FFFFFF",
  warning: "#9A6700",
  warningBg: "#FFF6DF",
  red: "#9D3C3C",
  redBg: "#FBEDED",
};

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatINR(value: unknown): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "N/A";
  }

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function shortHash(hash?: string): string {
  if (!hash) {
    return "Not available";
  }

  if (hash.length <= 24) {
    return hash;
  }

  return `${hash.slice(0, 12)}...${hash.slice(-10)}`;
}

function formatDate(value?: Date | string): string {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/*
 * ============================================================
 * PDF HELPERS
 * ============================================================
 */

/**
 * Draws the very top accent and white page background.
 */
function drawPageBackground(doc: PDFKit.PDFDocument) {
  doc
    .rect(
      0,
      0,
      doc.page.width,
      doc.page.height
    )
    .fill(PDF_COLORS.white);

  doc
    .rect(
      0,
      0,
      doc.page.width,
      5
    )
    .fill(PDF_COLORS.green);
}

/**
 * Draw AyurHerb's actual logo.
 *
 * Falls back gracefully if the asset cannot be found.
 */
function drawLogo(
  doc: PDFKit.PDFDocument
) {
  const x = doc.page.margins.left;
  const y = 28;

  if (fs.existsSync(AYURHERB_LOGO)) {
    doc.image(
      AYURHERB_LOGO,
      x,
      y,
      {
        fit: [125, 48],
        valign: "center",
      }
    );

    return;
  }

  /*
   * This should only happen if the asset is missing.
   * We deliberately do not create a fake logo.
   */
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(PDF_COLORS.darkGreen)
    .text(
      "AyurHerb",
      x,
      y + 10
    );
}

/**
 * PDF header.
 */
function drawPdfHeader(
  doc: PDFKit.PDFDocument
) {
  drawLogo(doc);

  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(PDF_COLORS.muted)
    .text(
      "TRACEABLE HERBS • VERIFIED FARMS • SUPPLY CHAIN PROVENANCE",
      doc.page.margins.left,
      82
    );

  doc
    .moveTo(
      doc.page.margins.left,
      98
    )
    .lineTo(
      doc.page.width -
        doc.page.margins.right,
      98
    )
    .lineWidth(0.8)
    .strokeColor(PDF_COLORS.border)
    .stroke();
}

/**
 * PDF footer.
 */
function drawPdfFooter(
  doc: PDFKit.PDFDocument
) {
  const y =
    doc.page.height -
    42;

  doc
    .moveTo(
      doc.page.margins.left,
      y - 10
    )
    .lineTo(
      doc.page.width -
        doc.page.margins.right,
      y - 10
    )
    .lineWidth(0.6)
    .strokeColor(PDF_COLORS.border)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(PDF_COLORS.muted)
    .text(
      "AyurHerb • Crop Journey & Provenance Record",
      doc.page.margins.left,
      y
    );

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(PDF_COLORS.muted)
    .text(
      "Current transaction record",
      350,
      y,
      {
        width:
          doc.page.width -
          doc.page.margins.right -
          350,
        align: "right",
      }
    );
}

/**
 * Draw section heading.
 */
function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  title: string,
  y?: number
): number {
  const currentY =
    y ?? doc.y;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(PDF_COLORS.green)
    .text(
      title.toUpperCase(),
      doc.page.margins.left,
      currentY,
      {
        characterSpacing: 1.2,
      }
    );

  doc
    .moveTo(
      doc.page.margins.left,
      currentY + 18
    )
    .lineTo(
      doc.page.margins.left + 58,
      currentY + 18
    )
    .lineWidth(2)
    .strokeColor(PDF_COLORS.green)
    .stroke();

  return currentY + 32;
}

/**
 * Draw a light card.
 */
function drawCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = PDF_COLORS.lighterGreen
) {
  doc
    .roundedRect(
      x,
      y,
      width,
      height,
      8
    )
    .fillAndStroke(
      fill,
      PDF_COLORS.border
    );
}

/**
 * Draw a field with label/value.
 */
function drawField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: unknown,
  x: number,
  y: number,
  width: number
) {
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(PDF_COLORS.muted)
    .text(
      label.toUpperCase(),
      x,
      y,
      {
        width,
      }
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(PDF_COLORS.text)
    .text(
      String(value ?? "—"),
      x,
      y + 11,
      {
        width,
      }
    );
}

/**
 * Draw a status pill.
 */
function drawStatusBadge(
  doc: PDFKit.PDFDocument,
  status: string,
  x: number,
  y: number
) {
  const label = String(
    status || "UNKNOWN"
  )
    .replace(/_/g, " ")
    .toUpperCase();

  const width =
    Math.max(
      72,
      label.length * 5.1 + 20
    );

  const isWarning =
    label.includes("PENDING") ||
    label.includes("HOLD") ||
    label.includes("FAILED");

  const background =
    isWarning
      ? PDF_COLORS.warningBg
      : PDF_COLORS.lightGreen;

  const textColor =
    isWarning
      ? PDF_COLORS.warning
      : PDF_COLORS.green;

  doc
    .roundedRect(
      x,
      y,
      width,
      20,
      10
    )
    .fill(background);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(textColor)
    .text(
      label,
      x,
      y + 6,
      {
        width,
        align: "center",
      }
    );

  return width;
}

/**
 * Draw the supply-chain timeline item.
 */
function drawTimelineItem(
  doc: PDFKit.PDFDocument,
  index: number,
  title: string,
  eventDate: unknown,
  eventStatus: string,
  transactionHash: unknown,
  y: number,
  isLast = false
): number {
  const circleX =
    doc.page.margins.left + 14;

  const contentX =
    doc.page.margins.left + 42;

  /*
   * Vertical connector.
   */
  if (!isLast) {
    doc
      .moveTo(
        circleX,
        y + 18
      )
      .lineTo(
        circleX,
        y + 75
      )
      .lineWidth(1)
      .strokeColor(
        PDF_COLORS.border
      )
      .stroke();
  }

  /*
   * Circle.
   */
  doc
    .circle(
      circleX,
      y + 8,
      10
    )
    .fill(PDF_COLORS.green);

  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor(PDF_COLORS.white)
    .text(
      String(index).padStart(2, "0"),
      circleX - 8,
      y + 5,
      {
        width: 16,
        align: "center",
      }
    );

  /*
   * Event title.
   */
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(PDF_COLORS.darkGreen)
    .text(
      title,
      contentX,
      y
    );

  /*
   * Status badge on right.
   */
  const badgeWidth =
    Math.max(
      72,
      String(eventStatus || "UNKNOWN")
        .replace(/_/g, " ")
        .length *
          5.1 +
        20
    );

  drawStatusBadge(
    doc,
    eventStatus || "UNKNOWN",
    doc.page.width -
      doc.page.margins.right -
      badgeWidth,
    y - 4
  );

  /*
   * Timestamp.
   */
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(PDF_COLORS.muted)
    .text(
      formatDate(
        eventDate as
          | string
          | Date
          | undefined
      ),
      contentX,
      y + 17
    );

  /*
   * Blockchain hash.
   */
  if (transactionHash) {
    doc
      .font("Courier")
      .fontSize(6.5)
      .fillColor(PDF_COLORS.muted)
      .text(
        `Blockchain: ${String(
          transactionHash
        )}`,
        contentX,
        y + 32,
        {
          width:
            doc.page.width -
            contentX -
            doc.page.margins.right,
        }
      );
  }

  return y + 72;
}

/**
 * Ensure enough room for a block.
 */
function ensureSpace(
  doc: PDFKit.PDFDocument,
  requiredHeight: number
) {
  const bottom =
    doc.page.height -
    doc.page.margins.bottom -
    45;

  if (
    doc.y + requiredHeight >
    bottom
  ) {
    doc.addPage();

    drawPageBackground(doc);
    drawPdfHeader(doc);

    doc.y = 125;
  }
}

/*
 * ============================================================
 * PUBLIC HTML VERIFICATION
 * ============================================================
 */

/**
 * GET
 *
 * /api/public/verify/:orderId/:qrToken
 *
 * Public QR verification page.
 */
export async function verifyPublicOrder(
  req: Request,
  res: Response
) {
  try {
    const {
      orderId,
      qrToken,
    } = req.params;

    if (!orderId || !qrToken) {
      return res.status(400).send(
        buildErrorPage(
          "Invalid verification link",
          "The QR verification link is incomplete."
        )
      );
    }

    const order =
      await Order.findById(orderId)
        .lean();

    if (!order) {
      return res.status(404).send(
        buildErrorPage(
          "Order not found",
          "This AyurHerb verification record does not exist."
        )
      );
    }

    if (
      !order.invoice?.qrToken ||
      order.invoice.qrToken !== qrToken
    ) {
      return res.status(403).send(
        buildErrorPage(
          "Verification failed",
          "This QR code is invalid or has expired."
        )
      );
    }

    const [
      company,
      farmer,
      shipmentRecord,
    ] = await Promise.all([
      Company.findById(
        order.companyId
      ).lean(),

      Farmer.findById(
        order.farmerId
      ).lean(),

      Shipment.findOne({
        orderId: order._id,
      }).lean(),
    ]);

    const shipmentTranche =
      order.tranches?.find(
        (tranche: any) =>
          tranche.type ===
          "shipment"
      );

    const deliveryTranche =
      order.tranches?.find(
        (tranche: any) =>
          tranche.type ===
          "delivery"
      );

    const verified =
      Boolean(
        order.chainTxHash
      ) &&
      Boolean(
        order.invoice?.qrToken
      );

    const html =
      buildVerificationPage({
        verified,
        order,
        company,
        farmer,
        shipmentTranche,
        deliveryTranche,
        shipmentRecord,
      });

    return res
      .status(200)
      .send(html);
  } catch (error: any) {
    console.error(
      "Public QR verification error:",
      error
    );

    return res.status(500).send(
      buildErrorPage(
        "Verification unavailable",
        "The verification service could not process this QR code right now."
      )
    );
  }
}

/*
 * ============================================================
 * PUBLIC CROP JOURNEY PDF
 * ============================================================
 */

/**
 * GET
 *
 * /api/public/verify/:orderId/:qrToken/pdf
 *
 * IMPORTANT:
 *
 * This is NOT the invoice PDF.
 *
 * This endpoint generates a separate Crop Journey /
 * Provenance PDF directly from the current database state.
 *
 * The QR code inside the invoice points here.
 *
 * The QR itself remains fixed.
 *
 * As the order progresses, this PDF automatically reflects:
 *
 * - order confirmation
 * - escrow funding
 * - pickup scheduling
 * - shipment release
 * - delivery release
 * - blockchain transaction references
 */
export async function generatePublicProvenancePdf(
  req: Request,
  res: Response
) {
  try {
    const { orderId, qrToken } = req.params;

    if (!orderId || !qrToken) {
      return res.status(400).json({
        error: "Invalid verification link",
        message: "The QR verification link is incomplete.",
      });
    }

    // ------------------------------------------------------------
    // LOAD ORDER
    // ------------------------------------------------------------

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "This AyurHerb verification record does not exist.",
      });
    }

    // ------------------------------------------------------------
    // VALIDATE QR TOKEN
    // ------------------------------------------------------------

    if (
      !order.invoice?.qrToken ||
      order.invoice.qrToken !== qrToken
    ) {
      return res.status(403).json({
        error: "Verification failed",
        message: "This QR code is invalid or has expired.",
      });
    }

    // ------------------------------------------------------------
    // LOAD PUBLIC DATA
    // ------------------------------------------------------------

    const [
      company,
      farmer,
      shipmentRecord,
    ] = await Promise.all([
      Company.findById(order.companyId).lean(),

      Farmer.findById(order.farmerId).lean(),

      Shipment.findOne({
        orderId: order._id,
      }).lean(),
    ]);

    // ------------------------------------------------------------
    // TRANCHES
    // ------------------------------------------------------------

    const shipmentTranche =
      order.tranches?.find(
        (tranche: any) =>
          tranche.type === "shipment"
      );

    const deliveryTranche =
      order.tranches?.find(
        (tranche: any) =>
          tranche.type === "delivery"
      );

    // ------------------------------------------------------------
    // BASIC VALUES
    // ------------------------------------------------------------

    const cropName =
      order.cropName || "Unknown crop";

    const quantity =
      Number(order.quantity || 0);

    const farmerName =
      farmer?.name || "Verified farmer";

    const companyName =
      company?.name || "Verified AyurHerb Buyer";

    const farmerLocation =
      farmer?.address ||
      "Farm location recorded in AyurHerb";

    const currentStatus =
      String(order.status || "unknown");

    const verified =
      Boolean(order.chainTxHash) &&
      Boolean(order.invoice?.qrToken);

    const shipment =
      shipmentRecord as any;

    // ------------------------------------------------------------
    // CREATE PDF
    // ------------------------------------------------------------

    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `AyurHerb Crop Journey - ${cropName}`,
        Author: "AyurHerb",
        Subject: "Crop Provenance and Supply Chain Record",
        Keywords:
          "AyurHerb, crop provenance, supply chain",
      },
    });

    const filename =
      `AyurHerb-Crop-Journey-${String(order._id)}.pdf`;

    res.status(200);

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"`
    );

    doc.pipe(res);

    // ============================================================
    // PAGE 1
    // ============================================================

    drawPageBackground(doc);
    drawPdfHeader(doc);

    let y = 125;

    // ------------------------------------------------------------
    // TITLE
    // ------------------------------------------------------------

    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .fillColor(PDF_COLORS.darkGreen)
      .text(
        "Crop Journey",
        doc.page.margins.left,
        y
      );

    y += 31;

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(PDF_COLORS.muted)
      .text(
        "Provenance & Supply Chain Record",
        doc.page.margins.left,
        y
      );

    y += 27;

    drawStatusBadge(
      doc,
      verified ? "VERIFIED" : "UNVERIFIED",
      doc.page.margins.left,
      y
    );

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(PDF_COLORS.muted)
      .text(
        `Order ${String(order._id)}`,
        doc.page.margins.left,
        y + 28
      );

    y += 65;

    // ============================================================
    // CROP IDENTITY
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Crop identity",
      y
    );

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      94
    );

    drawField(
      doc,
      "Crop",
      cropName,
      64,
      y + 15,
      160
    );

    drawField(
      doc,
      "Quantity",
      `${quantity.toLocaleString("en-IN")} kg`,
      235,
      y + 15,
      120
    );

    drawField(
      doc,
      "Current status",
      currentStatus.replace(/_/g, " "),
      365,
      y + 15,
      160
    );

    drawField(
      doc,
      "Order ID",
      String(order._id),
      64,
      y + 56,
      220
    );

    drawField(
      doc,
      "Order created",
      formatDate(order.createdAt),
      300,
      y + 56,
      225
    );

    y += 119;

    // ============================================================
    // FARM ORIGIN
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Farm origin",
      y
    );

    const cropLocation =
      (order as any).location ||
      (order as any).farmLocation ||
      null;

    const farmCardHeight =
      cropLocation ? 88 : 65;

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      farmCardHeight
    );

    drawField(
      doc,
      "Farmer",
      farmerName,
      64,
      y + 15,
      200
    );

    drawField(
      doc,
      "Farm address",
      farmerLocation,
      285,
      y + 15,
      240
    );

    if (cropLocation) {
      drawField(
        doc,
        "Recorded crop location",
        typeof cropLocation === "string"
          ? cropLocation
          : `${cropLocation.lat ?? "N/A"}, ${cropLocation.lng ?? "N/A"}`,
        64,
        y + 55,
        460
      );
    }

    y += farmCardHeight + 24;

    // ============================================================
    // BUYER
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Buyer",
      y
    );

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      62
    );

    drawField(
      doc,
      "Buyer / company",
      companyName,
      64,
      y + 15,
      250
    );

    drawField(
      doc,
      "Crop purchased",
      cropName,
      330,
      y + 15,
      190
    );

    y += 87;

    // ============================================================
    // LOGISTICS
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Logistics & pickup",
      y
    );

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      105
    );

    drawField(
      doc,
      "Pickup",
      shipment?.pickup?.scheduledAt
        ? formatDate(
            shipment.pickup.scheduledAt
          )
        : "Not yet scheduled",
      64,
      y + 15,
      200
    );

    drawField(
      doc,
      "Vehicle",
      shipment?.vehicle?.vehicleNumber ||
        "Not assigned",
      285,
      y + 15,
      240
    );

    drawField(
      doc,
      "Vehicle type",
      shipment?.vehicle?.vehicleType ||
        "N/A",
      64,
      y + 56,
      200
    );

    drawField(
      doc,
      "Driver",
      shipment?.vehicle?.driverName ||
        "Not assigned",
      285,
      y + 56,
      240
    );

    y += 130;

    // ============================================================
    // PAGE 2
    // ============================================================

    doc.addPage();

    drawPageBackground(doc);
    drawPdfHeader(doc);

    y = 125;

    // ============================================================
    // SUPPLY CHAIN JOURNEY
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Supply chain journey",
      y
    );

    y = drawTimelineItem(
      doc,
      1,
      "Order confirmed",
      order.createdAt,
      order.chainTxHash
        ? "Confirmed on blockchain"
        : "Order recorded",
      order.chainTxHash,
      y,
      false
    );

    y = drawTimelineItem(
      doc,
      2,
      "Escrow funded",
      order.escrow?.fundedAt,
      order.escrow?.escrowChainTxHash
        ? "Escrow confirmed"
        : "Pending",
      order.escrow?.escrowChainTxHash,
      y,
      false
    );

    y = drawTimelineItem(
      doc,
      3,
      "Pickup scheduled",
      shipment?.pickup?.scheduledAt,
      shipment?.pickup?.scheduledAt
        ? "Scheduled"
        : "Not yet scheduled",
      null,
      y,
      false
    );

    y = drawTimelineItem(
      doc,
      4,
      "Shipment tranche released",
      shipmentTranche?.releasedAt,
      shipmentTranche?.status ||
        "Pending",
      shipmentTranche?.chainTxHash,
      y,
      false
    );

    y = drawTimelineItem(
      doc,
      5,
      "Delivery tranche released",
      deliveryTranche?.releasedAt,
      deliveryTranche?.status ||
        "Pending",
      deliveryTranche?.chainTxHash,
      y,
      true
    );

    y += 10;

    // ============================================================
    // ESCROW
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Escrow & milestone status",
      y
    );

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      105
    );

    drawField(
      doc,
      "Escrow funded",
      formatDate(
        order.escrow?.fundedAt
      ),
      64,
      y + 15,
      210
    );

    drawField(
      doc,
      "Shipment tranche",
      shipmentTranche
        ? `${shipmentTranche.percent ?? 0}% — ${
            shipmentTranche.status ||
            "unknown"
          }`
        : "Not recorded",
      285,
      y + 15,
      240
    );

    drawField(
      doc,
      "Delivery tranche",
      deliveryTranche
        ? `${deliveryTranche.percent ?? 0}% — ${
            deliveryTranche.status ||
            "unknown"
          }`
        : "Not recorded",
      64,
      y + 56,
      240
    );

    drawField(
      doc,
      "Journey status",
      currentStatus.replace(/_/g, " "),
      330,
      y + 56,
      195
    );

    y += 130;

    // ============================================================
    // BLOCKCHAIN PROVENANCE
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Blockchain provenance",
      y
    );

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      145
    );

    drawField(
      doc,
      "Order confirmation",
      shortHash(order.chainTxHash),
      64,
      y + 15,
      460
    );

    drawField(
      doc,
      "Escrow funding",
      shortHash(
        order.escrow?.escrowChainTxHash
      ),
      64,
      y + 48,
      460
    );

    drawField(
      doc,
      "Shipment release",
      shortHash(
        shipmentTranche?.chainTxHash
      ),
      64,
      y + 81,
      460
    );

    drawField(
      doc,
      "Delivery release",
      shortHash(
        deliveryTranche?.chainTxHash
      ),
      64,
      y + 114,
      460
    );

    y += 170;

    // ============================================================
    // PUBLIC VERIFICATION RECORD
    // ============================================================

    y = drawSectionTitle(
      doc,
      "Public verification record",
      y
    );

    drawCard(
      doc,
      doc.page.margins.left,
      y,
      doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right,
      88
    );

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(PDF_COLORS.darkGreen)
      .text(
        "Permanent QR provenance record",
        64,
        y + 15
      );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(PDF_COLORS.muted)
      .text(
        "This QR code remains permanently associated with " +
          "this transaction. The verification record reflects " +
          "the current AyurHerb order, shipment and blockchain state.",
        64,
        y + 37,
        {
          width: 460,
          lineGap: 2,
        }
      );

    // ============================================================
    // FOOTER
    // ============================================================

    drawPdfFooter(doc);

    // ============================================================
    // FINISH
    // ============================================================

    doc.end();

  } catch (error: any) {
    console.error(
      "Public crop journey PDF error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error: "Verification unavailable",
        message:
          "The crop journey PDF could not be generated right now.",
      });
    }

    res.end();
  }
}
/*
 * ============================================================
 * PUBLIC HTML PAGE
 * ============================================================
 */

function buildVerificationPage(data: {
  verified: boolean;
  order: any;
  company: any;
  farmer: any;
  shipmentTranche: any;
  deliveryTranche: any;
  shipmentRecord: any;
}) {
  const {
    verified,
    order,
    company,
    farmer,
    shipmentTranche,
    deliveryTranche,
    shipmentRecord,
  } = data;

  const statusLabel =
    verified
      ? "VERIFIED"
      : "UNVERIFIED";

  const statusClass =
    verified
      ? "verified"
      : "warning";

  const farmerLocation =
    farmer?.address ||
    farmer?.location ||
    "Farm location recorded in AyurHerb";

  const companyName =
    company?.name ||
    "Verified AyurHerb Buyer";

  const invoiceNumber =
    order.invoice
      ?.invoiceNumber ||
    "N/A";

  const chainTxHash =
    order.chainTxHash ||
    "";

  const escrowTxHash =
    order.escrow
      ?.escrowChainTxHash ||
    "";

  const cropName =
    order.cropName ||
    "Unknown crop";

  const quantity =
    Number(
      order.quantity || 0
    );

  const amount =
    Number(
      order.amount || 0
    );

  const pickupScheduledAt =
    shipmentRecord?.pickup
      ?.scheduledAt || null;

  const vehicleNumber =
    shipmentRecord?.vehicle
      ?.vehicleNumber || null;

  const driverName =
    shipmentRecord?.vehicle
      ?.driverName || null;

  return `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  AyurHerb | ${escapeHtml(
    invoiceNumber
  )}
</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background:
    radial-gradient(
      circle at top,
      #173d2a 0,
      #0d2118 35%,
      #07100c 75%
    );

  color: #eef7f0;
  min-height: 100vh;
}

.page {
  width:
    min(
      920px,
      calc(100% - 32px)
    );

  margin: 0 auto;

  padding:
    42px 0 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.logo {
  width: 42px;
  height: 42px;

  border-radius: 12px;

  display: grid;
  place-items: center;

  background:
    rgba(
      125,
      211,
      151,
      0.14
    );

  border:
    1px solid
    rgba(
      151,
      232,
      170,
      0.24
    );

  font-size: 20px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  color: #9eb5a5;
  font-size: 12px;
  margin-top: 2px;
}

.card {
  background:
    rgba(
      10,
      24,
      17,
      0.86
    );

  border:
    1px solid
    rgba(
      158,
      208,
      173,
      0.15
    );

  border-radius: 24px;

  box-shadow:
    0 30px 90px
    rgba(0, 0, 0, 0.38),

    inset 0 1px 0
    rgba(
      255,
      255,
      255,
      0.035
    );

  overflow: hidden;
}

.hero {
  padding: 32px;

  border-bottom:
    1px solid
    rgba(
      158,
      208,
      173,
      0.12
    );
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding:
    7px 11px;

  border-radius: 999px;

  font-size: 11px;
  font-weight: 800;

  letter-spacing: 0.08em;
}

.status.verified {
  background:
    rgba(
      80,
      190,
      111,
      0.13
    );

  color: #8ee6a4;

  border:
    1px solid
    rgba(
      80,
      190,
      111,
      0.2
    );
}

.status.warning {
  background:
    rgba(
      245,
      158,
      11,
      0.12
    );

  color: #f7c76d;

  border:
    1px solid
    rgba(
      245,
      158,
      11,
      0.2
    );
}

h1 {
  margin:
    18px 0 8px;

  font-size:
    clamp(
      28px,
      5vw,
      44px
    );

  line-height: 1.05;

  letter-spacing:
    -0.045em;
}

.hero-description {
  max-width: 650px;

  margin: 0;

  color: #9fb5a5;

  font-size: 14px;

  line-height: 1.7;
}

.grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 1px;

  background:
    rgba(
      158,
      208,
      173,
      0.1
    );
}

.section {
  padding:
    26px 30px;

  background:
    rgba(
      8,
      19,
      13,
      0.94
    );
}

.section.full {
  grid-column:
    1 / -1;
}

.section-title {
  color: #7fb88e;

  font-size: 10px;

  font-weight: 800;

  text-transform:
    uppercase;

  letter-spacing:
    0.14em;

  margin-bottom: 18px;
}

.row {
  display: flex;

  justify-content:
    space-between;

  gap: 24px;

  padding: 11px 0;

  border-bottom:
    1px solid
    rgba(
      158,
      208,
      173,
      0.08
    );
}

.row:last-child {
  border-bottom: 0;
}

.label {
  color: #849b8b;
  font-size: 13px;
}

.value {
  color: #eef7f0;

  font-size: 13px;

  font-weight: 600;

  text-align: right;

  word-break:
    break-word;
}

.crop-box {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 20px;

  padding: 18px;

  border-radius: 16px;

  background:
    rgba(
      126,
      185,
      142,
      0.07
    );

  border:
    1px solid
    rgba(
      126,
      185,
      142,
      0.1
    );
}

.crop-name {
  font-size: 21px;

  font-weight: 700;

  letter-spacing:
    -0.025em;
}

.crop-quantity {
  color: #91a998;

  font-size: 12px;

  margin-top: 5px;
}

.amount {
  font-size: 20px;
  font-weight: 700;
}

.chain {
  font-family:
    "SFMono-Regular",
    Consolas,
    "Liberation Mono",
    monospace;

  font-size: 11px;

  color: #8fcda0;

  word-break:
    break-all;
}

.verification-note {
  margin-top: 20px;

  padding:
    15px 17px;

  border-radius: 14px;

  background:
    rgba(
      80,
      190,
      111,
      0.07
    );

  border:
    1px solid
    rgba(
      80,
      190,
      111,
      0.12
    );

  color: #a7c7b0;

  font-size: 12px;

  line-height: 1.6;
}

.footer {
  padding:
    24px 30px;

  color: #6f8777;

  font-size: 11px;

  line-height: 1.6;

  border-top:
    1px solid
    rgba(
      158,
      208,
      173,
      0.1
    );
}

@media (max-width: 680px) {

  .page {
    width:
      min(
        100% - 20px,
        920px
      );

    padding-top: 22px;
  }

  .hero {
    padding: 24px;
  }

  .grid {
    display: block;
  }

  .section {
    border-bottom:
      1px solid
      rgba(
        158,
        208,
        173,
        0.1
      );

    padding:
      22px 24px;
  }

  .section.full {
    grid-column: auto;
  }

  .row {
    align-items:
      flex-start;

    flex-direction:
      column;

    gap: 5px;
  }

  .value {
    text-align: left;
  }

  .crop-box {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

}

</style>

</head>

<body>

<main class="page">

  <div class="brand">

    <div class="logo">
      🌿
    </div>

    <div>

      <div class="brand-name">
        AyurHerb
      </div>

      <div class="brand-subtitle">
        Traceable Herbs. Verified Farms.
      </div>

    </div>

  </div>

  <div class="card">

    <section class="hero">

      <div class="status ${statusClass}">
        ● ${statusLabel}
      </div>

      <h1>
        Crop provenance verified
      </h1>

      <p class="hero-description">
        This QR code resolves to an AyurHerb
        crop journey record. The information
        below is linked to the marketplace
        transaction, farm origin and blockchain
        transaction references.
      </p>

    </section>

    <div class="grid">

      <section class="section full">

        <div class="section-title">
          Crop
        </div>

        <div class="crop-box">

          <div>

            <div class="crop-name">
              ${escapeHtml(
                cropName
              )}
            </div>

            <div class="crop-quantity">
              ${quantity.toLocaleString(
                "en-IN"
              )} kg
            </div>

          </div>

          <div class="amount">
            ${formatINR(
              amount
            )}
          </div>

        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Order
        </div>

        <div class="row">
          <span class="label">
            Order ID
          </span>

          <span class="value">
            ${escapeHtml(
              order._id
            )}
          </span>
        </div>

        <div class="row">
          <span class="label">
            Invoice
          </span>

          <span class="value">
            ${escapeHtml(
              invoiceNumber
            )}
          </span>
        </div>

        <div class="row">
          <span class="label">
            Status
          </span>

          <span class="value">
            ${escapeHtml(
              order.status
            )}
          </span>
        </div>

        <div class="row">
          <span class="label">
            Created
          </span>

          <span class="value">
            ${formatDate(
              order.createdAt
            )}
          </span>
        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Participants
        </div>

        <div class="row">

          <span class="label">
            Buyer
          </span>

          <span class="value">
            ${escapeHtml(
              companyName
            )}
          </span>

        </div>

        <div class="row">

          <span class="label">
            Farmer
          </span>

          <span class="value">
            ${escapeHtml(
              farmer?.name ||
              "Verified farmer"
            )}
          </span>

        </div>

        <div class="row">

          <span class="label">
            Farm origin
          </span>

          <span class="value">
            ${escapeHtml(
              farmerLocation
            )}
          </span>

        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Logistics & pickup
        </div>

        <div class="row">

          <span class="label">
            Scheduled pickup
          </span>

          <span class="value">
            ${
              pickupScheduledAt
                ? formatDate(
                    pickupScheduledAt
                  )
                : "Not yet scheduled"
            }
          </span>

        </div>

        <div class="row">

          <span class="label">
            Vehicle
          </span>

          <span class="value">
            ${
              vehicleNumber
                ? escapeHtml(
                    vehicleNumber
                  )
                : "N/A"
            }
          </span>

        </div>

        <div class="row">

          <span class="label">
            Driver
          </span>

          <span class="value">
            ${
              driverName
                ? escapeHtml(
                    driverName
                  )
                : "N/A"
            }
          </span>

        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Payment & escrow
        </div>

        <div class="row">

          <span class="label">
            Grand total
          </span>

          <span class="value">
            ${formatINR(
              order.fees
                ?.grandTotal
            )}
          </span>

        </div>

        <div class="row">

          <span class="label">
            Shipment tranche
          </span>

          <span class="value">

            ${
              shipmentTranche
                ? `${shipmentTranche.percent}% — ${escapeHtml(
                    shipmentTranche.status
                  )}`
                : "N/A"
            }

          </span>

        </div>

        <div class="row">

          <span class="label">
            Delivery tranche
          </span>

          <span class="value">

            ${
              deliveryTranche
                ? `${deliveryTranche.percent}% — ${escapeHtml(
                    deliveryTranche.status
                  )}`
                : "N/A"
            }

          </span>

        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Blockchain provenance
        </div>

        <div class="row">

          <span class="label">
            Order record
          </span>

          <span class="value chain">

            ${
              chainTxHash
                ? escapeHtml(
                    shortHash(
                      chainTxHash
                    )
                  )
                : "Not available"
            }

          </span>

        </div>

        <div class="row">

          <span class="label">
            Escrow record
          </span>

          <span class="value chain">

            ${
              escrowTxHash
                ? escapeHtml(
                    shortHash(
                      escrowTxHash
                    )
                  )
                : "Not available"
            }

          </span>

        </div>

        <div class="verification-note">

          The blockchain transaction
          references are provided as
          provenance anchors for this
          AyurHerb order. The QR token
          itself is not stored on-chain.

        </div>

      </section>

    </div>

    <footer class="footer">

      AyurHerb public verification record ·
      This page exposes only information
      intended for provenance verification.

    </footer>

  </div>

</main>

</body>
</html>`;
}

/*
 * ============================================================
 * ERROR PAGE
 * ============================================================
 */

function buildErrorPage(
  title: string,
  message: string
) {
  return `<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  AyurHerb Verification
</title>

<style>

body {

  margin: 0;

  min-height: 100vh;

  display: grid;

  place-items: center;

  padding: 24px;

  box-sizing: border-box;

  background:
    radial-gradient(
      circle at top,
      #173d2a,
      #08110c 70%
    );

  color: #eef7f0;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

}

.card {

  width:
    min(
      520px,
      100%
    );

  padding: 34px;

  border-radius: 22px;

  background: #0d1d14;

  border:
    1px solid
    rgba(
      158,
      208,
      173,
      0.14
    );

  box-shadow:
    0 30px 80px
    rgba(
      0,
      0,
      0,
      0.35
    );

}

.brand {

  font-weight: 800;

  font-size: 18px;

  margin-bottom: 30px;

}

.icon {

  font-size: 34px;

  margin-bottom: 18px;

}

h1 {

  margin:
    0 0 10px;

  font-size: 28px;

  letter-spacing:
    -0.04em;

}

p {

  margin: 0;

  color: #9fb5a5;

  line-height: 1.7;

  font-size: 14px;

}

</style>

</head>

<body>

  <div class="card">

    <div class="brand">
      🌿 AyurHerb
    </div>

    <div class="icon">
      ⚠
    </div>

    <h1>
      ${escapeHtml(
        title
      )}
    </h1>

    <p>
      ${escapeHtml(
        message
      )}
    </p>

  </div>

</body>

</html>`;
}