import MapComponent from "./MapCom";
import { motion } from "framer-motion";

function LiveLocationSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6">

        {/* Section Heading */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-green-800">
            Live Farmer Locations
          </h2>
          <p className="mt-3 text-gray-600 max-w-xl mx-auto">
            Track farms in real-time and ensure transparency between farmers and buyers.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-gradient-to-br from-green-50 via-white to-green-100 rounded-2xl shadow-lg p-8 grid md:grid-cols-2 gap-10 items-center">

          {/* LEFT TEXT */}
          <div>
            <h3 className="text-xl font-semibold text-green-800 mb-4">
              Smart Location Tracking
            </h3>

            <p className="text-gray-600 leading-relaxed mb-6">
              Our platform enables real-time GPS-based tracking of farms, ensuring
              visibility, trust, and better coordination between farmers and companies.
            </p>

            <ul className="space-y-3 text-gray-600 text-sm">
              <li>📍 Accurate GPS-based location tracking</li>
              <li>🌿 Farm-to-market transparency</li>
              <li>⚡ Real-time updates for buyers</li>
            </ul>
          </div>

          {/* RIGHT MAP */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl overflow-hidden shadow-xl border"
          >
            <MapComponent />
          </motion.div>

        </div>
      </div>
    </section>
  );
}

export default LiveLocationSection;