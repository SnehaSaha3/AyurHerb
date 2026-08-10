import { ethers } from "ethers";
import OrderLogArtifact from "../../../blockchain/artifacts/contracts/OrderLog.sol/OrderLog.json";
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || "http://127.0.0.1:8545"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

const orderLog = new ethers.Contract(
  process.env.ORDER_LOG_ADDRESS as string,
  OrderLogArtifact.abi,
  wallet
) as ethers.Contract & {
  logConfirmedOrder(
    orderId: string,
    company: string,
    farmer: string,
    cropName: string,
    quantity: bigint,
    amount: bigint
  ): Promise<ethers.ContractTransactionResponse>;
};

export async function logConfirmedOrderOnChain(payload: {
  orderId: string;
  companyAddr: string;
  farmerAddr: string;
  cropName: string;
  quantity: number;
  amount: number;
}): Promise<{ txHash: string }> {
  const { orderId, companyAddr, farmerAddr, cropName, quantity, amount } = payload;

  if (!process.env.ORDER_LOG_ADDRESS?.startsWith("0x")) {
    throw new Error("Invalid ORDER_LOG_ADDRESS in .env");
  }
  if (!ethers.isAddress(companyAddr)) {
    throw new Error(`Invalid company address: ${companyAddr}`);
  }
  if (!ethers.isAddress(farmerAddr)) {
    throw new Error(`Invalid farmer address: ${farmerAddr}`);
  }

  const tx = await orderLog.logConfirmedOrder(
    orderId,
    companyAddr,
    farmerAddr,
    cropName,
    BigInt(Math.round(quantity)),
    BigInt(Math.round(amount))
  );

  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed, no receipt.");

  return { txHash: receipt.hash };
}