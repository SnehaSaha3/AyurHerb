import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import { Leaf, Building2 } from "lucide-react"
import { Link } from "react-router-dom"
import type {JSX} from "react"

function RegistrationPage(): JSX.Element {

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-800">
          Choose Your Role
        </h1>
        <p className="text-gray-500 mt-3">
          Select how you want to join the AyurHerb ecosystem
        </p>
      </motion.div>

      {/* Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl"
      >

        {/* Farmer Card */}
        <motion.div variants={cardVariants}>
          <Link
            to="/farmer-registration"
            className="group bg-white border border-gray-100 shadow-md hover:shadow-2xl rounded-2xl p-8 flex flex-col items-center text-center transition duration-300 hover:-translate-y-2"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 3 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-green-100 text-green-700 w-20 h-20 flex items-center justify-center rounded-full mb-5"
            >
              <Leaf size={36} />
            </motion.div>

            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Farmer Registration
            </h2>

            <p className="text-gray-500 mb-6 leading-relaxed">
              Register as a farmer to manage your crops, track your produce, and
              connect directly with verified companies.
            </p>

            <span className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium group-hover:bg-green-700 transition">
              Register as Farmer
            </span>
          </Link>
        </motion.div>

        {/* Company Card */}
        <motion.div variants={cardVariants}>
          <Link
            to="/company-registration"
            className="group bg-white border border-gray-100 shadow-md hover:shadow-2xl rounded-2xl p-8 flex flex-col items-center text-center transition duration-300 hover:-translate-y-2"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: -3 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="bg-blue-100 text-blue-700 w-20 h-20 flex items-center justify-center rounded-full mb-5"
            >
              <Building2 size={36} />
            </motion.div>

            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Company Registration
            </h2>

            <p className="text-gray-500 mb-6 leading-relaxed">
              Register your company to discover farmers, source quality crops,
              and build direct partnerships.
            </p>

            <span className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium group-hover:bg-blue-700 transition">
              Register as Company
            </span>
          </Link>
        </motion.div>

      </motion.div>
    </div>
  )
}

export default RegistrationPage