import { NextRequest } from "next/server";
import { APP_VERSION, CANONICAL_PWRC_MINT } from "@/constants/app";
import { POWERPAY_SERVICE_FEE_BPS, PWRC_TRANSFER_FEE_BPS } from "@/constants/price-rates";
import { apiJson, requestIdFor } from "@/lib/api/http";
import { SWAGGER_UI_SECURITY_OPTIONS } from "@/lib/api/swagger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  return apiJson(requestId, {
    openapi: "3.1.0",
    info: {
      title: "PowerPay API",
      version: APP_VERSION,
      description: "Read-only quote/health endpoints and wallet-signed Solana transaction request endpoints for PowerPay.",
    },
    servers: [{ url: "/", description: "Current PowerPay deployment" }],
    paths: {
      "/api/quote": { get: { summary: "Get the canonical PWRC purchase quote" } },
      "/api/market/sol-usd": { get: { summary: "Get reference SOL/USD data from Pyth/Birdeye" } },
      "/api/system/health": { get: { summary: "Check selected Solana RPC, program, sale, and PWRC policy health" } },
      "/api/transactions/buy": { post: { summary: "Build a wallet-signed PWRC purchase transaction" } },
      "/api/solana-pay/url": { get: { summary: "Create a Solana Pay transaction-request URL" } },
      "/api/solana-pay/buy": { post: { summary: "Return a Solana Pay transaction request" } },
      "/api/solana-pay/status": { get: { summary: "Verify immutable purchase receipt settlement" } },
      "/api/solana-pay/receive": { get: { summary: "Create a SOL receive request" } },
    },
    components: { securitySchemes: {} },
    security: [],
    "x-powerpay": {
      canonicalPwrcMint: CANONICAL_PWRC_MINT,
      serviceFeeBasisPoints: POWERPAY_SERVICE_FEE_BPS,
      pwrcTransferFeeBasisPoints: PWRC_TRANSFER_FEE_BPS,
      swaggerUi: SWAGGER_UI_SECURITY_OPTIONS,
    },
  });
}
