import { motion } from "framer-motion";
import CropMap from "../maps/CropMap";

export default function CompanyHome() {
  return (
    <div className="space-y-10">

      {/* 🔹 HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Welcome back 👋
        </h1>
        <p className="text-sm text-gray-500">
          Manage farmers, orders and analytics in one place
        </p>
      </div>

      {/* 🔹 STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Active Orders", value: "32" },
          { title: "Pending", value: "12" },
          { title: "Delivered", value: "210" },
          { title: "Yearly Spend", value: "₹2.4L" },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -6 }}
            className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-lg transition duration-300"
          >
            <p className="text-xs text-gray-400">{item.title}</p>
            <p className="text-2xl font-semibold mt-2 text-gray-800">
              {item.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* 🔹 FARMER DISCOVERY */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h3 className="font-semibold text-lg text-gray-800">
              🌍 Farmer Discovery
            </h3>
            <p className="text-xs text-gray-500">
              Explore geo-tagged farmers and crops
            </p>
          </div>

          <button className="text-sm bg-green-50 text-green-600 px-3 py-1 rounded-lg hover:bg-green-100 transition">
            Filter
          </button>
        </div>

        {/* Map */}
        <div className="h-[500px]">
          <CropMap />
        </div>
      </div>

      {/* 🔹 GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Orders */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">
            Recent Orders
          </h3>

          {[
            { name: "Tulsi", qty: 50 },
            { name: "Aloe Vera", qty: 120 },
          ].map((o, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-3 border rounded-xl mb-2 hover:bg-gray-50 transition"
            >
              <span className="text-sm">{o.name}</span>
              <span className="text-xs text-green-600 font-medium">
                {o.qty} units
              </span>
            </div>
          ))}
        </div>

        {/* Shipments */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">
            Shipment Status
          </h3>

          {["Packed", "Shipped", "Out for Delivery"].map((s, i) => (
            <div
              key={i}
              className="p-3 border rounded-xl mb-2 text-sm flex items-center gap-2"
            >
              🚚 {s}
            </div>
          ))}
        </div>

        {/* Top Farmers */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-medium mb-4 text-gray-700">
            Top Farmers
          </h3>

          {["Ravi Kumar", "Anita Das", "Sneha Saha"].map((f, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg"
            >
              <span className="text-sm">{f}</span>
              <span className="text-xs text-yellow-500">
                ⭐ 4.{i + 5}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 🔹 ANALYTICS */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <h3 className="font-medium mb-4 text-gray-700">
          Expense Analytics
        </h3>

        <div className="h-48 flex items-center justify-center text-gray-400">
          📊 Chart (Recharts next)
        </div>
      </div>

    </div>
  );
}