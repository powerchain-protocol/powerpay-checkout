"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_MARKET_REFRESH_MS } from "@/constants/app";
import type { SolUsdMarketData } from "@/lib/pricing/types";

type MarketPriceContextValue = {
  solUsd: SolUsdMarketData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MarketPriceContext = createContext<MarketPriceContextValue | null>(null);

export function MarketPriceProvider({ children }: { children: React.ReactNode }) {
  const [solUsd, setSolUsd] = useState<SolUsdMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/market/sol-usd", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Market data unavailable");
      setSolUsd(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Market data unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = () => { if (document.visibilityState === "visible") void refresh(); };
    run();
    const id = window.setInterval(run, DEFAULT_MARKET_REFRESH_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [refresh]);

  const value = useMemo(() => ({ solUsd, loading, error, refresh }), [solUsd, loading, error, refresh]);
  return <MarketPriceContext.Provider value={value}>{children}</MarketPriceContext.Provider>;
}

export function useMarketPrice() {
  const context = useContext(MarketPriceContext);
  if (!context) throw new Error("useMarketPrice must be used inside MarketPriceProvider");
  return context;
}
