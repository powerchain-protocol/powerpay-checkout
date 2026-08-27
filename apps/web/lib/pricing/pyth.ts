import { serverEnv } from "@/env/server";
import { AppError } from "@/lib/errors";
import { MARKET_REQUEST_TIMEOUT_MS } from "@/constants/market";
import { fetchWithTimeout, safeNumber } from "@/utils/util";
import type { PriceObservation } from "./types";

export async function fetchPythSolUsd(): Promise<PriceObservation> {
  if (!serverEnv.pythApiKey) {
    throw new AppError("PYTH_API_KEY is not configured", "CONFIGURATION_ERROR", 503);
  }

  const base = serverEnv.pythHermesBaseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ parsed: "true" });
  const feedId = serverEnv.pythSolUsdFeedId.startsWith("0x") ? serverEnv.pythSolUsdFeedId : `0x${serverEnv.pythSolUsdFeedId}`;
  params.append("ids[]", feedId);
  const response = await fetchWithTimeout(
    `${base}/v2/updates/price/latest?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${serverEnv.pythApiKey}` },
      cache: "no-store",
    },
    MARKET_REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new AppError(`Pyth Hermes returned ${response.status}`, "UPSTREAM_UNAVAILABLE", 503);
  }

  const payload = await response.json() as {
    parsed?: Array<{ price?: { price?: string; conf?: string; expo?: number; publish_time?: number } }>;
  };
  const raw = payload.parsed?.[0]?.price;
  if (!raw?.price || raw.expo == null || !raw.publish_time) {
    throw new AppError("Pyth returned an invalid SOL/USD payload", "UPSTREAM_UNAVAILABLE", 503);
  }

  const priceUsd = safeNumber(raw.price) * 10 ** raw.expo;
  const confidenceUsd = safeNumber(raw.conf) * 10 ** raw.expo;
  if (!(priceUsd > 0)) throw new AppError("Pyth SOL/USD price is invalid", "UPSTREAM_UNAVAILABLE", 503);

  const ageSeconds = Math.max(0, Date.now() / 1000 - raw.publish_time);
  return {
    source: "pyth",
    priceUsd,
    confidenceUsd,
    updatedAt: new Date(raw.publish_time * 1000).toISOString(),
    ageSeconds,
    stale: ageSeconds > serverEnv.marketStaleAfterSeconds,
  };
}
