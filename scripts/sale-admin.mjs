import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  calculateEpochFee,
  createTransferCheckedWithFeeInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  getTransferFeeConfig,
} from "@solana/spl-token";

const CANONICAL_PWRC_MINT = new PublicKey("PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc");
const PWRC_DECIMALS = 9;
const REQUIRED_PWRC_TRANSFER_FEE_BPS = 200;

const clusterFlagIndex = process.argv.indexOf("--cluster");
const requestedCluster = clusterFlagIndex >= 0 ? process.argv[clusterFlagIndex + 1] : process.env.POWERPAY_CLUSTER || process.env.SOLANA_CLUSTER || "devnet";
if (requestedCluster !== "devnet" && requestedCluster !== "mainnet-beta") {
  throw new Error(`Unsupported cluster '${requestedCluster}'. Use devnet or mainnet-beta.`);
}
const CLUSTER = requestedCluster;
const ENV_SUFFIX = CLUSTER === "mainnet-beta" ? "MAINNET_BETA" : "DEVNET";
const RPC = process.env[`SOLANA_RPC_URL_${ENV_SUFFIX}`]
  || process.env.SOLANA_RPC_URL
  || (CLUSTER === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");
const PROGRAM_ID = new PublicKey(process.env[`POWERPAY_PROGRAM_ID_${ENV_SUFFIX}`] || required("POWERPAY_PROGRAM_ID"));
const connection = new Connection(RPC, "confirmed");
const authority = loadKeypair(process.env.ANCHOR_WALLET || "~/.config/solana/id.json");
const [config] = PublicKey.findProgramAddressSync([Buffer.from("sale")], PROGRAM_ID);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function configuredPwrcMint() {
  const configured = process.env.PWRC_MINT?.trim();
  const mint = configured ? new PublicKey(configured) : CANONICAL_PWRC_MINT;
  if (!mint.equals(CANONICAL_PWRC_MINT)) {
    throw new Error(`PWRC_MINT must equal canonical mint ${CANONICAL_PWRC_MINT.toBase58()}`);
  }
  return mint;
}

function expand(file) {
  return file.startsWith("~/") ? path.join(os.homedir(), file.slice(2)) : file;
}

function loadKeypair(file) {
  const bytes = JSON.parse(fs.readFileSync(expand(file), "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

function discriminator(name) {
  return crypto.createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function u64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function decimalToRaw(value, decimals) {
  const input = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(input)) throw new Error(`Invalid decimal: ${value}`);
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new Error(`Too many decimals: ${value}`);
  }
  const padded = (fraction.slice(0, decimals) + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(padded || "0");
}

function rawToDecimal(value, decimals = PWRC_DECIMALS) {
  const raw = BigInt(value);
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const fraction = (raw % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function solToLamports(value) {
  return decimalToRaw(value, 9);
}

async function send(ixs) {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = authority.publicKey;
  const signature = await sendAndConfirmTransaction(connection, tx, [authority], { commitment: "confirmed" });
  console.log(`[${CLUSTER}] Signature: ${signature}`);
  return signature;
}

async function readPwrcFeeQuote(amountRaw = 1n) {
  const mint = configuredPwrcMint();
  const mintInfo = await getMint(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  if (mintInfo.decimals !== PWRC_DECIMALS) {
    throw new Error(`Canonical PWRC mint must use ${PWRC_DECIMALS} decimals`);
  }

  const feeConfig = getTransferFeeConfig(mintInfo);
  if (!feeConfig) throw new Error("Canonical PWRC mint is missing TransferFeeConfig");

  const epoch = BigInt((await connection.getEpochInfo("confirmed")).epoch);
  const active = epoch >= feeConfig.newerTransferFee.epoch
    ? feeConfig.newerTransferFee
    : feeConfig.olderTransferFee;

  if (active.transferFeeBasisPoints !== REQUIRED_PWRC_TRANSFER_FEE_BPS) {
    throw new Error(
      `Canonical PWRC active transfer fee is ${active.transferFeeBasisPoints} bps; ` +
      `${REQUIRED_PWRC_TRANSFER_FEE_BPS} bps (2%) is required.`,
    );
  }

  const feeRaw = calculateEpochFee(feeConfig, epoch, amountRaw);
  return {
    mint,
    epoch,
    basisPoints: active.transferFeeBasisPoints,
    maximumFeeRaw: active.maximumFee,
    feeRaw,
    netRaw: amountRaw - feeRaw,
  };
}

async function initialize() {
  const feePolicy = await readPwrcFeeQuote(1n);
  const mint = feePolicy.mint;
  const treasury = new PublicKey(required("POWERPAY_TREASURY"));
  const rate = BigInt(process.env.PWRC_PER_SOL || "73500000");
  const min = solToLamports(process.env.PWRC_MIN_SOL || "0.01");
  const max = solToLamports(process.env.PWRC_MAX_SOL || "100");
  const vault = getAssociatedTokenAddressSync(
    mint,
    config,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const data = Buffer.concat([discriminator("initialize_sale"), u64(rate), u64(min), u64(max)]);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    data,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });

  await send([ix]);
  console.log(`Canonical PWRC mint: ${mint}`);
  console.log(`PWRC transfer fee: ${feePolicy.basisPoints} bps (2%)`);
  console.log(`Sale config: ${config}`);
  console.log(`Sale vault: ${vault}`);
  console.log("Initialized disabled. Fund inventory, then run pnpm sale:update with PWRC_SALE_ENABLED=true.");
}

async function update() {
  const feePolicy = await readPwrcFeeQuote(1n);
  const rate = BigInt(process.env.PWRC_PER_SOL || "73500000");
  const min = solToLamports(process.env.PWRC_MIN_SOL || "0.01");
  const max = solToLamports(process.env.PWRC_MAX_SOL || "100");
  const enabled = String(process.env.PWRC_SALE_ENABLED).toLowerCase() === "true";
  const data = Buffer.concat([
    discriminator("update_sale"),
    u64(rate),
    u64(min),
    u64(max),
    Buffer.from([enabled ? 1 : 0]),
  ]);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    data,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: false },
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: feePolicy.mint, isSigner: false, isWritable: false },
    ],
  });
  await send([ix]);
  console.log(`Updated sale. enabled=${enabled}; PWRC fee=${feePolicy.basisPoints} bps`);
}

async function fund() {
  const mint = configuredPwrcMint();
  const raw = decimalToRaw(required("PWRC_FUND_AMOUNT"), PWRC_DECIMALS);
  const feeQuote = await readPwrcFeeQuote(raw);
  const source = getAssociatedTokenAddressSync(
    mint,
    authority.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const vault = getAssociatedTokenAddressSync(
    mint,
    config,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const sourceInfo = await connection.getAccountInfo(source);
  if (!sourceInfo) throw new Error(`Authority PWRC ATA does not exist: ${source}`);
  const vaultInfo = await connection.getAccountInfo(vault);
  if (!vaultInfo) throw new Error(`Sale vault does not exist: ${vault}. Run sale:init first.`);

  const ix = createTransferCheckedWithFeeInstruction(
    source,
    mint,
    vault,
    authority.publicKey,
    raw,
    PWRC_DECIMALS,
    feeQuote.feeRaw,
    [],
    TOKEN_2022_PROGRAM_ID,
  );
  await send([ix]);
  console.log(`Funded gross: ${rawToDecimal(raw)} PWRC`);
  console.log(`Token-2022 fee: ${rawToDecimal(feeQuote.feeRaw)} PWRC (${feeQuote.basisPoints} bps)`);
  console.log(`Vault receives: ${rawToDecimal(feeQuote.netRaw)} PWRC`);
}

async function inspect() {
  const info = await connection.getAccountInfo(config, "confirmed");
  if (!info) {
    console.log("Sale config not initialized", config.toBase58());
    return;
  }

  let offset = 8;
  const pubkey = () => {
    const value = new PublicKey(info.data.subarray(offset, offset + 32));
    offset += 32;
    return value.toBase58();
  };
  const u64Value = () => {
    const value = info.data.readBigUInt64LE(offset);
    offset += 8;
    return value;
  };

  const state = {
    cluster: CLUSTER,
    rpc: RPC,
    programId: PROGRAM_ID.toBase58(),
    config: config.toBase58(),
    authority: pubkey(),
    treasury: pubkey(),
    pwrcMint: pubkey(),
    pwrcPerSolGross: u64Value().toString(),
    minLamports: u64Value().toString(),
    maxLamports: u64Value().toString(),
    enabled: info.data[offset++] === 1,
    bump: info.data[offset],
  };

  if (state.pwrcMint !== CANONICAL_PWRC_MINT.toBase58()) {
    throw new Error(`Sale config uses non-canonical PWRC mint ${state.pwrcMint}`);
  }

  const feePolicy = await readPwrcFeeQuote(1n);
  console.log(JSON.stringify({
    ...state,
    canonicalMint: CANONICAL_PWRC_MINT.toBase58(),
    transferFeeBasisPoints: feePolicy.basisPoints,
    transferFeePercent: feePolicy.basisPoints / 100,
    transferFeeMaximumRaw: feePolicy.maximumFeeRaw.toString(),
    solanaNetworkFee: "separate; paid by transaction fee payer",
    powerPayServiceFeeBasisPoints: 0,
  }, null, 2));
}

const command = process.argv[2];
if (command === "initialize") await initialize();
else if (command === "update") await update();
else if (command === "fund") await fund();
else if (command === "inspect") await inspect();
else throw new Error("Usage: sale-admin.mjs initialize|update|fund|inspect [--cluster devnet|mainnet-beta]");
