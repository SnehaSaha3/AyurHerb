import React from 'react'

function Footer() {
   return (
    <footer className="bg-green-800 text-gray-100 py-6 mt-16">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-center items-center gap-4">
        
        <p className="text-sm text-gray-300 flex ">
          © {new Date().getFullYear()} AyurMate. All rights reserved.
        </p>

        
        <div className="flex space-x-6 text-sm text-gray-300">
          <a href="#" className="hover:text-white">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white">
            Terms & Conditions
          </a>
        </div>
      </div>
    </footer>
  );
}


export default Footer