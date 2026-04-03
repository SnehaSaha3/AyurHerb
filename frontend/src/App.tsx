import { Routes, Route } from "react-router-dom"
import NavPages from "./components/pages/NavPage"
import Homee from "./components/Home"
import RegistrationPage from "./components/pages/Registration"
import FarmerForm from "./components/forms/FarmerForm"
import FarmerDashboard from "./components/dashboard/FarmerDashboard"
import Profile from "./components/pages/Profile"
import CropList from "./components/pages/CropList"
import CropForm from "./components/forms/CropForm"
import CropMap from "./components/maps/CropMap"
import Home from "./components/pages/FarmerHome"
import About from "./components/pages/About"
function App() {
  return (
    <Routes>
      <Route path="/" element={<NavPages />}>
        <Route index element={<Homee />} />
        <Route path="about" element={<About />} />
        <Route path="registration" element={<RegistrationPage />} />
        <Route path="farmer-registration" element={<FarmerForm />} />
      </Route>

      {/* Nested farmer dashboard */}
      <Route path="/farmer-dashboard" element={<FarmerDashboard />}>
        <Route index element={<Home />} />
        <Route path="crops" element={<CropList />} />       {/* Crop data */}
        <Route path="crops/add" element={<CropForm />} />   {/* Add crop */}
        <Route path="geotagged" element={ <CropMap />}/>
        <Route path="profile" element={<Profile />} />
        
      </Route>
    </Routes>
  )
}

export default App



