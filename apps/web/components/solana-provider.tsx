"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletConnectModalProvider } from "./wallet-connect-modal";
import { WalletBalanceProvider } from "@/context/wallet-balance-context";
import { useSolanaNetwork } from "@/context/solana-network-context";

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const { cluster, rpcUrl } = useSolanaNetwork();

  return (
    <ConnectionProvider key={cluster} endpoint={rpcUrl} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <WalletBalanceProvider>
          <WalletConnectModalProvider>{children}</WalletConnectModalProvider>
        </WalletBalanceProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
