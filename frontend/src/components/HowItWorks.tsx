import { motion } from "framer-motion";
import { HiLocationMarker, HiShieldCheck, HiLink, HiCube } from "react-icons/hi";

const steps = [
  {
    title: "Geo-tagged Farming",
    desc: "Every farm is mapped with precise location data.",
    icon: HiLocationMarker,
  },
  {
    title: "Blockchain Security",
    desc: "Data is secured and verifiable for trust.",
    icon: HiShieldCheck,
  },
  {
    title: "Direct Buyer Connect",
    desc: "Companies connect without middlemen.",
    icon: HiLink,
  },
  {
    title: "Transparent Supply Chain",
    desc: "Track crops from farm to buyer.",
    icon: HiCube,
  },
];

function HowItWorks() {
  return (
    <section className="py-24 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-5xl mx-auto px-6">

        {/* Heading */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-green-800">
            Smart System Behind AyurHerb
          </h2>
          <p className="mt-3 text-gray-600">
            Designed for trust, transparency, and efficiency
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">

          {/* Vertical Line */}
          <div className="absolute left-1/2 top-0 h-full w-[2px] bg-green-200 transform -translate-x-1/2"></div>

          <div className="space-y-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLeft = index % 2 === 0;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                  className={`flex items-center ${
                    isLeft ? "justify-start" : "justify-end"
                  }`}
                >
                  <div className="w-full md:w-1/2 flex items-center gap-6">

                    {/* Content */}
                    <div className="bg-white shadow-md rounded-xl p-6 border border-gray-100 hover:shadow-lg transition">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">
                        {step.desc}
                      </p>
                    </div>

                    {/* Icon Node */}
                    <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shadow-lg">
                      <Icon className="text-xl" />
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

export default HowItWorks;