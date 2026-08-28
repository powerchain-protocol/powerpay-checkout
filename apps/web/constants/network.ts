export const SUPPORTED_SOLANA_CLUSTERS = ["devnet", "mainnet-beta"] as const;

export type SolanaCluster = (typeof SUPPORTED_SOLANA_CLUSTERS)[number];

export type SolanaNetworkConfig = {
  cluster: SolanaCluster;
  label: string;
  shortLabel: string;
  badge: "TEST" | "LIVE";
  production: boolean;
  defaultRpcUrl: string;
  explorerQuery: string;
};

export const SOLANA_NETWORKS: Record<SolanaCluster, SolanaNetworkConfig> = {
  devnet: {
    cluster: "devnet",
    label: "Devnet",
    shortLabel: "DEV",
    badge: "TEST",
    production: false,
    defaultRpcUrl: "https://api.devnet.solana.com",
    explorerQuery: "?cluster=devnet",
  },
  "mainnet-beta": {
    cluster: "mainnet-beta",
    label: "Mainnet Beta",
    shortLabel: "MAIN",
    badge: "LIVE",
    production: true,
    defaultRpcUrl: "https://api.mainnet-beta.solana.com",
    explorerQuery: "",
  },
};

export function isSolanaCluster(value: string | null | undefined): value is SolanaCluster {
  return value === "devnet" || value === "mainnet-beta";
}

export function parseSolanaCluster(
  value: string | null | undefined,
  fallback: SolanaCluster = "devnet",
): SolanaCluster {
  return isSolanaCluster(value) ? value : fallback;
}

export function solanaNetwork(cluster: SolanaCluster) {
  return SOLANA_NETWORKS[cluster];
}
