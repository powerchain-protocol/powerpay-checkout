import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { programIdString, rpcUrl } from "@/lib/env";
import { buyDiscriminator } from "@/lib/solana/sale";

export const runtime = "nodejs";

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function decodeBase58(value: string) {
  if (!value) return Buffer.alloc(0);
  const bytes = [0];
  for (const char of value) {
    const digit = BASE58.indexOf(char);
    if (digit < 0) throw new Error("Invalid base58 instruction data");
    let carry = digit;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < value.length - 1 && value[i] === "1"; i += 1) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

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
    const candidates = await connection.getSignaturesForAddress(reference, { limit: 8 }, "confirmed");
    const discriminator = buyDiscriminator();

    for (const candidate of candidates) {
      if (candidate.err) continue;
      const tx = await connection.getParsedTransaction(candidate.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx || tx.meta?.err) continue;

      for (const instruction of tx.transaction.message.instructions) {
        if (!("programId" in instruction) || !instruction.programId.equals(programId)) continue;
        if (!("data" in instruction) || !("accounts" in instruction)) continue;
        if (!instruction.accounts.some((key) => key.equals(reference))) continue;

        const data = decodeBase58(instruction.data);
        if (data.length !== 16 || !data.subarray(0, 8).equals(discriminator)) continue;
        const paidLamports = data.readBigUInt64LE(8);
        if (paidLamports !== expectedLamports) continue;

        return NextResponse.json({ confirmed: true, signature: candidate.signature });
      }
    }

    return NextResponse.json({ confirmed: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payment reference" },
      { status: 400 },
    );
  }
}
