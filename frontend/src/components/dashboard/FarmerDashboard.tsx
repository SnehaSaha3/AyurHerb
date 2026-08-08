import { useEffect, useState } from "react";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import { Outlet } from "react-router-dom";
import FarmerGreeting from "../services/Greeting";

function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState("");

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found, please login again");
          return;
        }

        const res = await axios.get(
          "http://localhost:8000/api/farmers/me",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data?.farmer?.name) {
          setFarmerName(res.data.farmer.name);
        } else {
          console.error("Unexpected response format:", res.data);
        }
      } catch (err) {
        console.error("Error fetching farmer:", err);
      }
    };

    fetchFarmer();
  }, []);

  const farmerLinks = [
    { name: "Home", path: "/farmer-dashboard" },
    { name: "My Crops", path: "/farmer-dashboard/crops" },
    {name: "Messages", path: "/farmer-dashboard/messages"},
    { name: "Geo Tagging", path: "/farmer-dashboard/geotagged" },
    { name: "Profile", path: "/farmer-dashboard/profile" },
  ];

  return (
    <DashboardLayout userType="Farmer" links={farmerLinks} farmerName={farmerName}>
      <FarmerGreeting />
      <Outlet />
    </DashboardLayout>
  );
}

export default FarmerDashboard;