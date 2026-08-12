/**
 * Server-side fee computation. NEVER accept fee amounts from the client —
 * always recompute here from the order's real crop subtotal + quantity,
 * or a company could tamper with what they're charged.
 *
 * Real GST treatment, not invented: raw agricultural produce sale is
 * GST-exempt in India. Platform service fee and transportation/logistics
 * are taxable SERVICES, so GST @ 18% applies to those two components
 * only — not to the crop value itself. That split is what makes this
 * invoice look like a real Indian B2B document instead of a flat
 * percentage markup.
 */

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 5);
export const TRANSPORT_FEE_PER_KG = Number(process.env.TRANSPORT_FEE_PER_KG ?? 2);
export const GST_ON_FEES_PERCENT = Number(process.env.GST_ON_FEES_PERCENT ?? 18);

export interface OrderFees {
  cropSubtotal: number;           // 100% owed to farmer, tranche-released
  platformFeePercent: number;
  platformFeeAmount: number;      // AyurHerb revenue
  transportationFeeAmount: number; // logistics, per-kg
  feeSubtotal: number;            // platformFee + transportation, pre-GST
  gstOnFeesPercent: number;
  gstOnFeesAmount: number;        // GST applies only to fees, not crop value
  grandTotal: number;             // what the company actually pays via Razorpay
}

export function computeOrderFees(cropSubtotal: number, quantity: number): OrderFees {
  const platformFeeAmount = round2(cropSubtotal * (PLATFORM_FEE_PERCENT / 100));
  const transportationFeeAmount = round2(quantity * TRANSPORT_FEE_PER_KG);
  const feeSubtotal = round2(platformFeeAmount + transportationFeeAmount);
  const gstOnFeesAmount = round2(feeSubtotal * (GST_ON_FEES_PERCENT / 100));
  const grandTotal = round2(cropSubtotal + feeSubtotal + gstOnFeesAmount);

  return {
    cropSubtotal,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFeeAmount,
    transportationFeeAmount,
    feeSubtotal,
    gstOnFeesPercent: GST_ON_FEES_PERCENT,
    gstOnFeesAmount,
    grandTotal,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}