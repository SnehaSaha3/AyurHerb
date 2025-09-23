import { useEffect, useState } from "react";

interface FarmerGreetingProps {
  name: string;
}

export default function FarmerGreeting({ name }: FarmerGreetingProps) {
  const [greeting, setGreeting] = useState("");

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
    <h2 className="text-2xl font-bold text-green-700 flex items-center gap-2">
      🌾 {greeting}, {name}!
    </h2>
  );
}
