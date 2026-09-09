import { useEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import { useUnread } from "../../context/UnreadContext";

export default function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState("");
  const { totalUnread } = useUnread();

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const token =
          localStorage.getItem("farmerToken") ||
          localStorage.getItem("token");

        if (!token) {
          console.error("No farmer token found.");
          return;
        }

        const response = await fetch(
          "http://localhost:8000/api/farmers/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Farmer request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (data?.farmer?.name) {
          setFarmerName(data.farmer.name);
        }
      } catch (error) {
        console.error(
          "Error fetching farmer:",
          error
        );
      }
    };

    fetchFarmer();
  }, []);

  const farmerLinks = [
    {
      name: "Home",
      path: "/farmer-dashboard",
    },
    {
      name: "My Crops",
      path: "/farmer-dashboard/crops",
    },
    {
      name: "Analytics",
      path: "/farmer-dashboard/analytics",
    },
    {
    name: "Shipments",
    path: "/farmer-dashboard/shipments",
    },
    {
      name: "Recommendations",
      path: "/farmer-dashboard/recommendations",
    },
    {
      name: "Messages",
      path: "/farmer-dashboard/messages",
    },
    {
      name: "Geo Tagging",
      path: "/farmer-dashboard/geotagged",
    },
    {
      name: "Profile",
      path: "/farmer-dashboard/profile",
    },
  ];

  return (
    <DashboardLayout
      userType="Farmer"
      links={farmerLinks}
      farmerName={farmerName}
      unreadMessages={totalUnread}
    />
  );
}