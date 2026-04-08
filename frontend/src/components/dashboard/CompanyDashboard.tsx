import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Leaf, MessageSquare } from "lucide-react";

export default function CompanyDashboard() {
  const [stats] = useState([
    { title: "Total Farmers", value: "1,240", icon: <Users /> },
    { title: "Active Crops", value: "3,560", icon: <Leaf /> },
    { title: "Messages", value: "128", icon: <MessageSquare /> },
    { title: "Analytics", value: "89%", icon: <BarChart3 /> },
  ]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-6 bg-gray-50 min-h-screen space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Company Dashboard</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-green-600 text-white px-4 py-2 rounded-xl shadow"
        >
          + Add Partner
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((s, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -5 }}
            className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer"
          >
            <motion.div
              whileHover={{ rotate: 10 }}
              className="p-2 bg-green-100 rounded-lg text-green-600"
            >
              {s.icon}
            </motion.div>
            <div>
              <p className="text-sm text-gray-500">{s.title}</p>
              <p className="text-xl font-semibold text-gray-800">
                {s.value}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left - Farmers */}
        <motion.div
          variants={item}
          className="bg-white rounded-2xl p-5 border shadow-sm lg:col-span-2"
        >
          <h2 className="text-lg font-semibold mb-4">Registered Farmers</h2>
          <div className="space-y-3">
            {["Sneha Saha", "Ravi Kumar", "Anita Das"].map((name, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="flex justify-between items-center p-3 border rounded-xl cursor-pointer"
              >
                <div>
                  <p className="font-medium text-gray-800">{name}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
                <button className="text-sm text-green-600">View</button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right - Activity */}
        <motion.div
          variants={item}
          className="bg-white rounded-2xl p-5 border shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <ul className="space-y-3 text-sm text-gray-600">
            {["🌱 New crop added", "📍 Geo tag updated", "💬 Message sent", "🌦 Weather updated"].map((act, i) => (
              <motion.li key={i} whileHover={{ x: 5 }}>
                {act}
              </motion.li>
            ))}
          </ul>
        </motion.div>

      </div>

      {/* Bottom Section */}
      <motion.div
        variants={item}
        className="bg-white rounded-2xl p-5 border shadow-sm"
      >
        <h2 className="text-lg font-semibold mb-4">Insights</h2>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-40 flex items-center justify-center text-gray-400"
        >
          Chart / Analytics coming here 📊
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
