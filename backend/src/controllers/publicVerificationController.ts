import { Request, Response } from "express";
import Order from "../models/order";
import Company from "../models/company";
import Farmer from "../models/farmer";

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
  if (!hash) return "Not available";

  if (hash.length <= 24) {
    return hash;
  }

  return `${hash.slice(0, 12)}...${hash.slice(-10)}`;
}

function formatDate(value?: Date | string): string {
  if (!value) return "N/A";

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
 * GET
 * /api/public/verify/:orderId/:qrToken
 *
 * Public QR verification page.
 *
 * Important:
 * - No authentication required.
 * - The QR token must match the token stored against the order.
 * - Only public-safe order/provenance information is exposed.
 * - Private farmer/company fields are deliberately not returned.
 */
export async function verifyPublicOrder(
  req: Request,
  res: Response
) {
  try {
    const { orderId, qrToken } = req.params;

    if (!orderId || !qrToken) {
      return res.status(400).send(
        buildErrorPage(
          "Invalid verification link",
          "The QR verification link is incomplete."
        )
      );
    }

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).send(
        buildErrorPage(
          "Order not found",
          "This AyurHerb verification record does not exist."
        )
      );
    }

    /*
     * The QR token is the actual authentication mechanism
     * for this public verification record.
     */
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

    const [company, farmer] = await Promise.all([
      Company.findById(order.companyId).lean(),
      Farmer.findById(order.farmerId).lean(),
    ]);

    const shipmentTranche = order.tranches?.find(
      (tranche: any) => tranche.type === "shipment"
    );

    const deliveryTranche = order.tranches?.find(
      (tranche: any) => tranche.type === "delivery"
    );

    const verified =
      Boolean(order.chainTxHash) &&
      Boolean(order.invoice?.qrToken);

    const html = buildVerificationPage({
      verified,
      order,
      company,
      farmer,
      shipmentTranche,
      deliveryTranche,
    });

    return res.status(200).send(html);
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

function buildVerificationPage(data: {
  verified: boolean;
  order: any;
  company: any;
  farmer: any;
  shipmentTranche: any;
  deliveryTranche: any;
}) {
  const {
    verified,
    order,
    company,
    farmer,
    shipmentTranche,
    deliveryTranche,
  } = data;

  const statusLabel = verified
    ? "VERIFIED"
    : "UNVERIFIED";

  const statusClass = verified
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
    order.invoice?.invoiceNumber ||
    "N/A";

  const chainTxHash =
    order.chainTxHash ||
    "";

  const escrowTxHash =
    order.escrow?.escrowChainTxHash ||
    "";

  const cropName =
    order.cropName ||
    "Unknown crop";

  const quantity =
    Number(order.quantity || 0);

  const amount =
    Number(order.amount || 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<title>
  AyurHerb | ${escapeHtml(invoiceNumber)}
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
    width: min(920px, calc(100% - 32px));
    margin: 0 auto;
    padding: 42px 0 64px;
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
    background: rgba(125, 211, 151, 0.14);
    border: 1px solid rgba(151, 232, 170, 0.24);
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
    background: rgba(10, 24, 17, 0.86);
    border: 1px solid rgba(158, 208, 173, 0.15);
    border-radius: 24px;
    box-shadow:
      0 30px 90px rgba(0, 0, 0, 0.38),
      inset 0 1px 0 rgba(255,255,255,0.035);

    overflow: hidden;
  }

  .hero {
    padding: 32px;
    border-bottom: 1px solid rgba(158, 208, 173, 0.12);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .status.verified {
    background: rgba(80, 190, 111, 0.13);
    color: #8ee6a4;
    border: 1px solid rgba(80, 190, 111, 0.2);
  }

  .status.warning {
    background: rgba(245, 158, 11, 0.12);
    color: #f7c76d;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  h1 {
    margin: 18px 0 8px;
    font-size: clamp(28px, 5vw, 44px);
    line-height: 1.05;
    letter-spacing: -0.045em;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1px;
    background: rgba(158, 208, 173, 0.1);
  }

  .section {
    padding: 26px 30px;
    background: rgba(8, 19, 13, 0.94);
  }

  .section.full {
    grid-column: 1 / -1;
  }

  .section-title {
    color: #7fb88e;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin-bottom: 18px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 11px 0;
    border-bottom: 1px solid rgba(158, 208, 173, 0.08);
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
    word-break: break-word;
  }

  .crop-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 18px;
    border-radius: 16px;
    background: rgba(126, 185, 142, 0.07);
    border: 1px solid rgba(126, 185, 142, 0.1);
  }

  .crop-name {
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.025em;
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
    word-break: break-all;
  }

  .verification-note {
    margin-top: 20px;
    padding: 15px 17px;
    border-radius: 14px;
    background: rgba(80, 190, 111, 0.07);
    border: 1px solid rgba(80, 190, 111, 0.12);
    color: #a7c7b0;
    font-size: 12px;
    line-height: 1.6;
  }

  .footer {
    padding: 24px 30px;
    color: #6f8777;
    font-size: 11px;
    line-height: 1.6;
    border-top: 1px solid rgba(158, 208, 173, 0.1);
  }

  @media (max-width: 680px) {
    .page {
      width: min(100% - 20px, 920px);
      padding-top: 22px;
    }

    .hero {
      padding: 24px;
    }

    .grid {
      display: block;
    }

    .section {
      border-bottom: 1px solid rgba(158, 208, 173, 0.1);
      padding: 22px 24px;
    }

    .section.full {
      grid-column: auto;
    }

    .row {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }

    .value {
      text-align: left;
    }

    .crop-box {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
</head>

<body>

<main class="page">

  <div class="brand">
    <div class="logo">🌿</div>

    <div>
      <div class="brand-name">AyurHerb</div>
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
        This QR code resolves to an AyurHerb marketplace
        transaction record. The information below is linked
        to the order and its blockchain record.
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
              ${escapeHtml(cropName)}
            </div>

            <div class="crop-quantity">
              ${quantity.toLocaleString("en-IN")} kg
            </div>
          </div>

          <div class="amount">
            ${formatINR(amount)}
          </div>

        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Order
        </div>

        <div class="row">
          <span class="label">Order ID</span>
          <span class="value">
            ${escapeHtml(order._id)}
          </span>
        </div>

        <div class="row">
          <span class="label">Invoice</span>
          <span class="value">
            ${escapeHtml(invoiceNumber)}
          </span>
        </div>

        <div class="row">
          <span class="label">Status</span>
          <span class="value">
            ${escapeHtml(order.status)}
          </span>
        </div>

        <div class="row">
          <span class="label">Created</span>
          <span class="value">
            ${formatDate(order.createdAt)}
          </span>
        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Participants
        </div>

        <div class="row">
          <span class="label">Buyer</span>
          <span class="value">
            ${escapeHtml(companyName)}
          </span>
        </div>

        <div class="row">
          <span class="label">Farmer</span>
          <span class="value">
            ${escapeHtml(farmer?.name || "Verified farmer")}
          </span>
        </div>

        <div class="row">
          <span class="label">Farm origin</span>
          <span class="value">
            ${escapeHtml(farmerLocation)}
          </span>
        </div>

      </section>

      <section class="section">

        <div class="section-title">
          Payment & escrow
        </div>

        <div class="row">
          <span class="label">Grand total</span>
          <span class="value">
            ${formatINR(order.fees?.grandTotal)}
          </span>
        </div>

        <div class="row">
          <span class="label">Shipment tranche</span>
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
          <span class="label">Delivery tranche</span>
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
          <span class="label">Order record</span>

          <span class="value chain">
            ${
              chainTxHash
                ? escapeHtml(shortHash(chainTxHash))
                : "Not available"
            }
          </span>
        </div>

        <div class="row">
          <span class="label">Escrow record</span>

          <span class="value chain">
            ${
              escrowTxHash
                ? escapeHtml(shortHash(escrowTxHash))
                : "Not available"
            }
          </span>
        </div>

        <div class="verification-note">
          The blockchain transaction references are provided
          as the provenance anchors for this AyurHerb order.
          The QR token itself is not stored on-chain.
        </div>

      </section>

    </div>

    <footer class="footer">
      AyurHerb public verification record ·
      This page exposes only information intended for
      provenance verification.
    </footer>

  </div>

</main>

</body>
</html>`;
}

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
<title>AyurHerb Verification</title>

<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    box-sizing: border-box;
    background: #08110c;
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
    width: min(520px, 100%);
    padding: 34px;
    border-radius: 22px;
    background: #0d1d14;
    border: 1px solid rgba(158, 208, 173, 0.14);
    box-shadow: 0 30px 80px rgba(0,0,0,.35);
  }

  .brand {
    font-weight: 800;
    margin-bottom: 30px;
  }

  .icon {
    font-size: 34px;
    margin-bottom: 18px;
  }

  h1 {
    margin: 0 0 10px;
    font-size: 28px;
    letter-spacing: -0.04em;
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

    <div class="icon">⚠</div>

    <h1>${escapeHtml(title)}</h1>

    <p>${escapeHtml(message)}</p>

  </div>
</body>
</html>`;
}