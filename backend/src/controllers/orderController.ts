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

const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

/* ============================================================
   ORDER LOG CONTRACT
   ============================================================ */

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

/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

function validateOrderLogAddress(): void {
  if (!process.env.ORDER_LOG_ADDRESS?.startsWith("0x")) {
    throw new Error("Invalid ORDER_LOG_ADDRESS in .env");
  }

  if (!ethers.isAddress(process.env.ORDER_LOG_ADDRESS)) {
    throw new Error(
      `Invalid ORDER_LOG_ADDRESS: ${process.env.ORDER_LOG_ADDRESS}`
    );
  }
}

function validateAddress(
  address: string,
  fieldName: string
): void {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(
      `Invalid ${fieldName}: ${address}`
    );
  }
}

function validatePositiveNumber(
  value: number,
  fieldName: string,
  allowZero = false
): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Invalid ${fieldName}: ${value}`
    );
  }

  if (allowZero) {
    if (value < 0) {
      throw new Error(
        `${fieldName} cannot be negative`
      );
    }
  } else {
    if (value <= 0) {
      throw new Error(
        `${fieldName} must be greater than zero`
      );
    }
  }
}

function validateString(
  value: string,
  fieldName: string
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} is required`
    );
  }
}

/* ============================================================
   CONFIRMED ORDER
   ============================================================

   IMPORTANT:

   This function should NOT be called when the company merely
   creates an order.

   Correct lifecycle:

   Company creates order
          ↓
   Agent verification
          ↓
   Stock verification
          ↓
   awaiting_payment
          ↓
   Company pays
          ↓
   Payment verified
          ↓
   Escrow funded
          ↓
   Fraud/admin approval
          ↓
   logConfirmedOrderOnChain()

   The blockchain should therefore represent a confirmed
   transaction, not a payment request.
   ============================================================ */

export async function logConfirmedOrderOnChain(payload: {
  orderId: string;
  companyAddr: string;
  farmerAddr: string;
  cropName: string;
  quantity: number;
  amount: number;
}): Promise<{ txHash: string }> {
  const {
    orderId,
    companyAddr,
    farmerAddr,
    cropName,
    quantity,
    amount,
  } = payload;

  validateOrderLogAddress();

  validateString(orderId, "orderId");
  validateString(cropName, "cropName");

  validateAddress(
    companyAddr,
    "company address"
  );

  validateAddress(
    farmerAddr,
    "farmer address"
  );

  validatePositiveNumber(
    quantity,
    "quantity"
  );

  validatePositiveNumber(
    amount,
    "amount"
  );

  /*
   * Convert only after validation.
   *
   * Math.round keeps the existing contract interface
   * compatible with your current implementation.
   */
  const quantityBigInt = BigInt(
    Math.round(quantity)
  );

  const amountBigInt = BigInt(
    Math.round(amount)
  );

  const tx =
    await orderLog.logConfirmedOrder(
      orderId,
      companyAddr,
      farmerAddr,
      cropName,
      quantityBigInt,
      amountBigInt
    );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error(
      "Confirmed-order transaction failed: no receipt returned."
    );
  }

  return {
    txHash: receipt.hash,
  };
}

/* ============================================================
   ESCROW HASH
   ============================================================

   Razorpay IDs and payment information remain OFF-CHAIN.

   MongoDB:
     - razorpayOrderId
     - razorpayPaymentId
     - amountPaidPaise

   Blockchain:
     - keccak256 hash of those values

   This allows us to prove later that the payment record
   stored in MongoDB has not been altered.
   ============================================================ */

export function hashEscrowPayload(payload: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaidPaise: number;
}): string {
  validateString(
    payload.orderId,
    "orderId"
  );

  validateString(
    payload.razorpayOrderId,
    "razorpayOrderId"
  );

  validateString(
    payload.razorpayPaymentId,
    "razorpayPaymentId"
  );

  validatePositiveNumber(
    payload.amountPaidPaise,
    "amountPaidPaise"
  );

  const encoded =
    ethers.AbiCoder.defaultAbiCoder().encode(
      [
        "string",
        "string",
        "string",
        "uint256",
      ],
      [
        payload.orderId,
        payload.razorpayOrderId,
        payload.razorpayPaymentId,
        BigInt(
          Math.round(
            payload.amountPaidPaise
          )
        ),
      ]
    );

  return ethers.keccak256(encoded);
}

