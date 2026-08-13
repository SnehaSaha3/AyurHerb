import Farmer from "../models/farmer";


export interface AlternativeFarmer {
  farmerId: string;
  farmerName: string;
  address: string;
  cropId: string;
  availableQuantity: number;
}

export async function findAlternativeFarmers(
  cropName: string,
  requestedQuantity: number,
  excludeFarmerId: string,
  limit = 3
): Promise<AlternativeFarmer[]> {
  const farmers = await Farmer.find({
    _id: { $ne: excludeFarmerId },
    crops: {
      $elemMatch: {
        name: new RegExp(`^${escapeRegex(cropName)}$`, "i"),
        quantity: { $gte: requestedQuantity },
      },
    },
  })
    .select("name address crops")
    .limit(limit)
    .lean();

  const results: AlternativeFarmer[] = [];

  for (const farmer of farmers as any[]) {
    const matchingCrop = farmer.crops.find(
      (c: any) =>
        c.name?.toLowerCase() === cropName.toLowerCase() &&
        c.quantity >= requestedQuantity
    );
    if (!matchingCrop) continue;

    results.push({
      farmerId: farmer._id.toString(),
      farmerName: farmer.name,
      address: farmer.address,
      cropId: matchingCrop.cropId,
      availableQuantity: matchingCrop.quantity,
    });
  }

  return results;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}