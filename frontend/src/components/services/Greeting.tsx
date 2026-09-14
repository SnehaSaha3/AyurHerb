import { useEffect, useState } from "react";
import { useFarm } from "../farmer/FarmContext";

export default function FarmerGreeting() {
  const [greeting, setGreeting] = useState("");
  const { farmerName } = useFarm();

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  return (
    <p className="text-sm font-medium text-gray-500">
      {greeting}
      {farmerName ? `, ${farmerName}` : ""} 👩‍🌾
    </p>
  );
}