/* ============================================================
   LOG ESCROW FUNDED
   ============================================================

   Called ONLY after:

     Razorpay payment
          ↓
     Signature verified
          ↓
     Stock reserved
          ↓
     Escrow marked funded

   Then the hash is written to blockchain.
   ============================================================ */

export async function logEscrowFundedOnChain(
  payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amountPaidPaise: number;
  }
): Promise<{
  txHash: string;
  dataHash: string;
}> {
  validateOrderLogAddress();

  const dataHash =
    hashEscrowPayload(payload);

  const tx =
    await orderLog.logEscrowFunded(
      payload.orderId,
      dataHash
    );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error(
      "Escrow-funded transaction failed: no receipt returned."
    );
  }

  return {
    txHash: receipt.hash,
    dataHash,
  };
}

/* ============================================================
   TRANCHE HASH
   ============================================================

   Creates a deterministic hash from:

     orderId
     tranche type
     amount
     release timestamp

   The timestamp is generated by the backend immediately before
   the blockchain transaction.
   ============================================================ */

export function hashTranchePayload(payload: {
  orderId: string;
  type: string;
  amount: number;
  releasedAt: number;
}): string {
  validateString(
    payload.orderId,
    "orderId"
  );

  validateString(
    payload.type,
    "tranche type"
  );

  validatePositiveNumber(
    payload.amount,
    "tranche amount"
  );

  if (
    !Number.isFinite(payload.releasedAt) ||
    payload.releasedAt <= 0
  ) {
    throw new Error(
      `Invalid releasedAt: ${payload.releasedAt}`
    );
  }

  const encoded =
    ethers.AbiCoder.defaultAbiCoder().encode(
      [
        "string",
        "string",
        "uint256",
        "uint256",
      ],
      [
        payload.orderId,
        payload.type,
        BigInt(
          Math.round(payload.amount)
        ),
        BigInt(
          Math.round(payload.releasedAt)
        ),
      ]
    );

  return ethers.keccak256(encoded);
}

/* ============================================================
   LOG TRANCHE RELEASE
   ============================================================

   Valid tranche types:

     shipment
     delivery

   Example:

     Payment verified
          ↓
     Fraud approved
          ↓
     Invoice generated
          ↓
     shipment tranche released
          ↓
     Farmer can begin shipment

   Later:

     Delivery confirmed
          ↓
     delivery tranche released
   ============================================================ */

export async function logTrancheReleasedOnChain(
  payload: {
    orderId: string;
    type: "shipment" | "delivery";
    percent: number;
    amount: number;
  }
): Promise<{
  txHash: string;
  dataHash: string;
}> {
  validateOrderLogAddress();

  validateString(
    payload.orderId,
    "orderId"
  );

  if (
    payload.type !== "shipment" &&
    payload.type !== "delivery"
  ) {
    throw new Error(
      `Invalid tranche type: ${payload.type}`
    );
  }

  validatePositiveNumber(
    payload.percent,
    "tranche percent"
  );

  if (payload.percent > 100) {
    throw new Error(
      "Tranche percent cannot exceed 100"
    );
  }

  validatePositiveNumber(
    payload.amount,
    "tranche amount"
  );

  /*
   * JavaScript epoch time in milliseconds.
   *
   * This exact value is included in the hash.
   */
  const releasedAt = Date.now();

  const dataHash =
    hashTranchePayload({
      orderId: payload.orderId,
      type: payload.type,
      amount: payload.amount,
      releasedAt,
    });

  const tx =
    await orderLog.logTrancheReleased(
      payload.orderId,
      payload.type,
      BigInt(
        Math.round(payload.percent)
      ),
      dataHash
    );

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error(
      "Tranche-released transaction failed: no receipt returned."
    );
  }

  return {
    txHash: receipt.hash,
    dataHash,
  };
}