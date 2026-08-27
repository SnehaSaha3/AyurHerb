import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Loader from "./components/Loader";

import NavPages from "./components/pages/NavPage";
import Homee from "./components/Home";
import RegistrationPage from "./components/pages/Registration";
import FarmerForm from "./components/forms/FarmerForm";
import RegistrationForms from "./components/forms/RegistrationForms";
import FarmerDashboard from "./components/dashboard/FarmerDashboard";
import Profile from "./components/pages/FarmerProfile";
import CropList from "./components/pages/CropList";
import CropMap from "./components/maps/CropMap";
import Home from "./components/pages/FarmerHome";
import About from "./components/pages/About";
import CompanyHome from "./components/dashboard/CompanyHome"
import CompanyDashboard from "./components/dashboard/CompanyDashboard"
import CompanyMessages from "./components/message/CompanyMessage"
import FarmerMessages from "./components/message/FarmerMessage";
import LoginForm from "./components/forms/LoginForm"
import CompanyProfile from "./components/pages/CompanyProfile"
import CompanyAnalytics from "./components/analytics/ComapanyAnalytics";
import FarmerAnalytics from "./components/analytics/FarmerAnalytics";
import CompanyExplore from "./components/companypages/CompanyExplore"
import CompanyOrders from "./components/companypages/CompanyOrders";
import CompanyShipments from "./components/companypages/CompanyShipments";
function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulate initial app load (or auth check later)
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <Routes>
      <Route path="/" element={<NavPages />}>
        <Route index element={<Homee />} />
        <Route path="about" element={<About />} />
        <Route path="registration" element={<RegistrationPage />} />
        <Route path="farmer-registration" element={<FarmerForm />} />
        <Route path="company-registration" element={<RegistrationForms role="company" />} />
        <Route path="farmer-login" element={<LoginForm role="farmer" />} />
        <Route path="company-login" element={<LoginForm role="company" />} />
      </Route>

     


      <Route path="/farmer-dashboard" element={<FarmerDashboard />}>
        <Route index element={<Home />} />
        <Route path="crops" element={<CropList />} />
        <Route path="geotagged" element={<CropMap />} />
        <Route path="messages" element={<FarmerMessages />} />
        <Route path="analytics" element={<FarmerAnalytics />}/>
        <Route path="profile" element={<Profile />} />
     </Route>

      <Route path="/company-dashboard" element={<CompanyDashboard />}>
        <Route index element={<CompanyHome />} />
        <Route path="explore" element={<CompanyExplore />} />
     <Route
      path="orders"
      element={<CompanyOrders />} />
        <Route path="shipments" element={<CompanyShipments />} />
        <Route path="analytics" element={<CompanyAnalytics />} />
        <Route path="messages" element={<CompanyMessages />} />
        <Route path="profile" element={<CompanyProfile />} />
      </Route>

    </Routes>
  );
}

export default App;