import { motion } from "framer-motion";
import { HiUser, HiGlobe, HiOfficeBuilding } from "react-icons/hi";

function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-green-50 via-white to-green-100 py-24 overflow-hidden">
      
      {/* 🌿 Background Glow */}
      <div className="absolute w-[350px] h-[350px] bg-green-200/30 rounded-full blur-3xl right-10 top-10"></div>

      <div className="relative max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

        {/* LEFT CONTENT */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-green-800 leading-[1.1] tracking-tight">
            Connecting Farmers Directly with Companies
          </h1>

          <p className="mt-6 text-lg text-gray-600 max-w-md">
            A seamless platform where farmers can register, showcase crops,
            and connect directly with buyers.
          </p>

          <div className="mt-10 flex gap-4 flex-wrap">
            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full text-base font-medium transition shadow-md">
              Register as Farmer
            </button>

            <button className="border border-green-600 text-green-700 px-6 py-3 rounded-full text-base font-medium hover:bg-green-50 transition">
              Join as Company
            </button>
          </div>
        </div>

        {/* RIGHT FLOW CARD */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white shadow-2xl rounded-2xl p-8 flex items-center justify-between gap-8 w-full"
        >
          {/* Farmer */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <HiUser className="text-2xl text-green-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700">Farmer</p>
          </div>

          {/* Arrow */}
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-green-500 text-xl"
          >
            →
          </motion.div>

          {/* Platform */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <HiGlobe className="text-2xl text-green-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700">Platform</p>
          </div>

          {/* Arrow */}
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-green-500 text-xl"
          >
            →
          </motion.div>

          {/* Company */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <HiOfficeBuilding className="text-2xl text-green-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700">Company</p>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

export default Hero;