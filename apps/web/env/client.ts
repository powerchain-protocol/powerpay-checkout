import { CANONICAL_PWRC_MINT } from "@/constants/app";

function publicValue(name: string, value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

const configuredPwrcMint = publicValue(
  "NEXT_PUBLIC_PWRC_MINT",
  process.env.NEXT_PUBLIC_PWRC_MINT,
  CANONICAL_PWRC_MINT,
);

if (configuredPwrcMint !== CANONICAL_PWRC_MINT) {
  throw new Error(
    `NEXT_PUBLIC_PWRC_MINT must equal the canonical PWRC mint ${CANONICAL_PWRC_MINT}`,
  );
}

export const clientEnv = {
  solanaCluster: publicValue("NEXT_PUBLIC_SOLANA_CLUSTER", process.env.NEXT_PUBLIC_SOLANA_CLUSTER, "devnet"),
  solanaRpcUrl: publicValue("NEXT_PUBLIC_SOLANA_RPC_URL", process.env.NEXT_PUBLIC_SOLANA_RPC_URL, "https://api.devnet.solana.com"),
  powerPayProgramId: publicValue("NEXT_PUBLIC_POWERPAY_PROGRAM_ID", process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID),
  pwrcMint: configuredPwrcMint,
  appUrl: publicValue("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
} as const;
