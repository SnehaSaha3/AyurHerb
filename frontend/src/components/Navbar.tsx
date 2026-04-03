import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

function Navbar() {
  const location = useLocation();

  const menu = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Search", path: "/search" },
  ];

  return (
    <nav className="w-full sticky top-0 z-50 backdrop-blur-lg bg-white/70 border-b border-green-100">
      
      {/* ⬇️ Reduced width + padding */}
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center">
          <img
            src={logo}
            className="w-[85px] object-contain"
            alt="logo"
          />
        </Link>

        {/* MENU */}
        <div className="hidden md:flex items-center gap-6">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className="relative text-[14px] font-medium text-gray-700 transition"
              >
                <span
                  className={`${
                    isActive
                      ? "text-green-700"
                      : "hover:text-green-600"
                  }`}
                >
                  {item.name}
                </span>

                {isActive && (
                  <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-green-600 rounded-full"></span>
                )}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          to="/registration"
          className="px-4 py-1.5 text-sm font-medium text-green-700 border border-green-600 rounded-full hover:bg-green-600 hover:text-white transition"
        >
          Login
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;