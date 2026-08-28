import { BIRDEYE_SOL_ADDRESS, MARKET_REQUEST_TIMEOUT_MS } from "@/constants/market";
import { serverEnv } from "@/env/server";
import { AppError } from "@/lib/errors";
import { fetchWithTimeout, readJsonResponse, safeNumber } from "@/utils/util";
import type { PriceObservation } from "./types";

export async function fetchBirdeyeSolUsd(): Promise<PriceObservation> {
  if (!serverEnv.birdeyeApiKey) {
    throw new AppError("BIRDEYE_API_KEY is not configured", "CONFIGURATION_ERROR", 503);
  }

  const base = serverEnv.birdeyeBaseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ address: BIRDEYE_SOL_ADDRESS, include_liquidity: "true" });
  const response = await fetchWithTimeout(
    `${base}/defi/price?${params.toString()}`,
    {
      headers: {
        "X-API-KEY": serverEnv.birdeyeApiKey,
        "x-chain": "solana",
      },
      cache: "no-store",
    },
    MARKET_REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new AppError(`Birdeye returned ${response.status}`, "UPSTREAM_UNAVAILABLE", 503);
  }

  const payload = await readJsonResponse<{
    success?: boolean;
    data?: {
      value?: number;
      price?: number;
      updateUnixTime?: number;
      updatedAt?: number;
      liquidity?: number;
    } | null;
  }>(response);
  if (payload.success === false) throw new AppError("Birdeye returned an unsuccessful response", "UPSTREAM_UNAVAILABLE", 503);
  const priceUsd = safeNumber(payload.data?.value ?? payload.data?.price);
  if (!(priceUsd > 0)) throw new AppError("Birdeye SOL/USD price is unavailable", "UPSTREAM_UNAVAILABLE", 503);

  const updateSecondsRaw = safeNumber(payload.data?.updateUnixTime ?? payload.data?.updatedAt);
  const updateSeconds = updateSecondsRaw > 10_000_000_000 ? updateSecondsRaw / 1000 : updateSecondsRaw;
  const hasTimestamp = updateSeconds > 0;
  const ageSeconds = hasTimestamp ? Math.max(0, Date.now() / 1000 - updateSeconds) : Number.POSITIVE_INFINITY;
  return {
    source: "birdeye",
    priceUsd,
    liquidityUsd: safeNumber(payload.data?.liquidity) || undefined,
    updatedAt: hasTimestamp ? new Date(updateSeconds * 1000).toISOString() : new Date().toISOString(),
    ageSeconds,
    stale: !hasTimestamp || ageSeconds > serverEnv.marketStaleAfterSeconds,
  };
}
