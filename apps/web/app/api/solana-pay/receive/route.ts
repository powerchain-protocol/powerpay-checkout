import { NextRequest, NextResponse } from "next/server";
import { address } from "@solana/kit";
import { createMerchantClient } from "@solana/pay";
import { rpcUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const recipient = address(String(req.nextUrl.searchParams.get("recipient") ?? ""));
    const amount = Number(req.nextUrl.searchParams.get("amount") ?? "0");
    const merchant = createMerchantClient({ rpcUrl });
    const url = merchant.pay.encodeURL({
      recipient,
      ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
      label: "PowerPay",
      message: "Send SOL",
    });
    return NextResponse.json({ url: url.toString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid recipient" }, { status: 400 });
  }
}
