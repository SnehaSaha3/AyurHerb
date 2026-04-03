import React from "react";
import { motion } from "framer-motion";

type FeatureItemProps = {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
};

function FeatureItem({ name, Icon }: FeatureItemProps) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="group relative rounded-2xl overflow-hidden"
    >
      {/* 🌿 Soft Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-green-100 opacity-0 group-hover:opacity-100 transition duration-500"></div>

      {/* ✨ Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500">
        <div className="absolute -inset-1 bg-green-200/30 blur-xl"></div>
      </div>

      {/* Card Content */}
      <div className="relative bg-white rounded-2xl px-6 py-8 text-center border border-gray-100 group-hover:border-green-200 transition-all duration-300">

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition">
            <Icon className="text-green-600 text-2xl" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-700 transition">
          {name}
        </h3>

        {/* Subtle underline */}
        <div className="mt-3 h-[2px] w-0 bg-green-500 mx-auto transition-all duration-300 group-hover:w-10 rounded-full"></div>
      </div>
    </motion.div>
  );
}

export default FeatureItem;