import { useEffect, useState } from "react"
import DashboardLayout from "./DashboardLayout"
import axios from "axios"

function FarmerDashboard() {
    const [farmerName, setFarmerName] = useState("")

    useEffect(() => {
        const fetchFarmer = async () => {
            try {
                // Assuming you saved farmerId in localStorage after registration/login
                const farmerId = localStorage.getItem("farmerId")
                if (farmerId) {
                    const res = await axios.get(`http://localhost:5000/api/farmers/${farmerId}`)
                    setFarmerName(res.data.name) // adjust field if it's different
                }
            } catch (err) {
                console.error("Error fetching farmer:", err)
            }
        }
        fetchFarmer()
    }, [])

    const farmerLinks = [
        { name: "Home", path: "" },
        { name: "My Crops", path: "" },
        { name: "Geo Tagging", path: "" },
        { name: "Profile", path: "" }
    ]

    return <DashboardLayout userType={farmerName || "Farmer"} links={farmerLinks} />
}

export default FarmerDashboard
