import {
  TOKEN_2022_PROGRAM_ID,
  calculateEpochFee,
  getMint,
  getTransferFeeConfig,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  CANONICAL_PWRC_MINT,
  PWRC_DECIMALS,
  PWRC_TRANSFER_FEE_BPS,
} from "@/constants/app";

export type PwrcTransferFeeQuote = {
  feeRaw: bigint;
  netRaw: bigint;
  feeBasisPoints: number;
  maximumFeeRaw: bigint;
  epoch: bigint;
};

export function canonicalPwrcMint() {
  return new PublicKey(CANONICAL_PWRC_MINT);
}

export function assertCanonicalPwrcMint(mint: PublicKey | string) {
  const key = typeof mint === "string" ? new PublicKey(mint) : mint;
  if (!key.equals(canonicalPwrcMint())) {
    throw new Error(`Invalid PWRC mint. Expected ${CANONICAL_PWRC_MINT}`);
  }
  return key;
}

export async function quotePwrcTransferFee(
  connection: Connection,
  mint: PublicKey,
  grossRaw: bigint,
): Promise<PwrcTransferFeeQuote> {
  assertCanonicalPwrcMint(mint);
  if (grossRaw <= 0n) throw new Error("PWRC transfer amount must be greater than zero");

  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  if (mintInfo.decimals !== PWRC_DECIMALS) {
    throw new Error(`PWRC mint must use ${PWRC_DECIMALS} decimals`);
  }

  const feeConfig = getTransferFeeConfig(mintInfo);
  if (!feeConfig) throw new Error("PWRC mint is missing the Token-2022 transfer-fee extension");

  const epoch = BigInt((await connection.getEpochInfo("confirmed")).epoch);
  const active = epoch >= feeConfig.newerTransferFee.epoch
    ? feeConfig.newerTransferFee
    : feeConfig.olderTransferFee;

  if (active.transferFeeBasisPoints !== PWRC_TRANSFER_FEE_BPS) {
    throw new Error(
      `PWRC Token-2022 transfer fee must be ${PWRC_TRANSFER_FEE_BPS} bps (2%). ` +
      `Active mint fee is ${active.transferFeeBasisPoints} bps.`,
    );
  }

  const feeRaw = calculateEpochFee(feeConfig, epoch, grossRaw);
  if (feeRaw > grossRaw) throw new Error("PWRC transfer fee exceeds transfer amount");

  return {
    feeRaw,
    netRaw: grossRaw - feeRaw,
    feeBasisPoints: active.transferFeeBasisPoints,
    maximumFeeRaw: active.maximumFee,
    epoch,
  };
}
