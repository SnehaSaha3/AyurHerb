import { motion, type Variants } from "framer-motion";
import { Leaf } from "lucide-react";

const container: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const pulse: Variants = {
  animate: {
    scale: [1, 1.4, 1],
    opacity: [0.5, 1, 0.5],
    transition: {
      repeat: Infinity,
      duration: 1.2,
    },
  },
};

export default function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-green-100 backdrop-blur-md">
      
      <motion.div
        className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/60 shadow-xl backdrop-blur-lg"
        variants={container}
        animate="animate"
      >
        <motion.div variants={pulse} animate="animate">
          <Leaf className="w-10 h-10 text-green-600" />
        </motion.div>

        <p className="text-green-700 font-medium tracking-wide">
          Loading Ayurherb…
        </p>
      </motion.div>

    </div>
  );
}