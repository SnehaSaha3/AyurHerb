import { ethers } from "ethers";
import OrderLogArtifact from "../../../blockchain/artifacts/contracts/OrderLog.sol/OrderLog.json";
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || "http://127.0.0.1:8545"
);

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is missing from .env");
}

if (!process.env.ORDER_LOG_ADDRESS) {
  throw new Error("ORDER_LOG_ADDRESS is missing from .env");
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const orderLog = new ethers.Contract(
  process.env.ORDER_LOG_ADDRESS,
  OrderLogArtifact.abi,
  wallet
) as ethers.Contract & {
  logConfirmedOrder(
    orderId: string,
    company: string,
    farmer: string,
    cropName: string,
    quantity: bigint,
    unitPrice: bigint,
    amount: bigint,
    overrides?: { nonce?: number }
  ): Promise<ethers.ContractTransactionResponse>;

  logEscrowFunded(
    orderId: string,
    dataHash: string,
    overrides?: { nonce?: number }
  ): Promise<ethers.ContractTransactionResponse>;

  logTrancheReleased(
    orderId: string,
    trancheType: string,
    percent: bigint,
    dataHash: string,
    overrides?: { nonce?: number }
  ): Promise<ethers.ContractTransactionResponse>;

  getConfirmedOrder(orderId: string): Promise<{ timestamp: bigint }>;

  getEscrow(orderId: string): Promise<{ funded: boolean }>;
};

/*
 * The PRIVATE_KEY account must be dedicated to relaying OrderLog
 * transactions. Any other transaction from the same account
 * (deployment, manual script, second process) advances its nonce
 * outside this module's tracking.
 */

let nextNoncePromise: Promise<number> | null = null;

async function fetchCurrentNonce(): Promise<number> {
  return provider.getTransactionCount(wallet.address, "pending");
}

async function reserveNonce(): Promise<number> {
  if (nextNoncePromise === null) {
    nextNoncePromise = fetchCurrentNonce();
  }

  const nonce = await nextNoncePromise;
  nextNoncePromise = Promise.resolve(nonce + 1);
  return nonce;
}

function resyncNonce(): void {
  nextNoncePromise = null;
}

let walletQueue: Promise<unknown> = Promise.resolve();

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1500;

function errorText(error: any): string {
  return [error?.reason, error?.shortMessage, error?.message]
    .filter(Boolean)
    .join(" ");
}

function isNonceError(error: any): boolean {
  return (
    error?.code === "NONCE_EXPIRED" ||
    /nonce too low|nonce too high|replacement transaction underpriced/i.test(
      errorText(error)
    )
  );
}

function isStaleStateError(error: any): boolean {
  return /Order not confirmed|Escrow not funded/i.test(errorText(error));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function enqueueWalletTx<T>(task: (nonce: number) => Promise<T>): Promise<T> {
  const runWithRetries = async (): Promise<T> => {
    let attempt = 0;

    while (true) {
      const nonce = await reserveNonce();

      try {
        return await task(nonce);
      } catch (error: any) {
        resyncNonce();
        attempt += 1;

        const retryable = isNonceError(error) || isStaleStateError(error);

        if (!retryable || attempt >= MAX_RETRIES) {
          throw error;
        }

        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  };

  const result = walletQueue.then(runWithRetries, runWithRetries);
  walletQueue = result.catch(() => undefined);
  return result;
}

async function waitUntil(
  check: () => Promise<boolean>,
  description: string,
  timeoutMs = 30000,
  intervalMs = 1000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      if (await check()) {
        return;
      }
    } catch {
      // transient RPC read failure, retry until deadline
    }

    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${description} on-chain`);
    }

    await delay(intervalMs);
  }
}

async function isOrderConfirmed(orderId: string): Promise<boolean> {
  const order = await orderLog.getConfirmedOrder(orderId);
  return Number(order.timestamp) > 0;
}

async function isEscrowFunded(orderId: string): Promise<boolean> {
  const escrow = await orderLog.getEscrow(orderId);
  return escrow.funded === true;
}

function validateOrderLogAddress(): void {
  if (!process.env.ORDER_LOG_ADDRESS?.startsWith("0x")) {
    throw new Error("Invalid ORDER_LOG_ADDRESS in .env");
  }

  if (!ethers.isAddress(process.env.ORDER_LOG_ADDRESS)) {
    throw new Error(`Invalid ORDER_LOG_ADDRESS: ${process.env.ORDER_LOG_ADDRESS}`);
  }
}

function validateAddress(address: string, fieldName: string): void {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid ${fieldName}: ${address}`);
  }
}

function validatePositiveNumber(value: number, fieldName: string, allowZero = false): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }

  if (allowZero) {
    if (value < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }
  } else if (value <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
}

function validateString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

