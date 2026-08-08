import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";

function Navbar() {
  const location = useLocation();
  const [loginOpen, setLoginOpen] = useState(false);

  const menu = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Search", path: "/search" },
  ];

  return (
    <nav>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} className="w-[85px] object-contain" alt="logo" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.name} to={item.path} className="relative text-[14px] font-medium text-gray-700 transition">
                <span className={isActive ? "text-green-700" : "hover:text-green-600"}>
                  {item.name}
                </span>
                {isActive && (
                  <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-green-600 rounded-full"></span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="relative">
          <button
            onClick={() => setLoginOpen((prev) => !prev)}
            className="px-4 py-1.5 text-sm font-medium text-green-700 border border-green-600 rounded-full hover:bg-green-600 hover:text-white transition"
          >
            Login
          </button>

          {loginOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg overflow-hidden z-10">
              <Link to="/farmer-login" onClick={() => setLoginOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
                Login as Farmer
              </Link>
              <Link to="/company-login" onClick={() => setLoginOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50">
                Login as Company
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;