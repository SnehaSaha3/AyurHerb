import { Leaf, Building2 } from "lucide-react"
import { Link } from "react-router-dom"
function RegistrationPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Registration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">

        {/* Farmer */}
        <Link
          to="/farmer-registration"
          className="bg-white shadow-md hover:shadow-xl rounded-2xl p-6 flex flex-col items-center text-center transition"
        >
          <div className="bg-green-100 text-green-700 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <Leaf size={32} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Farmer Registration</h2>
          <p className="text-gray-600 mb-4">Register as a farmer to manage crops and connect with companies.</p>
          <span className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Register
          </span>
        </Link>

       {/* Company */}
        <Link
          to="/company-registration"
          className="bg-white shadow-md hover:shadow-xl rounded-2xl p-6 flex flex-col items-center text-center transition"
        >
          <div className="bg-blue-100 text-blue-700 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <Building2 size={32} />
          </div>
          <h2 className="text-xl font-semibold mb-2">Company Registration</h2>
          <p className="text-gray-600 mb-4">Register your company to collaborate with farmers and source crops.</p>
          <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Register
          </span>
        </Link>

      </div>
    </div>
  )
}

export default RegistrationPage