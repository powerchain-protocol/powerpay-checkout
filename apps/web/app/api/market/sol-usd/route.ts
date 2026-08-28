import { NextRequest } from "next/server";
import { getSolUsdMarketData } from "@/lib/pricing";
import { errorResponse } from "@/lib/errors";
import { apiJson, requestIdFor } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    return apiJson(requestId, await getSolUsdMarketData());
  } catch (error) {
    return errorResponse(error, "SOL/USD market data unavailable", requestId);
  }
}
