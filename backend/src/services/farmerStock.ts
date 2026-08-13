import Farmer from "../models/farmer";

export async function decrementFarmerStock(
  farmerId: string,
  cropId: string,
  quantity: number
): Promise<{ success: boolean; reason?: string }> {
  const result = await Farmer.updateOne(
    { _id: farmerId, "crops.cropId": cropId, "crops.quantity": { $gte: quantity } },
    { $inc: { "crops.$.quantity": -quantity } }
  );

  if (result.modifiedCount === 0) {
    return {
      success: false,
      reason: "Insufficient stock at time of payment — likely sold out by a concurrent order",
    };
  }
  return { success: true };
}

export async function restoreFarmerStock(
  farmerId: string,
  cropId: string,
  quantity: number
): Promise<void> {
  await Farmer.updateOne(
    { _id: farmerId, "crops.cropId": cropId },
    { $inc: { "crops.$.quantity": quantity } }
  );
}