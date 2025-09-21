import { ethers } from "ethers";
import CropRegistryArtifact from "../../../blockchain/artifacts/contracts/CropRegistry.sol/CropRegistry.json";
import dotenv from "dotenv";

dotenv.config();

// --- Provider & Signer ---
const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || "http://127.0.0.1:8545"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

// --- Contract instance ---
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
    lat: bigint,
    lng: bigint
  ): Promise<ethers.ContractTransactionResponse>;

  getAllCrops(): Promise<any>;
};

// -------------------------------------------------------------
// Create / Update crop on chain
// -------------------------------------------------------------
export async function upsertCropOnChain(payload: {
  name: string;
  area: string;
  season: string;
  soil: string;
  lat: number | string;
  lng: number | string;
}): Promise<{ txHash: string; cropId: number | null }> {
  const { name, area, season, soil, lat, lng } = payload;

  if (!ethers.isAddress(wallet.address)) {
    throw new Error("Invalid wallet derived from PRIVATE_KEY");
  }
  if (!process.env.CROP_REGISTRY_ADDRESS?.startsWith("0x")) {
    throw new Error("Invalid CROP_REGISTRY_ADDRESS in .env");
  }

  // --- parse & scale coordinates ---
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    throw new Error(`Invalid coordinates lat=${lat}, lng=${lng}`);
  }

  // if your contract stores int micro-degrees, scale
  const scaledLat = BigInt(Math.round(parsedLat * 1e6));
  const scaledLng = BigInt(Math.round(parsedLng * 1e6));

  const tx = await cropRegistry.upsertCrop(
    name,
    area,
    season,
    soil,
    scaledLat,
    scaledLng
  );

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed, no receipt.");

  // Parse logs to get cropId
  const iface = new ethers.Interface(CropRegistryArtifact.abi);
  let cropId: number | null = null;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "CropAdded" || parsed?.name === "CropUpdated") {
        cropId = Number(parsed.args[0]);
        break;
      }
    } catch {
      /* ignore unparseable logs */
    }
  }

  return { txHash: receipt.hash, cropId };
}

// -------------------------------------------------------------
// Read all crops from blockchain
// -------------------------------------------------------------
export async function getAllCropsFromChain(): Promise<
  {
    id: number;
    name: string;
    area: string;
    season: string;
    soil: string;
    lat: number;
    lng: number;
    createdAt: number;
    updatedAt: number;
    farmer: string;
  }[]
> {
  const crops = await cropRegistry.getAllCrops();
  return (crops as any[]).map((c) => ({
    id: Number(c.id),
    name: c.name,
    area: c.area,
    season: c.season,
    soil: c.soil,
    // divide by 1e6 to get back original decimal degrees
    lat: Number(c.lat) / 1e6,
    lng: Number(c.lng) / 1e6,
    createdAt: Number(c.createdAt),
    updatedAt: Number(c.updatedAt),
    farmer: c.farmer,
  }));
}

// -------------------------------------------------------------
// Get crops for a particular farmer
// -------------------------------------------------------------
export async function getFarmerCropsFromChain(farmerWallet: string) {
  const allCrops = await getAllCropsFromChain();
  return allCrops.filter(
    (c) => c.farmer.toLowerCase() === farmerWallet.toLowerCase()
  );
}
