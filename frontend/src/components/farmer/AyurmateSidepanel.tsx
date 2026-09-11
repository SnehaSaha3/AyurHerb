import { Sparkles } from "lucide-react";
import ChatbotCard from "../ChatbotCard";
import { useFarm } from "./FarmContext";

export default function AyurMateSidePanel() {
  const { farmLocation, weatherData } = useFarm();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-[#e3ebe0] px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eaf4e7] text-[#1f7a3d]">
          <Sparkles size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9aa897]">
            Farmer Assistant
          </p>
          <h2 className="text-sm font-semibold text-[#16321f]">AyurMate</h2>
          <p className="truncate text-xs text-[#8a9a87]">
            Your interface for crop intelligence, IoT data and farm agents.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ChatbotCard farmLocation={farmLocation} weatherData={weatherData} />
      </div>
    </div>
  );
}