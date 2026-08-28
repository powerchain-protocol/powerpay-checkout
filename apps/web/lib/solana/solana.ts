import { Connection, PublicKey } from "@solana/web3.js";
import type { SolanaCluster } from "@/constants/network";
import { RPC_REQUEST_TIMEOUT_MS } from "./rpc";

export function createSolanaConnection(rpcUrl: string) {
  return new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: RPC_REQUEST_TIMEOUT_MS,
  });
}

export function assertPublicKey(value: string, label = "Solana address") {
  try {
    return new PublicKey(value);
  } catch (cause) {
    throw new Error(`${label} is invalid`, { cause });
  }
}

export function settlementAuthorityMessage(cluster: SolanaCluster) {
  return `Selected ${cluster} RPC is a read/transport endpoint only. Settlement authority remains the deployed PowerPay program and its on-chain SaleConfig.`;
}
