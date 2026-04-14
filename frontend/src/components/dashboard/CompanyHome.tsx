import { motion } from "framer-motion";

export default function CompanyHome() {
  return (
    <div className="space-y-8">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: "Active Orders", value: "32" },
          { title: "Pending", value: "12" },
          { title: "Delivered", value: "210" },
          { title: "Yearly Spend", value: "₹2.4L" },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -3 }}
            className="bg-white rounded-2xl p-5 border shadow-sm"
          >
            <p className="text-xs text-gray-500">{item.title}</p>
            <p className="text-xl font-semibold mt-1">{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Map */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <div className="flex justify-between mb-4">
          <h3 className="font-medium text-lg">🌍 Farmer Discovery</h3>
          <button className="text-sm text-green-600">Filter</button>
        </div>

        <div className="h-64 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
          Map integration here
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Orders */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-medium mb-4">Recent Orders</h3>

          {[
            { name: "Tulsi", qty: 50 },
            { name: "Aloe Vera", qty: 120 },
          ].map((o, i) => (
            <div
              key={i}
              className="flex justify-between p-3 border rounded-xl mb-2 hover:bg-gray-50"
            >
              <span>{o.name}</span>
              <span className="text-xs text-green-600">{o.qty}</span>
            </div>
          ))}
        </div>

        {/* Shipments */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-medium mb-4">Shipment Status</h3>

          {["Packed", "Shipped", "Out for Delivery"].map((s, i) => (
            <div key={i} className="p-3 border rounded-xl mb-2 text-sm">
              🚚 {s}
            </div>
          ))}
        </div>

        {/* Top Farmers */}
        <div className="bg-white rounded-2xl p-5 border shadow-sm">
          <h3 className="font-medium mb-4">Top Farmers</h3>

          {["Ravi Kumar", "Anita Das", "Sneha Saha"].map((f, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg"
            >
              <span className="text-sm">{f}</span>
              <span className="text-xs text-gray-400">⭐ 4.{i + 5}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-white rounded-2xl p-6 border shadow-sm">
        <h3 className="font-medium mb-4">Expense Analytics</h3>

        <div className="h-40 flex items-center justify-center text-gray-400">
          📊 Chart (Recharts later)
        </div>
      </div>

    </div>
  );
}