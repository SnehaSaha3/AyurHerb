import { ethers } from "ethers";
import OrderLogArtifact from "../../../blockchain/artifacts/contracts/OrderLog.sol/OrderLog.json";
import dotenv from "dotenv";

dotenv.config();

/* ============================================================
   PROVIDER + RELAYER WALLET
   ============================================================ */

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
};

/* ============================================================
   RELAYER WALLET SAFETY CHECK

   The account this wallet uses must be dedicated to relaying
   OrderLog transactions and never reused as the deployer account
   or for anything else. Any other transaction from this same
   account (a contract deployment, a manual script, another
   process) advances its nonce outside of this module's tracking
   and will desync it. Hardhat's default first account is commonly
   reused as both deployer and test signer — make sure PRIVATE_KEY
   here is a different account from whichever one deploys OrderLog.sol.
   ============================================================ */

/* ============================================================
   LOCAL NONCE TRACKING

   Querying the chain for "the next nonce" before every transaction
   is what caused repeated NONCE_EXPIRED errors: ethers caches
   getTransactionCount results for a short window, so back-to-back
   calls can read a stale value, and any other transaction from this
   wallet (a deploy script, a previous process instance) can advance
   the real nonce without this process knowing.

   Instead, the next nonce is fetched from the chain exactly once,
   then tracked locally and incremented after every send. The chain
   is only re-queried if a send comes back with a nonce error,
   which means the local count has drifted from reality.
   ============================================================ */

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

/* ============================================================
   WALLET TRANSACTION QUEUE

   All writes from this custodial wallet are serialized: only one
   transaction is ever being built/sent/confirmed at a time. This
   is still required even with local nonce tracking, since sending
   nonce N+1 before nonce N has been accepted is rejected outright
   by Hardhat's automine ("transactions can't be queued when
   automining") rather than queued for later.
   ============================================================ */

let walletQueue: Promise<unknown> = Promise.resolve();

const MAX_NONCE_RETRIES = 3;
const NONCE_RETRY_DELAY_MS = 400;

function isNonceError(error: any): boolean {
  const message = error?.shortMessage || error?.message || "";
  return error?.code === "NONCE_EXPIRED" || /nonce too low|nonce too high/i.test(message);
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
        attempt += 1;

        if (!isNonceError(error) || attempt >= MAX_NONCE_RETRIES) {
          throw error;
        }

        resyncNonce();
        await delay(NONCE_RETRY_DELAY_MS * attempt);
      }
    }
  };

  const result = walletQueue.then(runWithRetries, runWithRetries);
  walletQueue = result.catch(() => undefined);
  return result;
}

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

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

/* ============================================================
   CONFIRMED ORDER

   Correct lifecycle:
   create order -> agent verification -> stock verification ->
   awaiting_payment -> company pays -> payment verified ->
   escrow funded -> fraud/admin approval -> logConfirmedOrderOnChain()

   Must run before logEscrowFundedOnChain — the contract requires
   the order to already be confirmed before escrow can be funded.

   unitPrice is the agreed price per kg, scaled to paise (same
   scale convention as amountPaidPaise) since Solidity has no
   decimals: ₹975.00/kg is sent on-chain as 97500.
   ============================================================ */

export async function logConfirmedOrderOnChain(payload: {
  orderId: string;
  companyAddr: string;
  farmerAddr: string;
  cropName: string;
  quantity: number;
  unitPricePaise: number;
  amount: number;
}): Promise<{ txHash: string }> {
  const { orderId, companyAddr, farmerAddr, cropName, quantity, unitPricePaise, amount } = payload;

  validateOrderLogAddress();
  validateString(orderId, "orderId");
  validateString(cropName, "cropName");
  validateAddress(companyAddr, "company address");
  validateAddress(farmerAddr, "farmer address");
  validatePositiveNumber(quantity, "quantity");
  validatePositiveNumber(unitPricePaise, "unitPricePaise");
  validatePositiveNumber(amount, "amount");

  const quantityBigInt = BigInt(Math.round(quantity));
  const unitPriceBigInt = BigInt(Math.round(unitPricePaise));
  const amountBigInt = BigInt(Math.round(amount));

  return enqueueWalletTx(async (nonce) => {
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
}

/* ============================================================
   ESCROW HASH

   Razorpay IDs and payment info stay off-chain in MongoDB.
   Only a keccak256 hash of those values is written on-chain,
   so we can later prove the MongoDB record hasn't been altered.
   ============================================================ */

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

/* ============================================================
   LOG ESCROW FUNDED

   Called only after payment signature verified, stock reserved,
   escrow marked funded, and logConfirmedOrderOnChain has already
   succeeded for this order.
   ============================================================ */

export async function logEscrowFundedOnChain(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaidPaise: number;
}): Promise<{ txHash: string; dataHash: string }> {
  validateOrderLogAddress();

  const dataHash = hashEscrowPayload(payload);

  return enqueueWalletTx(async (nonce) => {
    const tx = await orderLog.logEscrowFunded(payload.orderId, dataHash, { nonce });

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Escrow-funded transaction failed: no receipt returned.");
    }

    return { txHash: receipt.hash, dataHash };
  });
}

/* ============================================================
   TRANCHE HASH

   Deterministic hash of orderId, tranche type, amount, and a
   release timestamp generated immediately before the tx.
   ============================================================ */

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

/* ============================================================
   LOG TRANCHE RELEASE

   Valid tranche types: shipment, delivery.
   shipment fires once invoice is generated; delivery fires once
   delivery is confirmed. Requires escrow already funded.
   ============================================================ */

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