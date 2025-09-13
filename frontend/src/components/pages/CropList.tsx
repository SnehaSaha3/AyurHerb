import { useEffect, useState } from "react"
import axios from "axios"

interface Crop {
  _id: string
  cropId?: string
  cropName: string
  soilType?: string
  area?: number
  location?: { lat: number; lng: number }
  season?: string
}


function CropList() {
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          setError("No token found, please login again.")
          setLoading(false)
          return
        }

        const res = await axios.get("http://localhost:5000/api/crops", {
          headers: { Authorization: `Bearer ${token}` },
        })

       
        if (res.data && Array.isArray(res.data.crops)) {
          setCrops(res.data.crops)
        } else {
          setCrops([]) 
        }
      } catch (err) {
        console.error("Error fetching crops:", err)
        setError("Failed to load crops")
        setCrops([]) 
      } finally {
        setLoading(false)
      }
    }

    fetchCrops()
  }, [])

  if (loading) return <p className="p-4">Loading crops...</p>
  if (error) return <p className="p-4 text-red-500">{error}</p>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Crops</h2>
      {crops.length === 0 ? (
        <p>No crops registered yet.</p>
      ) : (
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Type</th>
              <th className="border px-4 py-2">Area</th>
              <th className="border px-4 py-2">Location</th>
              <th className="border px-4 py-2">Season</th>
            </tr>
          </thead>
         <tbody>
            {crops.map((crop) => (
              <tr key={crop._id || crop.cropId}>
             <td className="border px-4 py-2">{crop.cropName}</td>
             <td className="border px-4 py-2">{crop.soilType || "-"}</td>
             <td className="border px-4 py-2">{crop.area ?? "N/A"} acres</td>
             <td className="border px-4 py-2">
              {crop.location ? `${crop.location.lat}, ${crop.location.lng}` : "-"}
             </td>
             <td className="border px-4 py-2">{crop.season || "-"}</td>
              </tr>
           ))}
         </tbody>

        </table>
      )}
    </div>
  )
}

export default CropList
