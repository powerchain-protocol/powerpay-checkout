import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { purchaseReceiptPda, serviceFeeLamports, totalBeforeNetworkFeeLamports } from "@/lib/solana/sale";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { errorResponse } from "@/lib/errors";
import { apiJson, requestIdFor } from "@/lib/api/http";
import { createSolanaConnection } from "@/lib/solana/solana";
import { POWERPAY_SERVICE_FEE_BPS, PWRC_TRANSFER_FEE_BPS } from "@/constants/price-rates";

export const runtime = "nodejs";

const RECEIPT_DATA_LENGTH = 8 + 32 + 32 + 8 + 2 + 8 + 8 + 8 + 2 + 8 + 8 + 8 + 1;

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    const network = resolveServerSolanaNetwork(req.nextUrl.searchParams.get("cluster"));
    const reference = new PublicKey(req.nextUrl.searchParams.get("reference") ?? "");
    const expectedLamportsText = req.nextUrl.searchParams.get("lamports") ?? "";
    if (!/^\d+$/.test(expectedLamportsText)) throw new Error("Expected lamports are required");
    const expectedLamports = BigInt(expectedLamportsText);
    if (expectedLamports <= 0n) throw new Error("Expected lamports are invalid");

    const programId = network.programPublicKey;
    const connection = createSolanaConnection(network.rpcUrl);
    const receipt = purchaseReceiptPda(reference, programId);
    const info = await connection.getAccountInfo(receipt, "confirmed");
    if (!info) return apiJson(requestId, { confirmed: false, cluster: network.cluster });
    if (!info.owner.equals(programId)) throw new Error("Purchase receipt has an unexpected owner");
    if (info.data.length < RECEIPT_DATA_LENGTH) throw new Error("Purchase receipt is malformed");

    let offset = 8;
    const buyer = new PublicKey(info.data.subarray(offset, offset + 32)); offset += 32;
    const recordedReference = new PublicKey(info.data.subarray(offset, offset + 32)); offset += 32;
    const paidLamports = info.data.readBigUInt64LE(offset); offset += 8;
    const serviceFeeBps = info.data.readUInt16LE(offset); offset += 2;
    const recordedServiceFeeLamports = info.data.readBigUInt64LE(offset); offset += 8;
    const recordedTotalLamports = info.data.readBigUInt64LE(offset); offset += 8;
    const grossPwrcRaw = info.data.readBigUInt64LE(offset); offset += 8;
    const transferFeeBps = info.data.readUInt16LE(offset); offset += 2;
    const transferFeeRaw = info.data.readBigUInt64LE(offset); offset += 8;
    const netPwrcRaw = info.data.readBigUInt64LE(offset); offset += 8;
    const slot = info.data.readBigUInt64LE(offset);

    if (!recordedReference.equals(reference)) throw new Error("Purchase receipt reference mismatch");
    if (paidLamports !== expectedLamports) throw new Error("Purchase receipt amount mismatch");
    if (serviceFeeBps !== POWERPAY_SERVICE_FEE_BPS) throw new Error("Unexpected PowerPay service fee in receipt");
    if (recordedServiceFeeLamports !== serviceFeeLamports(expectedLamports)) throw new Error("Purchase receipt service-fee amount mismatch");
    if (recordedTotalLamports !== totalBeforeNetworkFeeLamports(expectedLamports)) throw new Error("Purchase receipt total amount mismatch");
    if (transferFeeBps !== PWRC_TRANSFER_FEE_BPS) throw new Error("Unexpected PWRC transfer fee in receipt");

    const signatures = await connection.getSignaturesForAddress(receipt, { limit: 1 }, "confirmed");
    const signature = signatures[0]?.signature ?? null;

    return apiJson(requestId, {
      confirmed: true,
      cluster: network.cluster,
      signature,
      receipt: receipt.toBase58(),
      buyer: buyer.toBase58(),
      purchaseLamports: paidLamports.toString(),
      serviceFeeBasisPoints: serviceFeeBps,
      serviceFeeLamports: recordedServiceFeeLamports.toString(),
      totalBeforeNetworkFeeLamports: recordedTotalLamports.toString(),
      grossPwrcRaw: grossPwrcRaw.toString(),
      transferFeeBasisPoints: transferFeeBps,
      transferFeeRaw: transferFeeRaw.toString(),
      netPwrcRaw: netPwrcRaw.toString(),
      slot: slot.toString(),
    });
  } catch (error) {
    return errorResponse(error, "Invalid payment reference", requestId);
  }
}
