import { DEFAULT_MARKET_STALE_AFTER_SECONDS } from "@/constants/app";
import { PYTH_HERMES_BASE_URL, PYTH_SOL_USD_FEED_ID } from "@/constants/market";

function value(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function numberValue(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const serverEnv = {
  solanaRpcUrl: value("SOLANA_RPC_URL", process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"),
  powerPayProgramId: value("POWERPAY_PROGRAM_ID", process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID || ""),
  pwrcPerSolFallback: numberValue("PWRC_PER_SOL_FALLBACK", 73_500_000),
  requireOnchainQuote: value("POWERPAY_REQUIRE_ONCHAIN_QUOTE", "false") === "true",
  solUsdFallback: numberValue("SOL_USD_FALLBACK", 147),
  pythApiKey: value("PYTH_API_KEY"),
  pythHermesBaseUrl: value("PYTH_HERMES_BASE_URL", PYTH_HERMES_BASE_URL),
  pythSolUsdFeedId: value("PYTH_SOL_USD_FEED_ID", PYTH_SOL_USD_FEED_ID),
  birdeyeApiKey: value("BIRDEYE_API_KEY"),
  birdeyeBaseUrl: value("BIRDEYE_BASE_URL", "https://public-api.birdeye.so"),
  marketStaleAfterSeconds: numberValue("MARKET_STALE_AFTER_SECONDS", DEFAULT_MARKET_STALE_AFTER_SECONDS),
} as const;