export async function logConfirmedOrderOnChain(payload: {
  orderId: string;
  companyAddr: string;
  farmerAddr: string;
  cropName: string;
  quantity: number;
  unitPricePaise: number;
  amount: number;
}): Promise<{ txHash: string | null }> {
  const { orderId, companyAddr, farmerAddr, cropName, quantity, unitPricePaise, amount } = payload;

  validateOrderLogAddress();
  validateString(orderId, "orderId");
  validateString(cropName, "cropName");
  validateAddress(companyAddr, "company address");
  validateAddress(farmerAddr, "farmer address");
  validatePositiveNumber(quantity, "quantity");
  validatePositiveNumber(unitPricePaise, "unitPricePaise");
  validatePositiveNumber(amount, "amount");

  if (await isOrderConfirmed(orderId)) {
    return { txHash: null };
  }

  const quantityBigInt = BigInt(Math.round(quantity));
  const unitPriceBigInt = BigInt(Math.round(unitPricePaise));
  const amountBigInt = BigInt(Math.round(amount));

  const result = await enqueueWalletTx(async (nonce) => {
    const tx = await orderLog.logConfirmedOrder(
      orderId,
      companyAddr,
      farmerAddr,
      cropName,
      quantityBigInt,
      unitPriceBigInt,
      amountBigInt,
      { nonce }
    );

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Confirmed-order transaction failed: no receipt returned.");
    }

    return { txHash: receipt.hash };
  });

  await waitUntil(
    () => isOrderConfirmed(orderId),
    `confirmation of order ${orderId}`
  );

  return result;
}

export function hashEscrowPayload(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaidPaise: number;
}): string {
  validateString(payload.orderId, "orderId");
  validateString(payload.razorpayOrderId, "razorpayOrderId");
  validateString(payload.razorpayPaymentId, "razorpayPaymentId");
  validatePositiveNumber(payload.amountPaidPaise, "amountPaidPaise");

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "string", "uint256"],
    [
      payload.orderId,
      payload.razorpayOrderId,
      payload.razorpayPaymentId,
      BigInt(Math.round(payload.amountPaidPaise)),
    ]
  );

  return ethers.keccak256(encoded);
}

export async function logEscrowFundedOnChain(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaidPaise: number;
}): Promise<{ txHash: string | null; dataHash: string }> {
  validateOrderLogAddress();

  const dataHash = hashEscrowPayload(payload);

  await waitUntil(
    () => isOrderConfirmed(payload.orderId),
    `confirmation of order ${payload.orderId}`
  );

  if (await isEscrowFunded(payload.orderId)) {
    return { txHash: null, dataHash };
  }

  const result = await enqueueWalletTx(async (nonce) => {
    const tx = await orderLog.logEscrowFunded(payload.orderId, dataHash, { nonce });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Escrow-funded transaction failed: no receipt returned.");
    }

    return { txHash: receipt.hash };
  });

  await waitUntil(
    () => isEscrowFunded(payload.orderId),
    `escrow funding of order ${payload.orderId}`
  );

  return { txHash: result.txHash, dataHash };
}

export function hashTranchePayload(payload: {
  orderId: string;
  type: string;
  amount: number;
  releasedAt: number;
}): string {
  validateString(payload.orderId, "orderId");
  validateString(payload.type, "tranche type");
  validatePositiveNumber(payload.amount, "tranche amount");

  if (!Number.isFinite(payload.releasedAt) || payload.releasedAt <= 0) {
    throw new Error(`Invalid releasedAt: ${payload.releasedAt}`);
  }

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "string", "uint256", "uint256"],
    [
      payload.orderId,
      payload.type,
      BigInt(Math.round(payload.amount)),
      BigInt(Math.round(payload.releasedAt)),
    ]
  );

  return ethers.keccak256(encoded);
}

export async function logTrancheReleasedOnChain(payload: {
  orderId: string;
  type: "shipment" | "delivery";
  percent: number;
  amount: number;
}): Promise<{ txHash: string; dataHash: string }> {
  validateOrderLogAddress();
  validateString(payload.orderId, "orderId");

  if (payload.type !== "shipment" && payload.type !== "delivery") {
    throw new Error(`Invalid tranche type: ${payload.type}`);
  }

  validatePositiveNumber(payload.percent, "tranche percent");
  if (payload.percent > 100) {
    throw new Error("Tranche percent cannot exceed 100");
  }

  validatePositiveNumber(payload.amount, "tranche amount");

  await waitUntil(
    async () =>
      (await isOrderConfirmed(payload.orderId)) &&
      (await isEscrowFunded(payload.orderId)),
    `escrow state of order ${payload.orderId}`
  );

  const releasedAt = Date.now();
  const dataHash = hashTranchePayload({
    orderId: payload.orderId,
    type: payload.type,
    amount: payload.amount,
    releasedAt,
  });

  return enqueueWalletTx(async (nonce) => {
    const tx = await orderLog.logTrancheReleased(
      payload.orderId,
      payload.type,
      BigInt(Math.round(payload.percent)),
      dataHash,
      { nonce }
    );

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Tranche-released transaction failed: no receipt returned.");
    }

    return { txHash: receipt.hash, dataHash };
  });
}