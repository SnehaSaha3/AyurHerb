import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Package,
  Truck,
  BarChart3,
  MessageSquare,
} from "lucide-react";

export default function CompanyDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-5">
        <h1 className="text-xl font-bold text-green-600 mb-6">
          🌿 AyurHerb
        </h1>

        <nav className="space-y-4">
          {[
            { name: "Dashboard", icon: <LayoutDashboard /> },
            { name: "Explore Farmers", icon: <Map /> },
            { name: "Orders", icon: <Package /> },
            { name: "Shipments", icon: <Truck /> },
            { name: "Analytics", icon: <BarChart3 /> },
            { name: "Messages", icon: <MessageSquare /> },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 5 }}
              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-green-50"
            >
              {item.icon}
              {item.name}
            </motion.div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 space-y-6">

        {/* Top Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: "Active Orders", value: "32" },
            { title: "Pending Shipments", value: "12" },
            { title: "Yearly Spend", value: "₹2.4L" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white p-5 rounded-2xl shadow-sm border"
            >
              <p className="text-gray-500 text-sm">{item.title}</p>
              <p className="text-2xl font-bold text-gray-800">
                {item.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Map Section (CORE FEATURE 🔥) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">
            🌍 Find Farmers Near You
          </h2>

          <div className="h-64 flex items-center justify-center text-gray-400">
            Map with geo-tagged farmers will appear here
          </div>
        </div>

        {/* Orders + Tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Orders */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h3 className="font-semibold mb-4">Recent Orders</h3>

            {["Tulsi - 50 units", "Aloe Vera - 120 units"].map((o, i) => (
              <div key={i} className="p-3 border rounded-xl mb-2">
                {o}
              </div>
            ))}
          </div>

          {/* Shipment Tracking */}
          <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <h3 className="font-semibold mb-4">Shipment Tracking</h3>

            {["Order Packed", "Out for Delivery"].map((s, i) => (
              <div key={i} className="p-3 border rounded-xl mb-2">
                🚚 {s}
              </div>
            ))}
          </div>
        </div>

        {/* Analytics */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="font-semibold mb-4">Expense Analytics</h3>

          <div className="h-40 flex items-center justify-center text-gray-400">
            📊 Year-wise spending chart
          </div>
        </div>

      </main>
    </div>
  );
}