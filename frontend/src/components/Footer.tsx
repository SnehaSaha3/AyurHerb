import React from "react";

function Footer() {
  return (
    <footer className="bg-gradient-to-b from-green-900 to-green-800 text-green-100 pt-16 pb-8 mt-20">
      <div className="max-w-5xl mx-auto px-6">

        {/* Top Section */}
        <div className="grid md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              AyurHerb
            </h2>
            <p className="mt-3 text-sm text-green-200 leading-relaxed">
              Connecting farmers directly with companies through a transparent,
              technology-driven platform.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-green-100 mb-4 uppercase tracking-wide">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-green-200">
              <li className="hover:text-white cursor-pointer transition">
                Home
              </li>
              <li className="hover:text-white cursor-pointer transition">
                About
              </li>
              <li className="hover:text-white cursor-pointer transition">
                Search
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-green-100 mb-4 uppercase tracking-wide">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-green-200">
              <li className="hover:text-white cursor-pointer transition">
                Privacy Policy
              </li>
              <li className="hover:text-white cursor-pointer transition">
                Terms & Conditions
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-green-400/40 to-transparent mb-6"></div>

        {/* Bottom */}
        <div className="text-center text-sm text-green-300">
          © {new Date().getFullYear()} AyurHerb. All rights reserved.
        </div>
        <div className="text-center text-xs text-green-400 mt-1">
                Built by Sneha
       </div>
      </div>
    </footer>
  );
}

export default Footer;