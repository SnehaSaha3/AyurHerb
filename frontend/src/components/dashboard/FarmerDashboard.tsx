import { useEffect, useState } from "react";
import axios from "axios";
import DashboardLayout from "./DashboardLayout";
import { useUnread } from "../../context/UnreadContext";

function FarmerDashboard() {
  const [farmerName, setFarmerName] = useState("");
  const { totalUnread } = useUnread();

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const token = localStorage.getItem("farmerToken") || localStorage.getItem("token");
        if (!token) {
          console.error("No farmer token found.");
          return;
        }

        const res = await axios.get("http://localhost:8000/api/farmers/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.farmer?.name) {
          setFarmerName(res.data.farmer.name);
        } else {
          console.error("Unexpected farmer response:", res.data);
        }
      } catch (error) {
        console.error("Error fetching farmer:", error);
      }
    };

    fetchFarmer();
  }, []);

  const farmerLinks = [
    { name: "Home", path: "/farmer-dashboard" },
    { name: "My Crops", path: "/farmer-dashboard/crops" },
    { name: "Messages", path: "/farmer-dashboard/messages" },
    { name: "Geo Tagging", path: "/farmer-dashboard/geotagged" },
    { name: "Profile", path: "/farmer-dashboard/profile" },
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

export default FarmerDashboard;