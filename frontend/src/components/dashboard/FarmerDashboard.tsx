import DashboardLayout from "./DashboardLayout";
import AyurMateSidePanel from "../farmer/AyurmateSidepanel";
import { FarmProvider, useFarm } from "../farmer/FarmContext";
import { useUnread } from "../../context/UnreadContext";

const farmerLinks = [
  { name: "Home", path: "/farmer-dashboard" },
  { name: "My Crops", path: "/farmer-dashboard/crops" },
  { name: "Analytics", path: "/farmer-dashboard/analytics" },
  { name: "Shipments", path: "/farmer-dashboard/shipments" },
  { name: "Recommendations", path: "/farmer-dashboard/recommendations" },
  { name: "Messages", path: "/farmer-dashboard/messages" },
  { name: "Geo Tagging", path: "/farmer-dashboard/geotagged" },
  { name: "Profile", path: "/farmer-dashboard/profile" },
];

function FarmerDashboardShell() {
  const { farmerName } = useFarm();
  const { totalUnread } = useUnread();

  return (
    <DashboardLayout
      userType="Farmer"
      links={farmerLinks}
      farmerName={farmerName}
      unreadMessages={totalUnread}
      sidePanel={<AyurMateSidePanel />}
    />
  );
}

export default function FarmerDashboard() {
  return (
    <FarmProvider>
      <FarmerDashboardShell />
    </FarmProvider>
  );
}