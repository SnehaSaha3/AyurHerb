import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CloudRain,
  MapPinned,
  Sprout,
  Package,
} from "lucide-react";

import WeatherCard from "../services/Weather";
import FarmerBusinessActivity from "../business/FarmerBusinessActivity";
import FarmerGreeting from "../services/Greeting";
import DashboardInsight from "../dashboard/Dashboardinsights";
import { useFarm } from "./FarmContext";

const cardClass =
  "rounded-2xl border border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(31,69,39,0.05)]";

export default function FarmerHome() {
  const navigate = useNavigate();

  const { crops, geoTagged, farmLocation } = useFarm();

  const [showWeather, setShowWeather] = useState(false);

  const staticStats = [
    {
      label: "Total crops",
      value: crops.length,
      icon: Sprout,
      tint: "bg-[#e7f3e6] text-[#1f7a3d]",
    },
    {
      label: "Farm location",
      value: farmLocation ? "Connected" : "Not tagged",
      icon: MapPinned,
      tint: "bg-[#eef3ea] text-[#4d8957]",
    },
    {
      label: "Geo-tagged fields",
      value: geoTagged ? "Active" : "Pending",
      icon: Package,
      tint: "bg-[#fbf1e6] text-[#c68a3a]",
    },
  ];

  return (
    <div className="min-h-full min-w-0 space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-[#eef8ef] via-[#e9f5ea] to-[#dcefe0] px-7 py-7 sm:px-10 sm:py-8">
        <div className="relative z-10 max-w-xl">
          <FarmerGreeting />

          <h1 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight text-[#16321f] sm:text-4xl">
            Let's Build Together
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#4d6152]">
            From your fields to the market — AyurHerb supports your journey,
            every step of the way.
          </p>

          <button
            type="button"
            onClick={() => navigate("/farmer-dashboard/crops")}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#1f6b3a] to-[#2c8a48] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(31,107,58,0.25)] transition hover:shadow-[0_14px_30px_rgba(31,107,58,0.32)]"
          >
            Explore your farm
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-10 hidden h-[220px] w-[220px] rounded-full bg-gradient-to-br from-[#bfe0c6] to-[#8fc79b] opacity-60 blur-2xl sm:block" />

        <Sprout
          size={140}
          strokeWidth={0.9}
          className="pointer-events-none absolute -bottom-6 right-6 hidden text-[#4d8957]/25 sm:block"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {staticStats.map((stat) => (
          <div key={stat.label} className={`${cardClass} min-w-0 px-5 py-4`}>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.tint}`}
            >
              <stat.icon size={17} strokeWidth={1.8} />
            </div>

            <p className="mt-3 text-[11px] font-medium text-[#8b9888]">
              {stat.label}
            </p>

            <p className="mt-0.5 truncate text-xl font-semibold text-[#193522]">
              {stat.value}
            </p>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setShowWeather((value) => !value)}
          className={`${cardClass} min-w-0 px-5 py-4 text-left transition hover:border-[#cfe3d1]`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef5fb] text-[#5b9bd5]">
              <CloudRain size={17} strokeWidth={1.8} />
            </div>

            <ArrowRight
              size={13}
              className={`text-[#8b9888] transition-transform ${
                showWeather ? "rotate-90" : ""
              }`}
            />
          </div>

          <p className="mt-3 text-[11px] font-medium text-[#8b9888]">
            Farm weather
          </p>

          <p className="mt-0.5 truncate text-xl font-semibold text-[#193522]">
            {farmLocation ? "Tap to view" : "Not tagged"}
          </p>
        </button>
      </div>

      {showWeather && (
        <div className={`${cardClass} p-5`}>
          {farmLocation ? (
            <WeatherCard lat={farmLocation.lat} lng={farmLocation.lng} />
          ) : (
            <div className="py-6 text-center">
              <MapPinned size={22} className="mx-auto text-[#8aa58d]" />
              <p className="mt-2 text-sm font-medium text-[#314b36]">
                Farm location required
              </p>
              <p className="mt-1 text-xs text-[#8b9888]">
                Geo-tag your farm to view local weather.
              </p>
              <button
                type="button"
                onClick={() => navigate("/farmer-dashboard/geotagged")}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#28733d] hover:text-[#175f2c]"
              >
                Add farm location
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DashboardInsight />
        </div>

        <div className={`${cardClass} min-w-0 self-start overflow-hidden p-5`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#193522]">
              Recent activity
            </h2>

            <button
              type="button"
              onClick={() => navigate("/farmer-dashboard/shipments")}
              className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#28733d] hover:text-[#175f2c]"
            >
              View all
            </button>
          </div>

          <div className="min-w-0 overflow-x-auto">
            <FarmerBusinessActivity />
          </div>
        </div>
      </div>
    </div>
  );
}