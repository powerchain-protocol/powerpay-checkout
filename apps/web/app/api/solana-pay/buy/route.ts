import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildBuyTransaction } from "@/lib/solana/sale";
import { appUrl } from "@/lib/env";
import { decimalToRaw } from "@/lib/format";

export const runtime = "nodejs";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }

export async function GET() {
  return NextResponse.json({ label: "PowerPay", icon: new URL("/assets/brand/powerpay-mark.png", appUrl).toString() }, { headers: cors });
}

export async function POST(req: NextRequest) {
  try {
    const expires = Number(req.nextUrl.searchParams.get("expires") ?? "0");
    if (!expires || Date.now() > expires) return NextResponse.json({ error: "Payment request expired" }, { status: 410, headers: cors });
    const solText = req.nextUrl.searchParams.get("sol") ?? "0";
    let lamports: bigint;
    try { lamports = decimalToRaw(solText, 9); } catch { return NextResponse.json({ error: "Invalid amount" }, { status: 400, headers: cors }); }
    if (lamports <= 0n) return NextResponse.json({ error: "Invalid amount" }, { status: 400, headers: cors });
    const sol = Number(lamports) / 1_000_000_000;
    const referenceText = req.nextUrl.searchParams.get("reference") ?? "";
    const reference = new PublicKey(referenceText);
    const { account } = await req.json();
    const buyer = new PublicKey(String(account));
    const { tx, config } = await buildBuyTransaction(buyer, lamports, reference);
    const gross = Number(config.pwrcPerSolGross) * sol;
    return NextResponse.json({
      transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      message: `Buy ${gross.toLocaleString("en-US", { maximumFractionDigits: 2 })} gross PWRC with ${sol} SOL`,
    }, { headers: cors });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create transaction" }, { status: 400, headers: cors });
  }
}
