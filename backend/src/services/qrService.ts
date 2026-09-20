import QRCode from "qrcode";
import crypto from "crypto";

export function generateQrToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function generateQrCodeDataUrl(
  orderId: string,
  qrToken: string
): Promise<string> {
  const baseUrl = (
    process.env.PUBLIC_APP_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");

  const verifyUrl =
    `${baseUrl}/api/public/verify/` +
    `${encodeURIComponent(orderId)}/` +
    `${encodeURIComponent(qrToken)}/pdf`;

  return QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    width: 400,
    margin: 2,
  });
}