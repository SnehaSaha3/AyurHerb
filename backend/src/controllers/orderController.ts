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
  logEscrowFunded(
    orderId: string,
    dataHash: string
  ): Promise<ethers.ContractTransactionResponse>;
  logTrancheReleased(
    orderId: string,
    trancheType: string,
    percent: bigint,
    dataHash: string
  ): Promise<ethers.ContractTransactionResponse>;
};

// ── UNCHANGED from your original file ────────────────────────────────
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

/**
 * Hashes payment details and logs ONLY the hash on-chain. Node keeps
 * the raw Razorpay payment ID / amount in Mongo (encrypted at rest,
 * same as your wallet key model) — the chain never sees it. Admin's
 * review screen recomputes this same hash from the Mongo record and
 * compares against getEscrowHash(orderId) to prove the record hasn't
 * been altered after the fact.
 */
export function hashEscrowPayload(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaidPaise: number;
}): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "string", "uint256"],
    [payload.orderId, payload.razorpayOrderId, payload.razorpayPaymentId, payload.amountPaidPaise]
  );
  return ethers.keccak256(encoded);
}

export async function logEscrowFundedOnChain(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaidPaise: number;
}): Promise<{ txHash: string; dataHash: string }> {
  const dataHash = hashEscrowPayload(payload);

  const tx = await orderLog.logEscrowFunded(payload.orderId, dataHash);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Escrow-funded transaction failed, no receipt.");

  return { txHash: receipt.hash, dataHash };
}

export function hashTranchePayload(payload: {
  orderId: string;
  type: string;
  amount: number;
  releasedAt: number; // epoch ms
}): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "uint256", "uint256"],
    [payload.orderId, payload.type, payload.amount, payload.releasedAt]
  );
  return ethers.keccak256(encoded);
}

export async function logTrancheReleasedOnChain(payload: {
  orderId: string;
  type: string;       // "shipment" | "delivery"
  percent: number;
  amount: number;
}): Promise<{ txHash: string; dataHash: string }> {
  const releasedAt = Date.now();
  const dataHash = hashTranchePayload({
    orderId: payload.orderId,
    type: payload.type,
    amount: payload.amount,
    releasedAt,
  });

  const tx = await orderLog.logTrancheReleased(
    payload.orderId,
    payload.type,
    BigInt(Math.round(payload.percent)),
    dataHash
  );
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Tranche-released transaction failed, no receipt.");

  return { txHash: receipt.hash, dataHash };
}