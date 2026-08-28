import { CANONICAL_PWRC_MINT } from "@/constants/app";
import {
  SOLANA_NETWORKS,
  parseSolanaCluster,
  type SolanaCluster,
} from "@/constants/network";

function publicValue(value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

function publicBoolean(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

const defaultSolanaCluster = parseSolanaCluster(
  process.env.NEXT_PUBLIC_DEFAULT_SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
  "devnet",
);

const configuredPwrcMint = publicValue(
  process.env.NEXT_PUBLIC_PWRC_MINT,
  CANONICAL_PWRC_MINT,
);

if (configuredPwrcMint !== CANONICAL_PWRC_MINT) {
  throw new Error(
    `NEXT_PUBLIC_PWRC_MINT must equal the canonical PWRC mint ${CANONICAL_PWRC_MINT}`,
  );
}

const legacyRpc = publicValue(process.env.NEXT_PUBLIC_SOLANA_RPC_URL);
const legacyProgramId = publicValue(process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID);

const solanaRpcUrls: Record<SolanaCluster, string> = {
  devnet: publicValue(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET,
    defaultSolanaCluster === "devnet" && legacyRpc
      ? legacyRpc
      : SOLANA_NETWORKS.devnet.defaultRpcUrl,
  ),
  "mainnet-beta": publicValue(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET_BETA,
    defaultSolanaCluster === "mainnet-beta" && legacyRpc
      ? legacyRpc
      : SOLANA_NETWORKS["mainnet-beta"].defaultRpcUrl,
  ),
};

const powerPayProgramIds: Record<SolanaCluster, string> = {
  devnet: publicValue(
    process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID_DEVNET,
    defaultSolanaCluster === "devnet" ? legacyProgramId : "",
  ),
  "mainnet-beta": publicValue(
    process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID_MAINNET_BETA,
    defaultSolanaCluster === "mainnet-beta" ? legacyProgramId : "",
  ),
};

export const clientEnv = {
  defaultSolanaCluster,
  enableMainnetBeta: publicBoolean(process.env.NEXT_PUBLIC_ENABLE_MAINNET_BETA, false),
  solanaRpcUrls,
  powerPayProgramIds,
  pwrcMint: configuredPwrcMint,
  appUrl: publicValue(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
} as const;

export function clientRpcUrlFor(cluster: SolanaCluster) {
  return clientEnv.solanaRpcUrls[cluster];
}

export function clientProgramIdFor(cluster: SolanaCluster) {
  return clientEnv.powerPayProgramIds[cluster];
}
