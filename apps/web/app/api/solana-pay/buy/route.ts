import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildBuyTransaction } from "@/lib/solana/sale";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { clientEnv } from "@/env/client";
import { decimalToRaw } from "@/lib/format";
import { apiEmpty, apiJson, readJsonBody, requestIdFor } from "@/lib/api/http";
import { errorResponse } from "@/lib/errors";

export const runtime = "nodejs";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-request-id",
};

type SolanaPayBody = { account?: unknown };

export async function OPTIONS(req: NextRequest) {
  return apiEmpty(requestIdFor(req), 204, cors);
}

export async function GET(req: NextRequest) {
  const requestId = requestIdFor(req);
  return apiJson(requestId, {
    label: "PowerPay",
    icon: new URL("/assets/brand/powerpay-mark.png", clientEnv.appUrl).toString(),
  }, { headers: cors });
}

export async function POST(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    const network = resolveServerSolanaNetwork(req.nextUrl.searchParams.get("cluster"));
    const expires = Number(req.nextUrl.searchParams.get("expires") ?? "0");
    if (!expires || Date.now() > expires) {
      return apiJson(requestId, { error: "Payment request expired" }, { status: 410, headers: cors });
    }

    const solText = req.nextUrl.searchParams.get("sol") ?? "0";
    const lamports = decimalToRaw(solText, 9);
    if (lamports <= 0n) return apiJson(requestId, { error: "Invalid amount" }, { status: 400, headers: cors });

    const reference = new PublicKey(req.nextUrl.searchParams.get("reference") ?? "");
    const { account } = await readJsonBody<SolanaPayBody>(req);
    const buyer = new PublicKey(String(account ?? ""));
    const built = await buildBuyTransaction(buyer, lamports, network, reference);
    const sol = Number(lamports) / 1_000_000_000;
    const serviceFeeSol = Number(built.serviceFeeLamports) / 1_000_000_000;
    const gross = Number(built.config.pwrcPerSolGross) * sol;

    return apiJson(requestId, {
      transaction: built.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
      message: `Buy ${gross.toLocaleString("en-US", { maximumFractionDigits: 2 })} gross PWRC with ${sol} SOL + ${serviceFeeSol} SOL service fee on ${network.label}`,
    }, { headers: cors });
  } catch (error) {
    return errorResponse(error, "Unable to create Solana Pay transaction", requestId, cors);
  }
}
