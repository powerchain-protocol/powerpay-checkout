import { NextRequest } from "next/server";
import { createMerchantClient } from "@solana/pay";
import { Keypair } from "@solana/web3.js";
import { clientEnv } from "@/env/client";
import { decimalToRaw } from "@/lib/format";
import { readSaleConfig, serviceFeeLamports, totalBeforeNetworkFeeLamports } from "@/lib/solana/sale";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { errorResponse } from "@/lib/errors";
import { apiJson, requestIdFor } from "@/lib/api/http";
import { createSolanaConnection } from "@/lib/solana/solana";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    const network = resolveServerSolanaNetwork(req.nextUrl.searchParams.get("cluster"));
    const sol = req.nextUrl.searchParams.get("sol") ?? "0.5";
    const lamports = decimalToRaw(sol, 9);
    if (lamports <= 0n) return apiJson(requestId, { error: "Invalid amount" }, { status: 400 });

    const config = await readSaleConfig(createSolanaConnection(network.rpcUrl), network.programPublicKey);
    if (!config || !config.enabled) {
      return apiJson(requestId, { error: `PWRC sale is not live on ${network.label}` }, { status: 503 });
    }
    if (lamports < config.minLamports || lamports > config.maxLamports) {
      return apiJson(requestId, { error: "Amount outside on-chain sale limits" }, { status: 400 });
    }

    const expires = Date.now() + 5 * 60_000;
    const reference = Keypair.generate().publicKey;
    const endpoint = new URL("/api/solana-pay/buy", clientEnv.appUrl);
    endpoint.searchParams.set("cluster", network.cluster);
    endpoint.searchParams.set("sol", String(sol));
    endpoint.searchParams.set("expires", String(expires));
    endpoint.searchParams.set("reference", reference.toBase58());

    const merchant = createMerchantClient({ rpcUrl: network.rpcUrl });
    const url = merchant.pay.encodeURL({ link: endpoint });
    return apiJson(requestId, {
      cluster: network.cluster,
      url: url.toString(),
      expiresAt: expires,
      reference: reference.toBase58(),
      purchaseLamports: lamports.toString(),
      serviceFeeLamports: serviceFeeLamports(lamports).toString(),
      totalBeforeNetworkFeeLamports: totalBeforeNetworkFeeLamports(lamports).toString(),
      lamports: lamports.toString(),
    });
  } catch (error) {
    return errorResponse(error, "Unable to create Solana Pay request", requestId);
  }
}
