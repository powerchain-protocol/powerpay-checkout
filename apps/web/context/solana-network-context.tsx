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
import { clientEnv, clientProgramIdFor, clientRpcUrlFor } from "@/env/client";
import {
  SOLANA_NETWORKS,
  isSolanaCluster,
  type SolanaCluster,
} from "@/constants/network";

const STORAGE_KEY = "powerpay.solana.cluster";

type SolanaNetworkContextValue = {
  cluster: SolanaCluster;
  setCluster: (cluster: SolanaCluster) => void;
  rpcUrl: string;
  programId: string;
  label: string;
  shortLabel: string;
  badge: "TEST" | "LIVE";
  production: boolean;
  mainnetEnabled: boolean;
};

const SolanaNetworkContext = createContext<SolanaNetworkContextValue | null>(null);

export function SolanaNetworkProvider({ children }: { children: ReactNode }) {
  const [cluster, setClusterState] = useState<SolanaCluster>(clientEnv.defaultSolanaCluster);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!isSolanaCluster(saved)) return;
    if (saved === "mainnet-beta" && !clientEnv.enableMainnetBeta) return;
    setClusterState(saved);
  }, []);

  const setCluster = useCallback((next: SolanaCluster) => {
    if (next === "mainnet-beta" && !clientEnv.enableMainnetBeta) return;
    setClusterState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const network = SOLANA_NETWORKS[cluster];
  const value = useMemo<SolanaNetworkContextValue>(() => ({
    cluster,
    setCluster,
    rpcUrl: clientRpcUrlFor(cluster),
    programId: clientProgramIdFor(cluster),
    label: network.label,
    shortLabel: network.shortLabel,
    badge: network.badge,
    production: network.production,
    mainnetEnabled: clientEnv.enableMainnetBeta,
  }), [cluster, network.badge, network.label, network.production, network.shortLabel, setCluster]);

  return <SolanaNetworkContext.Provider value={value}>{children}</SolanaNetworkContext.Provider>;
}

export function useSolanaNetwork() {
  const context = useContext(SolanaNetworkContext);
  if (!context) throw new Error("useSolanaNetwork must be used inside SolanaNetworkProvider");
  return context;
}
