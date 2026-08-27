"use client";

import { useMemo } from "react";
import { clusterApiUrl } from "@solana/web3.js";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clientEnv } from "@/env/client";

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const network = clientEnv.solanaCluster === "mainnet-beta"
    ? WalletAdapterNetwork.Mainnet
    : clientEnv.solanaCluster === "testnet"
      ? WalletAdapterNetwork.Testnet
      : WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clientEnv.solanaRpcUrl || clusterApiUrl(network), [network]);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
