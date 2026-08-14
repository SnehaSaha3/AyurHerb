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
// FIXED: your CropRegistry.sol no longer has upsertCrop() — it was
// split into addCrop() (always creates new) and updateCrop() (mutates
// in place, checks farmer ownership). The type binding below and the
// call inside upsertCropOnChain() now match that real contract.
const cropRegistry = new ethers.Contract(
  process.env.CROP_REGISTRY_ADDRESS as string,
  CropRegistryArtifact.abi,
  wallet
) as ethers.Contract & {
  addCrop(
    farmerAddr: string,
    name: string,
    area: string,
    season: string,
    soil: string,
    lat: bigint,
    lng: bigint
  ): Promise<ethers.ContractTransactionResponse>;

  updateCrop(
    cropId: bigint | number,
    farmerAddr: string,
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
// Create crop on chain
// -------------------------------------------------------------
// Exported name kept as `upsertCropOnChain` (not renamed to
// `addCropOnChain`) so cropRoutes.ts's existing import doesn't need
// to change — only the internal contract call changed, from the
// now-nonexistent upsertCrop() to the real addCrop().
export async function upsertCropOnChain(payload: {
  farmerAddr: string;
  name: string;
  area: string;
  season: string;
  soil: string;
  lat: number | string;
  lng: number | string;
}): Promise<{ txHash: string; cropId: number | null }> {
  const { farmerAddr, name, area, season, soil, lat, lng } = payload;

  if (!ethers.isAddress(wallet.address)) {
    throw new Error("Invalid wallet derived from PRIVATE_KEY");
  }
  if (!process.env.CROP_REGISTRY_ADDRESS?.startsWith("0x")) {
    throw new Error("Invalid CROP_REGISTRY_ADDRESS in .env");
  }
  if (!ethers.isAddress(farmerAddr)) {
    throw new Error(`Invalid farmer address: ${farmerAddr}`);
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    throw new Error(`Invalid coordinates lat=${lat}, lng=${lng}`);
  }

  const scaledLat = BigInt(Math.round(parsedLat * 1e6));
  const scaledLng = BigInt(Math.round(parsedLng * 1e6));

  const tx = await cropRegistry.addCrop(
    farmerAddr,
    name,
    area,
    season,
    soil,
    scaledLat,
    scaledLng
  );

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed, no receipt.");

  const iface = new ethers.Interface(CropRegistryArtifact.abi);
  let cropId: number | null = null;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "CropAdded") {
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
// Update an EXISTING crop on chain (real update — same cropId,
// no new record created). Not called by any route yet — the current
// PATCH /api/crops/:cropId route is deliberately MongoDB-only for
// now (see cropRoutes.ts). Wire this in once you're ready to sync
// edits to chain too.
// -------------------------------------------------------------
export async function updateCropOnChain(payload: {
  cropId: number | string;
  farmerAddr: string;
  name: string;
  area: string;
  season: string;
  soil: string;
  lat: number | string;
  lng: number | string;
}): Promise<{ txHash: string }> {
  const { cropId, farmerAddr, name, area, season, soil, lat, lng } = payload;

  if (!ethers.isAddress(farmerAddr)) {
    throw new Error(`Invalid farmer address: ${farmerAddr}`);
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    throw new Error(`Invalid coordinates lat=${lat}, lng=${lng}`);
  }

  const scaledLat = BigInt(Math.round(parsedLat * 1e6));
  const scaledLng = BigInt(Math.round(parsedLng * 1e6));

  const tx = await cropRegistry.updateCrop(
    BigInt(cropId),
    farmerAddr,
    name,
    area,
    season,
    soil,
    scaledLat,
    scaledLng
  );

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Update transaction failed, no receipt.");

  return { txHash: receipt.hash };
}

// -------------------------------------------------------------
// Read all crops from blockchain
// -------------------------------------------------------------
export async function getAllCropsFromChain(): Promise <
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