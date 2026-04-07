import { useEffect, useState } from "react";

export default function FarmerGreeting() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  return (
    <h1 className="text-lg font-medium text-gray-700 mb-4">
      {greeting} 👩‍🌾
    </h1>
  );
}