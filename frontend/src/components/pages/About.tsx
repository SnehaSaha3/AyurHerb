import { motion } from "framer-motion";
import { HiGlobe, HiShieldCheck, HiLocationMarker } from "react-icons/hi";

function About() {
  return (
    <div className="bg-white">

      {/* HERO */}
      <section className="py-24 bg-gradient-to-b from-green-50 to-white text-center">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-green-800"
          >
            About AyurHerb
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-5 text-lg text-gray-600 leading-relaxed"
          >
            AyurHerb connects farmers directly with buyers, eliminating middlemen and enabling
            transparent, fair, and technology-driven agricultural trade.
          </motion.p>
        </div>
      </section>

      {/* STATS */}
      {/* <section className="py-16 bg-white text-center">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-3xl font-bold text-green-700">100+</h3>
            <p className="text-gray-600 mt-2">Farmers Registered</p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-green-700">50+</h3>
            <p className="text-gray-600 mt-2">Verified Buyers</p>
          </div>

          <div>
            <h3 className="text-3xl font-bold text-green-700">1000+</h3>
            <p className="text-gray-600 mt-2">Crops Listed</p>
          </div>
        </div>
      </section> */}

      {/* PROBLEM → SOLUTION */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

          {/* Problem */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              The Problem
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Farmers often struggle with lack of direct market access, middlemen,
              and limited transparency in pricing and demand.
            </p>
          </motion.div>

          {/* Solution */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-semibold text-green-800 mb-4">
              Our Solution
            </h2>
            <p className="text-gray-600 leading-relaxed">
              AyurHerb bridges this gap by providing a direct connection between
              farmers and buyers, powered by geo-tagging, real-time tracking, and
              transparent systems.
            </p>
          </motion.div>

        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-green-50">
        <div className="max-w-5xl mx-auto px-6 text-center">

          <h2 className="text-3xl font-bold text-green-800 mb-12">
            What Makes Us Different
          </h2>

          <div className="grid md:grid-cols-3 gap-8">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition duration-300"
            >
              <HiLocationMarker className="text-3xl text-green-600 mx-auto" />
              <h3 className="mt-4 font-semibold">Geo-tagging</h3>
              <p className="text-sm text-gray-600 mt-2">
                Every farm is mapped for transparency and traceability.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition duration-300"
            >
              <HiShieldCheck className="text-3xl text-green-600 mx-auto" />
              <h3 className="mt-4 font-semibold">Secure System</h3>
              <p className="text-sm text-gray-600 mt-2">
                Ensuring trust with transparent and reliable data systems.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition duration-300"
            >
              <HiGlobe className="text-3xl text-green-600 mx-auto" />
              <h3 className="mt-4 font-semibold">Direct Marketplace</h3>
              <p className="text-sm text-gray-600 mt-2">
                Farmers connect directly with buyers without intermediaries.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* VISION */}
      <section className="py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">

          <h2 className="text-3xl font-bold text-green-800">
            Our Vision
          </h2>

          <p className="mt-5 text-gray-600 leading-relaxed">
            To create a transparent, technology-driven agricultural ecosystem
            where farmers are empowered, supply chains are visible, and trust is built
            through innovation.
          </p>

        </div>
      </section>

    </div>
  );
}

export default About;