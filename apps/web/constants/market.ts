import { WRAPPED_SOL_MINT } from "./app";

// Pyth SOL/USD feed ID. Keep this overridable through PYTH_SOL_USD_FEED_ID.
export const PYTH_SOL_USD_FEED_ID =
  "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
export const PYTH_HERMES_BASE_URL = "https://pyth.dourolabs.app/hermes";
export const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";
export const BIRDEYE_SOL_ADDRESS = WRAPPED_SOL_MINT;
export const MARKET_REQUEST_TIMEOUT_MS = 4_500;
export const MAX_ORACLE_DEVIATION_BPS = 150;
