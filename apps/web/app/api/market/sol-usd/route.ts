import { NextResponse } from "next/server";
import { getSolUsdMarketData } from "@/lib/pricing";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const market = await getSolUsdMarketData();
    return NextResponse.json(market, {
      headers: {
        "Cache-Control": "public, max-age=5, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return errorResponse(error, "SOL/USD market data unavailable");
  }
}
