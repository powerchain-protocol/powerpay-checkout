import { NextRequest } from "next/server";
import { Connection } from "@solana/web3.js";
import { serverEnv } from "@/env/server";
import {
  CANONICAL_PWRC_MINT,
  PWRC_TRANSFER_FEE_BPS,
} from "@/constants/app";
import { POWERPAY_SERVICE_FEE_BPS } from "@/constants/price-rates";
import { decimalToRaw } from "@/lib/format";
import { AppError, errorResponse } from "@/lib/errors";
import { apiJson, requestIdFor } from "@/lib/api/http";
import {
  grossPwrcRaw,
  LAMPORTS_PER_SOL_BIGINT,
  PWRC_DECIMALS,
  quoteNetPwrc,
  readSaleConfig,
  serviceFeeLamports,
  totalBeforeNetworkFeeLamports,
} from "@/lib/solana/sale";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { createSolanaConnection } from "@/lib/solana/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  const solText = req.nextUrl.searchParams.get("sol") ?? "0.5";
  let lamports: bigint;
  try {
    lamports = decimalToRaw(solText, 9);
  } catch {
    return errorResponse(new AppError("Invalid SOL amount", "BAD_REQUEST", 400), undefined, requestId);
  }
  if (lamports <= 0n) {
    return errorResponse(new AppError("Invalid SOL amount", "BAD_REQUEST", 400), undefined, requestId);
  }

  try {
    const network = resolveServerSolanaNetwork(req.nextUrl.searchParams.get("cluster"));
    const sol = Number(lamports) / 1_000_000_000;
    const serviceFeeRaw = serviceFeeLamports(lamports);
    const totalRaw = totalBeforeNetworkFeeLamports(lamports);
    const serviceFeeSol = Number(serviceFeeRaw) / 1_000_000_000;
    const totalBeforeNetworkFeeSol = Number(totalRaw) / 1_000_000_000;
    const connection = createSolanaConnection(network.rpcUrl);

    try {
      const config = await readSaleConfig(connection, network.programPublicKey);
      if (!config) throw new AppError(`Sale config not initialized on ${network.label}`, "ONCHAIN_UNAVAILABLE", 503);
      const grossRaw = grossPwrcRaw(lamports, config.pwrcPerSolGross);
      const fee = await quoteNetPwrc(connection, config.pwrcMint, grossRaw);
      const scale = 10 ** PWRC_DECIMALS;

      return apiJson(requestId, {
        source: "onchain",
        cluster: network.cluster,
        networkLabel: network.label,
        production: network.production,
        programId: network.programId,
        enabled: config.enabled,
        rate: Number(config.pwrcPerSolGross),
        purchaseSol: sol,
        purchaseLamports: lamports.toString(),
        serviceFeeSol,
        serviceFeeLamports: serviceFeeRaw.toString(),
        totalBeforeNetworkFeeSol,
        totalBeforeNetworkFeeLamports: totalRaw.toString(),
        grossPwrc: Number(grossRaw) / scale,
        grossPwrcRaw: grossRaw.toString(),
        transferFeePwrc: Number(fee.feeRaw) / scale,
        transferFeePwrcRaw: fee.feeRaw.toString(),
        netPwrc: Number(fee.netRaw) / scale,
        netPwrcRaw: fee.netRaw.toString(),
        transferFeeBasisPoints: fee.feeBasisPoints,
        transferFeeMaximumPwrc: Number(fee.maximumFeeRaw) / scale,
        powerPayServiceFeeBasisPoints: POWERPAY_SERVICE_FEE_BPS,
        solanaNetworkFee: "wallet-estimated",
        minSol: Number(config.minLamports) / Number(LAMPORTS_PER_SOL_BIGINT),
        maxSol: Number(config.maxLamports) / Number(LAMPORTS_PER_SOL_BIGINT),
        mint: config.pwrcMint.toBase58(),
        treasury: config.treasury.toBase58(),
      });
    } catch (error) {
      if (serverEnv.requireOnchainQuote || network.production) {
        return errorResponse(error, `On-chain ${network.label} quote unavailable`, requestId);
      }

      const rate = serverEnv.pwrcPerSolFallback;
      return apiJson(requestId, {
        source: "preview",
        cluster: network.cluster,
        networkLabel: network.label,
        production: network.production,
        programId: network.programId,
        enabled: false,
        rate,
        purchaseSol: sol,
        purchaseLamports: lamports.toString(),
        serviceFeeSol,
        serviceFeeLamports: serviceFeeRaw.toString(),
        totalBeforeNetworkFeeSol,
        totalBeforeNetworkFeeLamports: totalRaw.toString(),
        grossPwrc: sol * rate,
        transferFeePwrc: sol * rate * (PWRC_TRANSFER_FEE_BPS / 10_000),
        netPwrc: sol * rate * (1 - PWRC_TRANSFER_FEE_BPS / 10_000),
        transferFeeBasisPoints: PWRC_TRANSFER_FEE_BPS,
        transferFeeMaximumPwrc: null,
        powerPayServiceFeeBasisPoints: POWERPAY_SERVICE_FEE_BPS,
        solanaNetworkFee: "wallet-estimated",
        mint: CANONICAL_PWRC_MINT,
        minSol: 0.01,
        maxSol: 100,
        warning: error instanceof Error ? error.message : "On-chain quote unavailable",
      });
    }
  } catch (error) {
    return errorResponse(error, "Invalid network configuration", requestId);
  }
}
