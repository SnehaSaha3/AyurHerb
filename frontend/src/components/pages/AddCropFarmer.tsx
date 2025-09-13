import { useState } from "react";
import axios from "axios";

export default function AddCrop() {
//   const [farmerId, setFarmerId] = useState("");
  const [herb, setHerb] = useState("");
  const [location, setLocation] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/crops/add", {
       
        herb,
        
      });
      setTxHash(res.data.txHash);
    } catch (err) {
      console.error("Error adding crop:", err);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">🌱 Register New Crop</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* <input
          type="text"
          placeholder="Farmer ID"
          value={farmerId}
          onChange={(e) => setFarmerId(e.target.value)}
          className="w-full border p-2 rounded"
        /> */}
        <input
          type="text"
          placeholder="Herb"
          value={herb}
          onChange={(e) => setHerb(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          Add Crop
        </button>
      </form>
      {txHash && (
        <p className="mt-4 text-green-700">✅ Stored on blockchain. Tx: {txHash}</p>
      )}
    </div>
  );
}
