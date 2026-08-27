import { createHash } from "node:crypto";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  calculateEpochFee,
  getAssociatedTokenAddressSync,
  getMint,
  getTransferFeeConfig,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { programIdString, rpcUrl } from "@/lib/env";

export const PWRC_DECIMALS = 9;
export const LAMPORTS_PER_SOL_BIGINT = 1_000_000_000n;

export type SaleConfig = {
  pda: PublicKey;
  authority: PublicKey;
  treasury: PublicKey;
  pwrcMint: PublicKey;
  pwrcPerSolGross: bigint;
  minLamports: bigint;
  maxLamports: bigint;
  enabled: boolean;
  bump: number;
};

function requireProgramId() {
  if (!programIdString) throw new Error("POWERPAY_PROGRAM_ID is not configured");
  return new PublicKey(programIdString);
}

export function saleConfigPda(programId = requireProgramId()) {
  return PublicKey.findProgramAddressSync([Buffer.from("sale")], programId)[0];
}

export async function readSaleConfig(connection = new Connection(rpcUrl, "confirmed")): Promise<SaleConfig | null> {
  const programId = requireProgramId();
  const pda = saleConfigPda(programId);
  const info = await connection.getAccountInfo(pda, "confirmed");
  if (!info) return null;
  if (!info.owner.equals(programId)) throw new Error("Sale config is owned by an unexpected program");
  if (info.data.length < 130) throw new Error("Sale config account is too small");

  let offset = 8; // Anchor account discriminator
  const readPubkey = () => { const key = new PublicKey(info.data.subarray(offset, offset + 32)); offset += 32; return key; };
  const readU64 = () => { const value = info.data.readBigUInt64LE(offset); offset += 8; return value; };

  const authority = readPubkey();
  const treasury = readPubkey();
  const pwrcMint = readPubkey();
  const pwrcPerSolGross = readU64();
  const minLamports = readU64();
  const maxLamports = readU64();
  const enabled = info.data[offset] === 1; offset += 1;
  const bump = info.data[offset];
  return { pda, authority, treasury, pwrcMint, pwrcPerSolGross, minLamports, maxLamports, enabled, bump };
}

export function grossPwrcRaw(lamports: bigint, rate: bigint) {
  return lamports * rate;
}

export async function quoteNetPwrc(connection: Connection, mint: PublicKey, grossRaw: bigint) {
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  const feeConfig = getTransferFeeConfig(mintInfo);
  if (!feeConfig) return { feeRaw: 0n, netRaw: grossRaw, feeBasisPoints: 0 };
  const epoch = BigInt((await connection.getEpochInfo("confirmed")).epoch);
  const feeRaw = calculateEpochFee(feeConfig, epoch, grossRaw);
  const active = epoch >= feeConfig.newerTransferFee.epoch ? feeConfig.newerTransferFee : feeConfig.olderTransferFee;
  return { feeRaw, netRaw: grossRaw - feeRaw, feeBasisPoints: active.transferFeeBasisPoints };
}

export function buyDiscriminator() {
  return createHash("sha256").update("global:buy_pwrc").digest().subarray(0, 8);
}

export async function buildBuyTransaction(buyer: PublicKey, lamports: bigint, requestedReference?: PublicKey) {
  const connection = new Connection(rpcUrl, "confirmed");
  const programId = requireProgramId();
  const config = await readSaleConfig(connection);
  if (!config) throw new Error("PWRC sale program is not initialized");
  if (!config.enabled) throw new Error("PWRC sale is currently disabled");
  if (lamports < config.minLamports || lamports > config.maxLamports) throw new Error("Purchase amount is outside the on-chain sale limits");

  const reference = requestedReference ?? Keypair.generate().publicKey;
  const saleVault = getAssociatedTokenAddressSync(config.pwrcMint, config.pda, true, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
  const buyerPwrc = getAssociatedTokenAddressSync(config.pwrcMint, buyer, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

  const data = Buffer.alloc(16);
  buyDiscriminator().copy(data, 0);
  data.writeBigUInt64LE(lamports, 8);

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: config.pda, isSigner: false, isWritable: true },
      { pubkey: config.treasury, isSigner: false, isWritable: true },
      { pubkey: config.pwrcMint, isSigner: false, isWritable: false },
      { pubkey: saleVault, isSigner: false, isWritable: true },
      { pubkey: buyerPwrc, isSigner: false, isWritable: true },
      { pubkey: reference, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: buyer, blockhash, lastValidBlockHeight }).add(ix);
  return { tx, config, reference };
}
