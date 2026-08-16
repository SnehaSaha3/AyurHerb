import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export async function createRazorpayOrder(amountInRupees: number, receipt: string) {
  const amountPaise = Math.round(amountInRupees * 100);

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes: { platform: "AyurHerb", mode: "test-escrow-simulation" },
  });

  return { razorpayOrderId: order.id, amountPaise, keyId: process.env.RAZORPAY_KEY_ID };
}

/**
 * Verifies the HMAC signature Razorpay's Checkout returns after a
 * successful test payment. This is the SAME verification real
 * production integrations use — it's what actually proves the
 * payment wasn't spoofed client-side, test mode or not.
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpaySignature;
}