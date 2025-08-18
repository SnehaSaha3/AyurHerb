import { Routes, Route } from "react-router-dom"
import NavPages from "./components/pages/NavPage"
import Homee from "./components/Home"
import RegistrationPage from "./components/pages/Registration"
import FarmerForm from "./components/forms/FarmerForm"
import FarmerDashboard from "./components/dashboard/FarmerDashboard"

function App() {
  return (
    <Routes>
      <Route path="/" element={<NavPages />}>
        <Route index element={<Homee />} /> 
        <Route path="registration" element={<RegistrationPage />} />
        <Route path="farmer-registration" element={<FarmerForm />} />
      </Route>
       <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
    </Routes>
  );
}

export default App


