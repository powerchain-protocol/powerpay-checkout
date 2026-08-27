import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { serverEnv } from "@/env/server";
import { CANONICAL_PWRC_MINT, POWERPAY_SERVICE_FEE_BPS, PWRC_TRANSFER_FEE_BPS } from "@/constants/app";
import { decimalToRaw } from "@/lib/format";
import { AppError, errorResponse } from "@/lib/errors";
import { grossPwrcRaw, LAMPORTS_PER_SOL_BIGINT, PWRC_DECIMALS, quoteNetPwrc, readSaleConfig } from "@/lib/solana/sale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const solText = req.nextUrl.searchParams.get("sol") ?? "0.5";
  let lamports: bigint;
  try {
    lamports = decimalToRaw(solText, 9);
  } catch {
    return errorResponse(new AppError("Invalid SOL amount", "BAD_REQUEST", 400));
  }
  if (lamports <= 0n) return errorResponse(new AppError("Invalid SOL amount", "BAD_REQUEST", 400));

  const sol = Number(lamports) / 1_000_000_000;
  const connection = new Connection(serverEnv.solanaRpcUrl, "confirmed");
  try {
    const config = await readSaleConfig(connection);
    if (!config) throw new AppError("Sale config not initialized", "ONCHAIN_UNAVAILABLE", 503);
    const grossRaw = grossPwrcRaw(lamports, config.pwrcPerSolGross);
    const fee = await quoteNetPwrc(connection, config.pwrcMint, grossRaw);
    const scale = 10 ** PWRC_DECIMALS;
    return NextResponse.json({
      source: "onchain",
      enabled: config.enabled,
      rate: Number(config.pwrcPerSolGross),
      grossPwrc: Number(grossRaw) / scale,
      transferFeePwrc: Number(fee.feeRaw) / scale,
      netPwrc: Number(fee.netRaw) / scale,
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
    if (serverEnv.requireOnchainQuote) return errorResponse(error, "On-chain quote unavailable");
    const rate = serverEnv.pwrcPerSolFallback;
    return NextResponse.json({
      source: "preview",
      enabled: false,
      rate,
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
}
