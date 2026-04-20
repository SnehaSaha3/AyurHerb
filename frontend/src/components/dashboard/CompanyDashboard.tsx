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
} from "lucide-react"

import { Outlet, useNavigate, useLocation } from "react-router-dom";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { name: "Dashboard", icon: <LayoutDashboard />, path: "/company-dashboard" },
    { name: "Explore Farmers", icon: <Map />, path: "/company-dashboard/explore" },
    { name: "Orders", icon: <Package />, path: "/company-dashboard/orders" },
    { name: "Shipments", icon: <Truck />, path: "/company-dashboard/shipments" },
    { name: "Analytics", icon: <BarChart3 />, path: "/company-dashboard/analytics" },
    { name: "Messages", icon: <MessageSquare />, path: "/company-dashboard/messages" },
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
            {menu.map((item, i) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition
                    ${
                      isActive
                        ? "bg-green-100 text-green-700 font-medium"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                >
                  {item.icon}
                  <span className="text-sm">{item.name}</span>
                </motion.div>
              );
            })}
          </nav>
        </div>

        <p className="text-xs text-gray-400">© 2026 AyurHerb</p>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 py-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border w-72">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search farmers, crops..."
              className="outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center gap-4">
            <Bell className="text-gray-500 cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">
              S
            </div>
          </div>
        </div>

        {/* 🔥 Dynamic Content */}
        <Outlet />

      </main>
    </div>
  );
}