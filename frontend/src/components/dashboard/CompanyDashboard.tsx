import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Package,
  Truck,
  BarChart3,
  MessageSquare,
  Bell,
  User,
} from "lucide-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useUnread } from "../../context/UnreadContext";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalUnread } = useUnread();

  const menu = [
    { name: "Dashboard", icon: <LayoutDashboard />, path: "/company-dashboard" },
    { name: "Explore Farmers", icon: <Map />, path: "/company-dashboard/explore" },
    { name: "Orders", icon: <Package />, path: "/company-dashboard/orders" },
    { name: "Shipments", icon: <Truck />, path: "/company-dashboard/shipments" },
    { name: "Analytics", icon: <BarChart3 />, path: "/company-dashboard/analytics" },
    { name: "Messages", icon: <MessageSquare />, path: "/company-dashboard/messages", badge: totalUnread },
    { name: "Profile", icon: <User />, path: "/company-dashboard/profile" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <aside className="w-64 bg-white/80 backdrop-blur border-r px-6 py-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-green-600 mb-8">🌿 AyurHerb</h1>

          <nav className="space-y-2">
            {menu.map((item, i) => {
              const isActive = location.pathname.startsWith(item.path);

              return (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition
                    ${isActive ? "bg-green-100 text-green-700 font-medium" : "hover:bg-gray-100 text-gray-600"}`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm">{item.name}</span>
                  </div>

                  {!!item.badge && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1.5 text-[11px] font-bold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </nav>
        </div>

        <p className="text-xs text-gray-400">© 2026 AyurHerb</p>
      </aside>

      <main className="flex-1 px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Bell className="text-gray-500 cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">S</div>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}