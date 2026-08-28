import { SOLANA_NETWORKS, type SolanaCluster } from "@/constants/network";

export function explorerTx(signature: string, cluster: SolanaCluster) {
  return `https://solscan.io/tx/${signature}${SOLANA_NETWORKS[cluster].explorerQuery}`;
}

export function explorerAddress(address: string, cluster: SolanaCluster) {
  return `https://solscan.io/account/${address}${SOLANA_NETWORKS[cluster].explorerQuery}`;
}
