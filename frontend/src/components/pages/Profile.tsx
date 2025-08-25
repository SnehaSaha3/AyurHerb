import { useEffect, useState } from "react"
import axios from "axios"

interface Farmer {
  _id: string
  name: string
  herb: string
  email: string
  contact?: string
  address?: string
}

function Profile() {
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token") 
        const res = await axios.get("http://localhost:5000/api/farmers/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFarmer(res.data)
      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setLoading(false)
      }
    };

    fetchProfile()
  }, []);

  if (loading) return <p>Loading profile...</p>
  if (!farmer) return <p>Profile not found</p>

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">👨‍🌾 Farmer Profile</h2>
      <p><strong>Name:</strong> {farmer.name}</p>
      <p><strong>Herb:</strong> {farmer.herb}</p>
      <p><strong>Email:</strong> {farmer.email}</p>
      <p><strong>Contact:</strong> {farmer.contact || "N/A"}</p>
      <p><strong>Address:</strong> {farmer.address || "N/A"}</p>
    </div>
  )
}
export default Profile