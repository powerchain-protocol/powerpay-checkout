import { PublicKey } from "@solana/web3.js";
import { AppError } from "@/lib/errors";
import { serverEnv, serverProgramIdFor, serverRpcUrlFor } from "@/env/server";
import {
  parseSolanaCluster,
  SOLANA_NETWORKS,
  type SolanaCluster,
} from "@/constants/network";

export type ServerSolanaNetwork = {
  cluster: SolanaCluster;
  label: string;
  production: boolean;
  rpcUrl: string;
  programId: string;
  programPublicKey: PublicKey;
};

export function resolveServerSolanaNetwork(input?: string | null): ServerSolanaNetwork {
  const cluster = input
    ? parseSolanaCluster(input, serverEnv.defaultSolanaCluster)
    : serverEnv.defaultSolanaCluster;

  if (input && input !== "devnet" && input !== "mainnet-beta") {
    throw new AppError(
      `Unsupported Solana cluster '${input}'. Use devnet or mainnet-beta.`,
      "BAD_REQUEST",
      400,
    );
  }

  if (cluster === "mainnet-beta" && !serverEnv.enableMainnetBeta) {
    throw new AppError("Mainnet Beta execution is disabled by server policy", "CONFIGURATION_ERROR", 503);
  }

  const rpcUrl = serverRpcUrlFor(cluster);
  const programId = serverProgramIdFor(cluster);
  if (!rpcUrl) {
    throw new AppError(`${cluster} RPC is not configured`, "CONFIGURATION_ERROR", 503);
  }
  if (!programId) {
    throw new AppError(`${cluster} PowerPay program id is not configured`, "CONFIGURATION_ERROR", 503);
  }

  let programPublicKey: PublicKey;
  try {
    programPublicKey = new PublicKey(programId);
  } catch (cause) {
    throw new AppError(`${cluster} PowerPay program id is invalid`, "CONFIGURATION_ERROR", 503, cause);
  }

  return {
    cluster,
    label: SOLANA_NETWORKS[cluster].label,
    production: SOLANA_NETWORKS[cluster].production,
    rpcUrl,
    programId,
    programPublicKey,
  };
}
