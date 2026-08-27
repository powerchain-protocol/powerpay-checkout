export type MarketPriceSource = "pyth" | "birdeye" | "fallback";

export type PriceObservation = {
  source: MarketPriceSource;
  priceUsd: number;
  updatedAt: string;
  ageSeconds: number;
  stale: boolean;
  confidenceUsd?: number;
  liquidityUsd?: number;
};

export type SolUsdMarketData = {
  pair: "SOL/USD";
  priceUsd: number;
  source: MarketPriceSource;
  updatedAt: string;
  stale: boolean;
  deviationBps: number | null;
  sources: PriceObservation[];
};
