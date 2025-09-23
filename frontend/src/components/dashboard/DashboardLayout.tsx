import { Link, Outlet } from "react-router-dom";
import { Leaf, MapPin, User, Home as HomeIcon } from "lucide-react";
import type { JSX, ReactNode } from "react";

type DashboardProps = {
  userType: string;
  links: { name: string; path: string }[];
  children?: ReactNode;
  farmerName?: string;
};

export default function DashboardLayout({
  userType,
  links,
  children,
  // farmerName,
}: DashboardProps) {
  const iconMap: Record<string, JSX.Element> = {
    Home: <HomeIcon className="w-5 h-5 mr-2 text-blue-500" />,
    "My Crops": <Leaf className="w-5 h-5 mr-2 text-green-500" />,
    "Geo Tagging": <MapPin className="w-5 h-5 mr-2 text-red-500" />,
    Profile: <User className="w-5 h-5 mr-2 text-purple-500" />,
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-200 border-r p-4 space-y-4">
        <h2 className="text-xl font-bold mb-2 capitalize">
          {userType} Dashboard
        </h2>
        {/* {farmerName && (
          <p className="text-gray-700 font-medium">👨‍🌾 {farmerName}</p>
        )} */}

        <ul className="space-y-3 mt-4">
          {links.map((link) => (
            <li key={link.path}>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-gray-50 overflow-y-auto">
        {/* Prefer nested route content over children */}
        {children ? children : <Outlet />}
      </main>
    </div>
  );
}
