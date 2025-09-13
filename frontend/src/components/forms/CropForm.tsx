import React, { useState } from "react";
import { registerCrop } from "../../api";
import { ethers } from "ethers";
import CropRegistryArtifact from "../../../../blockchain/artifacts/contracts/CropRegistry.sol/CropRegistry.json";

// ✅ Type-safe crop payload returned from backend
interface CropPayload {
  cropId: string;
  cropName: string;
  location: { lat: number; lng: number };
  season?: string;
  soilType?: string;
}

export default function CropForm() {
  const [cropName, setCropName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [season, setSeason] = useState("");
  const [soilType, setSoilType] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1️⃣ Call Backend API (MongoDB Save)
      const res = await registerCrop({
        cropName,
        location: { lat: Number(lat), lng: Number(lng) },
        season,
        soilType,
      });

      const crop: CropPayload = res.data;
      setStatus("✅ Crop registered in MongoDB");

      // 2️⃣ Ensure MetaMask is available
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("Missing REACT_APP_CONTRACT_ADDRESS in .env");
      }

      const cropRegistry = new ethers.Contract(
        contractAddress,
        CropRegistryArtifact.abi,
        signer
      );

      // 3️⃣ Call Smart Contract
      const tx = await cropRegistry.upsertCrop(
        crop.cropId,
        crop.cropName,
        crop.location.lat,
        crop.location.lng,
        crop.season || "",
        crop.soilType || ""
      );

      await tx.wait();
      setStatus("✅ Crop saved on Blockchain");
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error submitting crop:", err.message);
        setStatus("❌ Error: " + err.message);
      } else {
        console.error("Unexpected error:", err);
        setStatus("❌ Unexpected error occurred");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded w-96 mx-auto mt-6"
    >
      <h2 className="text-lg font-bold mb-3">Register Crop</h2>

      <input
        type="text"
        placeholder="Crop Name"
        value={cropName}
        onChange={(e) => setCropName(e.target.value)}
        className="border p-2 w-full mb-2"
        required
      />

      <input
        type="number"
        placeholder="Latitude"
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        className="border p-2 w-full mb-2"
        required
      />

      <input
        type="number"
        placeholder="Longitude"
        value={lng}
        onChange={(e) => setLng(e.target.value)}
        className="border p-2 w-full mb-2"
        required
      />

      <input
        type="text"
        placeholder="Season"
        value={season}
        onChange={(e) => setSeason(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <input
        type="text"
        placeholder="Soil Type"
        value={soilType}
        onChange={(e) => setSoilType(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Register Crop
      </button>

      {status && <p className="mt-3 text-sm text-gray-700">{status}</p>}
    </form>
  );
}
