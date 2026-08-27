import { useEffect, useState } from "react";
import axios from "axios";

interface Tranche {
  type: "shipment" | "delivery";
  percent: number;
  amount: number;
  status: "pending" | "released";
  releasedAt?: string;
  chainTxHash?: string;
}

interface Order {
  _id: string;
  cropName: string;
  quantity: number;
  status: string;
  tranches?: Tranche[];
}

export default function CompanyShipments() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const token = localStorage.getItem("companyToken");

        if (!token) return;

        const res = await axios.get(
          "http://localhost:8000/api/orders/company",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data.success) {
          setOrders(res.data.orders || []);
        }
      } catch (error) {
        console.error("Failed to fetch shipments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        Loading shipments...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Shipments
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Track shipment and delivery release status.
        </p>
      </div>

      <div className="grid gap-4">

        {orders.map((order) => {

          const shipment = order.tranches?.find(
            (tranche) => tranche.type === "shipment"
          );

          const delivery = order.tranches?.find(
            (tranche) => tranche.type === "delivery"
          );

          return (
            <div
              key={order._id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-semibold text-gray-800">
                    {order.cropName}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {order.quantity} kg
                  </p>
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {order.status}
                </span>

              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">

                <div className="rounded-xl border p-4">

                  <p className="text-xs text-gray-400">
                    Shipment Release
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {shipment?.status === "released"
                      ? "🚚 Released"
                      : "Waiting"}
                  </p>

                  {shipment?.chainTxHash && (
                    <p className="mt-2 break-all text-xs text-gray-400">
                      TX: {shipment.chainTxHash}
                    </p>
                  )}

                </div>

                <div className="rounded-xl border p-4">

                  <p className="text-xs text-gray-400">
                    Delivery Release
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {delivery?.status === "released"
                      ? "✓ Delivered"
                      : "Waiting"}
                  </p>

                  {delivery?.chainTxHash && (
                    <p className="mt-2 break-all text-xs text-gray-400">
                      TX: {delivery.chainTxHash}
                    </p>
                  )}

                </div>

              </div>

            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="rounded-2xl border bg-white p-10 text-center text-sm text-gray-400">
            No shipments yet.
          </div>
        )}

      </div>

    </div>
  );
}