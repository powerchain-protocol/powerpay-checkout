import { DEFAULT_MARKET_STALE_AFTER_SECONDS } from "@/constants/app";
import { PYTH_HERMES_BASE_URL, PYTH_SOL_USD_FEED_ID } from "@/constants/market";
import {
  SOLANA_NETWORKS,
  parseSolanaCluster,
  type SolanaCluster,
} from "@/constants/network";

function value(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function numberValue(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanValue(name: string, fallback: boolean) {
  const normalized = process.env[name]?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

const defaultSolanaCluster = parseSolanaCluster(
  value("SOLANA_CLUSTER", process.env.NEXT_PUBLIC_DEFAULT_SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet"),
  "devnet",
);

const legacyRpc = value("SOLANA_RPC_URL", process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "");
const legacyProgramId = value("POWERPAY_PROGRAM_ID", process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID || "");

const solanaRpcUrls: Record<SolanaCluster, string> = {
  devnet: value(
    "SOLANA_RPC_URL_DEVNET",
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET
      || (defaultSolanaCluster === "devnet" ? legacyRpc : "")
      || SOLANA_NETWORKS.devnet.defaultRpcUrl,
  ),
  "mainnet-beta": value(
    "SOLANA_RPC_URL_MAINNET_BETA",
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET_BETA
      || (defaultSolanaCluster === "mainnet-beta" ? legacyRpc : "")
      || SOLANA_NETWORKS["mainnet-beta"].defaultRpcUrl,
  ),
};

const powerPayProgramIds: Record<SolanaCluster, string> = {
  devnet: value(
    "POWERPAY_PROGRAM_ID_DEVNET",
    process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID_DEVNET
      || (defaultSolanaCluster === "devnet" ? legacyProgramId : ""),
  ),
  "mainnet-beta": value(
    "POWERPAY_PROGRAM_ID_MAINNET_BETA",
    process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID_MAINNET_BETA
      || (defaultSolanaCluster === "mainnet-beta" ? legacyProgramId : ""),
  ),
};

export const serverEnv = {
  defaultSolanaCluster,
  enableMainnetBeta: booleanValue("POWERPAY_ENABLE_MAINNET_BETA", false),
  solanaRpcUrls,
  powerPayProgramIds,
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

export function serverRpcUrlFor(cluster: SolanaCluster) {
  return serverEnv.solanaRpcUrls[cluster];
}

export function serverProgramIdFor(cluster: SolanaCluster) {
  return serverEnv.powerPayProgramIds[cluster];
}
