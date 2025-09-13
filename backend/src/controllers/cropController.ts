import { ethers } from "ethers"
import CropRegistryArtifact from "../../../blockchain/artifacts/contracts/CropRegistry.sol/CropRegistry.json"
import dotenv from "dotenv"

dotenv.config()

// --- Provider & Signer ---
const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || "http://127.0.0.1:8545"
)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider)

// --- Contract ---
const cropRegistry = new ethers.Contract(
  process.env.CROP_REGISTRY_ADDRESS as string,
  CropRegistryArtifact.abi,
  wallet
) as ethers.Contract & {
  upsertCrop(
    name: string,
    area: string,
    season: string,
    soil: string,
    lat: string,
    lng: string
  ): Promise<ethers.ContractTransactionResponse>

  getAllCrops(): Promise<any>
}

// --- On-chain upsert (create or update) ---
export async function upsertCropOnChain(payload: {
  name: string;
  area: string;
  season: string;
  soil: string;
  lat: string;
  lng: string;
}): Promise<{ txHash: string; cropId: number | null }> {
  const { name, area, season, soil, lat, lng } = payload

  // Basic guards
  if (!ethers.isAddress(wallet.address)) {
    throw new Error("Invalid wallet derived from PRIVATE_KEY")
  }
  if (!process.env.CROP_REGISTRY_ADDRESS?.startsWith("0x")) {
    throw new Error("Invalid CROP_REGISTRY_ADDRESS in .env")
  }

  // Send transaction
  const tx = await cropRegistry.upsertCrop(name, area, season, soil, lat, lng);
  const receipt = await tx.wait()
  if (!receipt) throw new Error("Transaction failed, no receipt.")

  // Parse logs for cropId
  const iface = new ethers.Interface(CropRegistryArtifact.abi)
  let cropId: number | null = null

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "CropAdded" || parsed?.name === "CropUpdated") {
        cropId = Number(parsed.args[0])
        break
      }
    } catch {}
  }

  return { txHash: receipt.hash, cropId }
}

// --- Read all crops from blockchain ---
export async function getAllCropsFromChain(): Promise<
  {
    id: number
    name: string
    area: string
    season: string
    soil: string
    lat: string
    lng: string
    createdAt: number
    updatedAt: number
  }[]
> {
  const crops = await cropRegistry.getAllCrops()
  return (crops as any[]).map((c) => ({
    id: Number(c.id),
    name: c.name,
    area: c.area,
    season: c.season,
    soil: c.soil,
    lat: c.lat,
    lng: c.lng,
    createdAt: Number(c.createdAt),
    updatedAt: Number(c.updatedAt),
  }))
}

// --- NEW: Get crops only for a specific farmer ---
export async function getFarmerCropsFromChain(farmerLat: string, farmerLng: string) {
  const crops = await getAllCropsFromChain()
  return crops.filter((c) => c.lat === farmerLat && c.lng === farmerLng)
}

