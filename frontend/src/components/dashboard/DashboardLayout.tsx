import { NavLink, Outlet } from "react-router-dom";
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
  farmerName,
}: DashboardProps) {
  const iconMap: Record<string, JSX.Element> = {
    Home: <HomeIcon className="w-5 h-5" />,
    "My Crops": <Leaf className="w-5 h-5" />,
    "Geo Tagging": <MapPin className="w-5 h-5" />,
    Profile: <User className="w-5 h-5" />,
  };

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col px-5 py-6">
        
        {/* Logo */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-green-600 tracking-tight">
            🌿 Ayurherb
          </h2>
          <p className="text-xs text-gray-400 mt-1 capitalize">
            {userType} Dashboard
          </p>

          {farmerName && (
            <p className="text-sm text-gray-600 mt-3">
              👨‍🌾 {farmerName}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition
                ${
                  isActive
                    ? "bg-green-100 text-green-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-lg">
                {iconMap[link.name]}
              </span>
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="text-xs text-gray-400 mt-6">
          © 2026 Ayurherb
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children ? children : <Outlet />}
        </div>

      </main>
    </div>
  );
}