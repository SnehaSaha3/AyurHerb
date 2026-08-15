import { useState } from "react";

interface PaymentWindowProps {
  order: {
    orderId: string;
    cropName: string;
    farmerName: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    cropSubtotal: number;
    platformFeeAmount: number;
    transportationFeeAmount: number;
    gstOnFeesAmount: number;
    grandTotal: number;
  };
  onClose: () => void;
  onPayment: (orderId: string) => Promise<void>;
}

export default function PaymentWindow({
  order,
  onClose,
  onPayment,
}: PaymentWindowProps) {
  const [paying, setPaying] = useState(false);

  const handlePayment = async () => {
    try {
      setPaying(true);
      await onPayment(order.orderId);
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* HEADER */}
        <div className="px-6 py-5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">
                PAYMENT REQUEST
              </p>

              <h2 className="text-xl font-semibold text-gray-800 mt-1">
                Complete your order
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Order #{order.orderId}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* ORDER DETAILS */}
        <div className="px-6 py-5">

          <div className="rounded-2xl bg-green-50 border border-green-100 p-4 mb-5">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500">
                  Crop
                </p>

                <p className="font-semibold text-gray-800">
                  🌿 {order.cropName}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">
                  Farmer
                </p>

                <p className="font-medium text-gray-800">
                  {order.farmerName}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-green-200 flex justify-between text-sm">
              <span className="text-gray-500">
                Quantity
              </span>

              <span className="font-medium">
                {order.quantity} {order.unit}
              </span>
            </div>

            <div className="mt-2 flex justify-between text-sm">
              <span className="text-gray-500">
                Price
              </span>

              <span className="font-medium">
                ₹{order.pricePerUnit.toLocaleString("en-IN")} / {order.unit}
              </span>
            </div>
          </div>

          {/* PRICE BREAKDOWN */}
          <div className="space-y-3">

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Crop value
              </span>

              <span>
                ₹{order.cropSubtotal.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Platform fee
              </span>

              <span>
                ₹{order.platformFeeAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Transportation
              </span>

              <span>
                ₹{order.transportationFeeAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                GST on fees
              </span>

              <span>
                ₹{order.gstOnFeesAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <span className="font-semibold text-gray-800">
                Total payable
              </span>

              <span className="text-2xl font-bold text-green-600">
                ₹{order.grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* VERIFICATION STATUS */}
          <div className="mt-5 rounded-2xl bg-gray-50 p-4 space-y-2">

            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">✓</span>
              <span>Company verification completed</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">✓</span>
              <span>Stock availability confirmed</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600">✓</span>
              <span>Order approved</span>
            </div>

          </div>

          {/* PAYMENT BUTTON */}
          <button
            onClick={handlePayment}
            disabled={paying}
            className="w-full mt-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3.5 font-semibold shadow-lg hover:shadow-xl hover:scale-[1.01] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {paying
              ? "Opening secure payment..."
              : `Pay ₹${order.grandTotal.toLocaleString("en-IN")}`}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            Secure payment powered by Razorpay
          </p>

        </div>
      </div>
    </div>
  );
}