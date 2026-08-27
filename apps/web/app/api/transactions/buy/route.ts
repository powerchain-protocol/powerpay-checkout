import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildBuyTransaction } from "@/lib/solana/sale";
import { decimalToRaw } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const buyer = new PublicKey(String(body.account));
    const sol = String(body.sol ?? "");
    const lamports = decimalToRaw(sol, 9);
    if (lamports <= 0n) return NextResponse.json({ error: "Invalid SOL amount" }, { status: 400 });
    const { tx, reference } = await buildBuyTransaction(buyer, lamports);
    return NextResponse.json({ reference: reference.toBase58(), transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64") });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to build purchase" }, { status: 400 });
  }
}
