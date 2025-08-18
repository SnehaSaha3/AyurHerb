import React from "react";
import MapComponent from "./MapCom";

function LiveLocationSection() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-bold text-green-800 mb-4">
              Live Location Tracking
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              See real-time locations of our farmers and herbal farms. This
              helps in ensuring transparency, building trust, and enabling
              better coordination between farmers and buyers.
            </p>
            <ul className="space-y-3 text-gray-600">
              <li>✅ Accurate GPS-based location tracking</li>
              <li>✅ Supports farm-to-market visibility</li>
              <li>✅ Real-time updates for buyers</li>
            </ul>
          </div>
          <div>
            <MapComponent />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LiveLocationSection;
