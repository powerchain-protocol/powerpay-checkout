import { MAX_ORACLE_DEVIATION_BPS } from "@/constants/market";
import { serverEnv } from "@/env/server";
import { percentageDifference } from "@/utils/util";
import { fetchBirdeyeSolUsd } from "./birdeye";
import { fetchPythSolUsd } from "./pyth";
import type { PriceObservation, SolUsdMarketData } from "./types";

function fallbackObservation(): PriceObservation {
  return {
    source: "fallback",
    priceUsd: serverEnv.solUsdFallback,
    updatedAt: new Date().toISOString(),
    ageSeconds: 0,
    stale: true,
  };
}

export async function getSolUsdMarketData(): Promise<SolUsdMarketData> {
  const results = await Promise.allSettled([fetchPythSolUsd(), fetchBirdeyeSolUsd()]);
  const sources = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const pyth = sources.find((source) => source.source === "pyth");
  const birdeye = sources.find((source) => source.source === "birdeye");

  const deviationBps = pyth && birdeye
    ? Math.round(percentageDifference(pyth.priceUsd, birdeye.priceUsd) * 10_000)
    : null;

  // Pyth is primary when fresh. Birdeye is an independent market-data fallback.
  // If both are stale/unavailable, the configured display fallback is clearly marked stale.
  const selected = (!pyth?.stale && pyth)
    || (!birdeye?.stale && birdeye)
    || pyth
    || birdeye
    || fallbackObservation();

  const stale = selected.stale || (deviationBps != null && deviationBps > MAX_ORACLE_DEVIATION_BPS);

  return {
    pair: "SOL/USD",
    priceUsd: selected.priceUsd,
    source: selected.source,
    updatedAt: selected.updatedAt,
    stale,
    deviationBps,
    sources: sources.length ? sources : [selected],
  };
}
