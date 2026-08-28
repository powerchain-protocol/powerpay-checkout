import { NextRequest } from "next/server";
import { address } from "@solana/kit";
import { createMerchantClient } from "@solana/pay";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { errorResponse } from "@/lib/errors";
import { apiJson, requestIdFor } from "@/lib/api/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    const network = resolveServerSolanaNetwork(req.nextUrl.searchParams.get("cluster"));
    const recipient = address(String(req.nextUrl.searchParams.get("recipient") ?? ""));
    const amount = Number(req.nextUrl.searchParams.get("amount") ?? "0");
    const merchant = createMerchantClient({ rpcUrl: network.rpcUrl });
    const url = merchant.pay.encodeURL({
      recipient,
      ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
      label: "PowerPay",
      message: `Send SOL on ${network.label}`,
    });
    return apiJson(requestId, { cluster: network.cluster, url: url.toString() });
  } catch (error) {
    return errorResponse(error, "Invalid receive request", requestId);
  }
}
