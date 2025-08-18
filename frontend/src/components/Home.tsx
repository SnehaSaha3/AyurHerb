import React from 'react'
import Hero from "../assets/Hero.jpg"
import { HiLocationMarker, HiUserGroup , HiQrcode } from "react-icons/hi"
import FeatureItem from './FeatureItem'
import LiveLocationSection from "./LiveLocationSection"

function Homee() {
    const features =[
        {
        name: "Geo Tagging",
        icon:HiLocationMarker
    },
    {
        name: "Buyer Connect",
        icon:HiUserGroup
    },
    {
        name: "Efficient Tracking With QR Code",
        icon:HiQrcode
    }
]
      

  return (
    <>
    <section
      className= "relative w-full h-[65vh] flex items-center justify-center bg-cover bg-center mb-0"
      style={{ backgroundImage: `url(${Hero})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl text-center text-white px-6">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
          Connecting Farmers with the World
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-200">
          Empowering communities through sustainable herbal farming and 
          connecting them directly to the global market.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full text-lg font-medium transition">
            Register Now
          </button>
          <button className="bg-white text-green-700 hover:bg-gray-100 px-6 py-3 rounded-full text-lg font-medium transition">
            Learn More
          </button>
        </div>
      </div>
    </section>
    <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-green-800 mb-12">
                 Features
              </h2>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {features.map((item) => (
  <FeatureItem
    key={item.name}
    name={item.name}
    Icon={item.icon}
  />
))}
</div>
</div>

       </section>
       <LiveLocationSection />
    </>
  )
}

export default Homee