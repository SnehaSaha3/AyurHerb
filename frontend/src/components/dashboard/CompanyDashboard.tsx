import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Package,
  Truck,
  BarChart3,
  MessageSquare,
  Bell,
  Search,
} from "lucide-react";


export default function CompanyDashboard() {
  const menu = [
    { name: "Dashboard", icon: <LayoutDashboard /> },
    { name: "Explore Farmers", icon: <Map /> },
    { name: "Orders", icon: <Package /> },
    { name: "Shipments", icon: <Truck /> },
    { name: "Analytics", icon: <BarChart3 /> },
    { name: "Messages", icon: <MessageSquare /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">

      {/* Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur border-r px-6 py-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-green-600 mb-8">
            🌿 AyurHerb
          </h1>

          <nav className="space-y-2">
            {menu.map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition
                  ${i === 0
                    ? "bg-green-100 text-green-700 font-medium"
                    : "hover:bg-gray-100 text-gray-600"
                  }`}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </motion.div>
            ))}
          </nav>
        </div>

        <p className="text-xs text-gray-400">© 2026 AyurHerb</p>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 py-6 space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">

          {/* Search */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border w-72">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search farmers, crops..."
              className="outline-none text-sm w-full"
            />
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Bell className="text-gray-500 cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">
              S
            </div>
          </div>
        </div>

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

      </main>
    </div>
  );
}