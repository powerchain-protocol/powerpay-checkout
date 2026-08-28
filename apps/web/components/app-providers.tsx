"use client";

import { SolanaNetworkProvider } from "@/context/solana-network-context";
import { SystemHealthProvider } from "@/context/system-health-context";
import { SolanaProvider } from "./solana-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SolanaNetworkProvider>
      <SystemHealthProvider>
        <SolanaProvider>{children}</SolanaProvider>
      </SystemHealthProvider>
    </SolanaNetworkProvider>
  );
}
