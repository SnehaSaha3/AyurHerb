import React from "react";
import { HiLocationMarker, HiUserGroup, HiQrcode } from "react-icons/hi";
import FeatureItem from "./FeatureItem";
import LiveLocationSection from "./LiveLocationSection";
import Hero from "./Hero"; 
import { motion } from "framer-motion";
import HowItWorks from "./HowItWorks";

type Feature = {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};

function Homee() {
  const features: Feature[] = [
    {
      name: "Geo Tagging",
      icon: HiLocationMarker,
    },
    {
      name: "Buyer Connect",
      icon: HiUserGroup,
    },
    {
      name: "Efficient Tracking with QR Code",
      icon: HiQrcode,
    },
  ];

  return (
    <>
      {/* ✅ NEW HERO */}
      <Hero />

      {/* FEATURES SECTION */}
      <section className="bg-green-50 py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-green-800 mb-12"
          >
            Features
          </motion.h2>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                whileHover={{ scale: 1.05 }}
              >
                <FeatureItem name={item.name} Icon={item.icon} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <HowItWorks />

      {/* LIVE LOCATION */}
      <LiveLocationSection />
    </>
  );
}

export default Homee;