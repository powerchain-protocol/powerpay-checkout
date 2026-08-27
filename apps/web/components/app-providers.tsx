"use client";

import { SolanaProvider } from "./solana-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <SolanaProvider>{children}</SolanaProvider>;
}
