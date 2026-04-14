import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Loader from "./components/Loader";

import NavPages from "./components/pages/NavPage";
import Homee from "./components/Home";
import RegistrationPage from "./components/pages/Registration";
import FarmerForm from "./components/forms/FarmerForm";
import FarmerDashboard from "./components/dashboard/FarmerDashboard";
import Profile from "./components/pages/Profile";
import CropList from "./components/pages/CropList";
import CropForm from "./components/forms/CropForm";
import CropMap from "./components/maps/CropMap";
import Home from "./components/pages/FarmerHome";
import About from "./components/pages/About";
import CompanyHome from "./components/dashboard/CompanyHome"
import CompanyDashboard from "./components/dashboard/CompanyDashboard"
import CompanyMessages from "./components/message/CompanyMessage"

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
      </Route>

      <Route path="/farmer-dashboard" element={<FarmerDashboard />}>
        <Route index element={<Home />} />
        <Route path="crops" element={<CropList />} />
        <Route path="crops/add" element={<CropForm />} />
        <Route path="geotagged" element={<CropMap />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/company-dashboard" element={<CompanyDashboard />}>
        <Route index element={<CompanyHome />} />
        <Route path="messages" element={<CompanyMessages />} />
     </Route>

    </Routes>
  );
}

export default App;