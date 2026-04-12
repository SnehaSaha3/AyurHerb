import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  AlertCircle,
  Bell,
  Search,
} from "lucide-react";
import { useState } from "react";

export default function AdminLayout() {
  const [active, setActive] = useState("Overview");

  const menu = [
    { name: "Overview", icon: <LayoutDashboard /> },
    { name: "Farmers", icon: <Users /> },
    { name: "Companies", icon: <Users /> },
    { name: "Orders", icon: <Package /> },
    { name: "Transactions", icon: <BarChart3 /> },
    { name: "Disputes", icon: <AlertCircle /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r px-5 py-6 flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-semibold text-green-600 mb-8">
            ⚙️ System Admin
          </h1>

          <nav className="space-y-2">
            {menu.map((item) => (
              <motion.div
                key={item.name}
                whileHover={{ x: 5 }}
                onClick={() => setActive(item.name)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition
                  ${
                    active === item.name
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

        <p className="text-xs text-gray-400">Platform Control Panel</p>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Topbar */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl w-72">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search users, orders..."
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <Bell className="text-gray-500 cursor-pointer" />

            <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm">
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}