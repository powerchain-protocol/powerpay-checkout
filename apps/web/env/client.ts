function publicValue(name: string, value: string | undefined, fallback = "") {
  return value?.trim() || fallback;
}

export const clientEnv = {
  solanaCluster: publicValue("NEXT_PUBLIC_SOLANA_CLUSTER", process.env.NEXT_PUBLIC_SOLANA_CLUSTER, "devnet"),
  solanaRpcUrl: publicValue("NEXT_PUBLIC_SOLANA_RPC_URL", process.env.NEXT_PUBLIC_SOLANA_RPC_URL, "https://api.devnet.solana.com"),
  powerPayProgramId: publicValue("NEXT_PUBLIC_POWERPAY_PROGRAM_ID", process.env.NEXT_PUBLIC_POWERPAY_PROGRAM_ID),
  pwrcMint: publicValue("NEXT_PUBLIC_PWRC_MINT", process.env.NEXT_PUBLIC_PWRC_MINT),
  appUrl: publicValue("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
} as const;
