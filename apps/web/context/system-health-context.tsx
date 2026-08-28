"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SYSTEM_HEALTH_REFRESH_MS } from "@/constants/app";
import { useSolanaNetwork } from "@/context/solana-network-context";
import { fetchData } from "@/data/fetch-data";

type HealthStatus = "operational" | "paused" | "degraded" | "unknown";

export type PowerPaySystemHealth = {
  status: HealthStatus;
  checkedAt: string | null;
  rpcSlot: number | null;
  rpcLatencyMs: number | null;
  settlementAuthorityMessage: string | null;
  programExecutable: boolean | null;
  saleInitialized: boolean | null;
  saleEnabled: boolean | null;
  inventoryAvailable: boolean | null;
  token2022: boolean | null;
  transferFeePolicyValid: boolean | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SystemHealthContext = createContext<PowerPaySystemHealth | null>(null);

export function SystemHealthProvider({ children }: { children: ReactNode }) {
  const { cluster, programId } = useSolanaNetwork();
  const [status, setStatus] = useState<HealthStatus>("unknown");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [rpcSlot, setRpcSlot] = useState<number | null>(null);
  const [rpcLatencyMs, setRpcLatencyMs] = useState<number | null>(null);
  const [settlementAuthorityMessage, setSettlementAuthorityMessage] = useState<string | null>(null);
  const [programExecutable, setProgramExecutable] = useState<boolean | null>(null);
  const [saleInitialized, setSaleInitialized] = useState<boolean | null>(null);
  const [saleEnabled, setSaleEnabled] = useState<boolean | null>(null);
  const [inventoryAvailable, setInventoryAvailable] = useState<boolean | null>(null);
  const [token2022, setToken2022] = useState<boolean | null>(null);
  const [transferFeePolicyValid, setTransferFeePolicyValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!programId) {
      setStatus("degraded");
      setCheckedAt(null);
      setRpcSlot(null);
      setRpcLatencyMs(null);
      setSettlementAuthorityMessage(null);
      setProgramExecutable(false);
      setSaleInitialized(false);
      setSaleEnabled(false);
      setInventoryAvailable(null);
      setToken2022(null);
      setTransferFeePolicyValid(null);
      setError("Sale program is not configured for this network.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchData<{
        status?: HealthStatus;
        checkedAt?: string;
        rpc?: { slot?: number; latencyMs?: number };
        settlementAuthority?: { message?: string };
        program?: { executable?: boolean };
        sale?: { initialized?: boolean; enabled?: boolean; inventoryAvailable?: boolean | null };
        pwrc?: { token2022?: boolean; transferFeePolicyValid?: boolean };
      }>(`/api/system/health?cluster=${encodeURIComponent(cluster)}`, { timeoutMs: 8_500 });

      setStatus(data.status ?? "unknown");
      setCheckedAt(data.checkedAt ?? null);
      setRpcSlot(data.rpc?.slot ?? null);
      setRpcLatencyMs(data.rpc?.latencyMs ?? null);
      setSettlementAuthorityMessage(data.settlementAuthority?.message ?? null);
      setProgramExecutable(Boolean(data.program?.executable));
      setSaleInitialized(Boolean(data.sale?.initialized));
      setSaleEnabled(Boolean(data.sale?.enabled));
      setInventoryAvailable(data.sale?.inventoryAvailable == null ? null : Boolean(data.sale.inventoryAvailable));
      setToken2022(Boolean(data.pwrc?.token2022));
      setTransferFeePolicyValid(Boolean(data.pwrc?.transferFeePolicyValid));
      setError(null);
    } catch (caught) {
      setStatus("degraded");
      setError(caught instanceof Error ? caught.message : "Network health unavailable");
    } finally {
      setLoading(false);
    }
  }, [cluster, programId]);

  useEffect(() => {
    void refresh();
    const run = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = window.setInterval(run, DEFAULT_SYSTEM_HEALTH_REFRESH_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [refresh]);

  const value = useMemo<PowerPaySystemHealth>(
    () => ({
      status,
      checkedAt,
      rpcSlot,
      rpcLatencyMs,
      settlementAuthorityMessage,
      programExecutable,
      saleInitialized,
      saleEnabled,
      inventoryAvailable,
      token2022,
      transferFeePolicyValid,
      loading,
      error,
      refresh,
    }),
    [
      checkedAt,
      error,
      loading,
      programExecutable,
      refresh,
      rpcLatencyMs,
      rpcSlot,
      settlementAuthorityMessage,
      saleEnabled,
      inventoryAvailable,
      saleInitialized,
      status,
      token2022,
      transferFeePolicyValid,
    ],
  );

  return <SystemHealthContext.Provider value={value}>{children}</SystemHealthContext.Provider>;
}

export function useSystemHealth() {
  const context = useContext(SystemHealthContext);
  if (!context) throw new Error("useSystemHealth must be used inside SystemHealthProvider");
  return context;
}
