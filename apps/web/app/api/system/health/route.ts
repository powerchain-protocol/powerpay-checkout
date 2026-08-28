import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { CANONICAL_PWRC_MINT, PWRC_TRANSFER_FEE_BPS } from "@/constants/app";
import { POWERPAY_SERVICE_FEE_BPS } from "@/constants/price-rates";
import { AppError, errorResponse } from "@/lib/errors";
import { apiJson, requestIdFor } from "@/lib/api/http";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { readSaleConfig } from "@/lib/solana/sale";
import { quotePwrcTransferFee } from "@/lib/solana/token-fee";
import { checkRpc, RPC_REQUEST_TIMEOUT_MS } from "@/lib/solana/rpc";
import { createSolanaConnection, settlementAuthorityMessage } from "@/lib/solana/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ONE_PWRC_RAW = 1_000_000_000n;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new AppError(`${label} timed out after 8 seconds`, "UPSTREAM_UNAVAILABLE", 503)),
          RPC_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    const network = resolveServerSolanaNetwork(req.nextUrl.searchParams.get("cluster"));
    const rpc = await checkRpc(network.rpcUrl);
    if (!rpc.ok || rpc.slot == null) {
      throw new AppError(rpc.error || `${network.label} RPC check failed`, "UPSTREAM_UNAVAILABLE", 503);
    }

    const connection = createSolanaConnection(network.rpcUrl);
    const mint = new PublicKey(CANONICAL_PWRC_MINT);
    const [programInfo, mintInfo, config, feeQuote] = await withTimeout(
      Promise.all([
        connection.getAccountInfo(network.programPublicKey, "confirmed"),
        connection.getAccountInfo(mint, "confirmed"),
        readSaleConfig(connection, network.programPublicKey),
        quotePwrcTransferFee(connection, mint, ONE_PWRC_RAW),
      ]),
      `${network.label} program health check`,
    );

    const programExecutable = Boolean(programInfo?.executable);
    const mintToken2022 = Boolean(mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID));
    const feePolicyValid = feeQuote.feeBasisPoints === PWRC_TRANSFER_FEE_BPS;
    const saleInitialized = Boolean(config);
    const saleEnabled = Boolean(config?.enabled);
    const canonicalMint = Boolean(config?.pwrcMint.toBase58() === CANONICAL_PWRC_MINT);

    let vault: string | null = null;
    let inventoryRaw: string | null = null;
    let inventoryAvailable: boolean | null = null;
    if (config) {
      const vaultAddress = getAssociatedTokenAddressSync(
        mint,
        config.pda,
        true,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );
      vault = vaultAddress.toBase58();
      try {
        const balance = await withTimeout(connection.getTokenAccountBalance(vaultAddress, "confirmed"), `${network.label} sale inventory`);
        inventoryRaw = balance.value.amount;
        inventoryAvailable = BigInt(balance.value.amount) > 0n;
      } catch {
        inventoryAvailable = false;
      }
    }

    const baseOperational = programExecutable && mintToken2022 && feePolicyValid && saleInitialized && canonicalMint;
    const status = !baseOperational || (saleEnabled && inventoryAvailable !== true)
      ? "degraded"
      : saleEnabled
        ? "operational"
        : "paused";

    return apiJson(requestId, {
      status,
      checkedAt: new Date().toISOString(),
      cluster: network.cluster,
      networkLabel: network.label,
      production: network.production,
      rpc: { ok: rpc.ok, slot: rpc.slot, latencyMs: rpc.latencyMs, timeoutMs: RPC_REQUEST_TIMEOUT_MS },
      settlementAuthority: {
        programId: network.programId,
        message: settlementAuthorityMessage(network.cluster),
      },
      program: { id: network.programId, deployed: Boolean(programInfo), executable: programExecutable },
      sale: {
        initialized: saleInitialized,
        enabled: saleEnabled,
        treasury: config?.treasury.toBase58() ?? null,
        vault,
        inventoryRaw,
        inventoryAvailable,
        serviceFeeBasisPoints: POWERPAY_SERVICE_FEE_BPS,
      },
      pwrc: {
        mint: CANONICAL_PWRC_MINT,
        token2022: mintToken2022,
        canonicalMint,
        transferFeeBasisPoints: feeQuote.feeBasisPoints,
        transferFeePolicyValid: feePolicyValid,
      },
    });
  } catch (error) {
    return errorResponse(error, "PowerPay network health unavailable", requestId);
  }
}
