import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { programIdString, rpcUrl } from "@/lib/env";
import { purchaseReceiptPda } from "@/lib/solana/sale";

export const runtime = "nodejs";

const RECEIPT_DATA_LENGTH = 8 + 32 + 32 + 8 + 8 + 2 + 8 + 8 + 8 + 1;

export async function GET(req: NextRequest) {
  try {
    if (!programIdString) throw new Error("POWERPAY_PROGRAM_ID is not configured");
    const reference = new PublicKey(req.nextUrl.searchParams.get("reference") ?? "");
    const expectedLamportsText = req.nextUrl.searchParams.get("lamports") ?? "";
    if (!/^\d+$/.test(expectedLamportsText)) throw new Error("Expected lamports are required");
    const expectedLamports = BigInt(expectedLamportsText);
    if (expectedLamports <= 0n) throw new Error("Expected lamports are invalid");

    const programId = new PublicKey(programIdString);
    const connection = new Connection(rpcUrl, "confirmed");
    const receipt = purchaseReceiptPda(reference, programId);
    const info = await connection.getAccountInfo(receipt, "confirmed");
    if (!info) return NextResponse.json({ confirmed: false });
    if (!info.owner.equals(programId)) throw new Error("Purchase receipt has an unexpected owner");
    if (info.data.length < RECEIPT_DATA_LENGTH) throw new Error("Purchase receipt is malformed");

    let offset = 8; // Anchor discriminator
    const buyer = new PublicKey(info.data.subarray(offset, offset + 32)); offset += 32;
    const recordedReference = new PublicKey(info.data.subarray(offset, offset + 32)); offset += 32;
    const paidLamports = info.data.readBigUInt64LE(offset); offset += 8;
    const grossPwrcRaw = info.data.readBigUInt64LE(offset); offset += 8;
    const transferFeeBps = info.data.readUInt16LE(offset); offset += 2;
    const transferFeeRaw = info.data.readBigUInt64LE(offset); offset += 8;
    const netPwrcRaw = info.data.readBigUInt64LE(offset); offset += 8;
    const slot = info.data.readBigUInt64LE(offset);

    if (!recordedReference.equals(reference)) throw new Error("Purchase receipt reference mismatch");
    if (paidLamports !== expectedLamports) throw new Error("Purchase receipt amount mismatch");
    if (transferFeeBps !== 200) throw new Error("Unexpected PWRC transfer fee in receipt");

    const signatures = await connection.getSignaturesForAddress(receipt, { limit: 1 }, "confirmed");
    const signature = signatures[0]?.signature ?? null;

    return NextResponse.json({
      confirmed: true,
      signature,
      receipt: receipt.toBase58(),
      buyer: buyer.toBase58(),
      lamports: paidLamports.toString(),
      grossPwrcRaw: grossPwrcRaw.toString(),
      transferFeeBasisPoints: transferFeeBps,
      transferFeeRaw: transferFeeRaw.toString(),
      netPwrcRaw: netPwrcRaw.toString(),
      slot: slot.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payment reference" },
      { status: 400 },
    );
  }
}
