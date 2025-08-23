import { Link } from 'react-router-dom'
import { Leaf, MapPin, User, Home } from "lucide-react"
import type { JSX, ReactNode } from 'react'

type DashboardProps = {
  userType: string  
  links: { name: string; path: string }[]
  children?: ReactNode  
  farmerName?: string
}

function DashboardLayout({ userType, links, children, farmerName }: DashboardProps) {
  const iconMap: Record<string, JSX.Element> = {
    "Home": <Home className="w-5 h-5 mr-2 text-blue-500" />,
    "My Crops": <Leaf className="w-5 h-5 mr-2 text-green-500" />,
    "Geo Tagging": <MapPin className="w-5 h-5 mr-2 text-red-500" />, 
    "Profile": <User className="w-5 h-5 mr-2 text-purple-500" />,
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-blue-200 border-r p-4 space-y-4">
        <h2 className="text-xl font-bold mb-2 capitalize">
          {userType} Dashboard
        </h2>
        {/* Show farmer name only if passed */}
        {farmerName && (
          <p className="text-gray-700 font-medium">👨‍🌾 {farmerName}</p>
        )}

        <ul className="space-y-3 mt-4">
          {links.map((link, index) => (
            <li key={index}>
              <Link
                to={link.path}
                className="flex items-center p-3 rounded-xl shadow-md bg-white hover:bg-gray-50 hover:shadow-lg transition"
              >
                {iconMap[link.name] || null}
                <span className="font-medium text-gray-700">{link.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
        {children || (
          <>
            <h1 className="text-2xl font-bold mb-4">
              Welcome {farmerName ? farmerName : `to the ${userType} dashboard`}
            </h1>
            <p className="text-gray-600">Here you can manage your activities.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardLayout
