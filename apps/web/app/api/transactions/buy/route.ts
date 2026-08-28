import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildBuyTransaction } from "@/lib/solana/sale";
import { resolveServerSolanaNetwork } from "@/lib/solana/network";
import { decimalToRaw } from "@/lib/format";
import { errorResponse } from "@/lib/errors";
import { apiJson, readJsonBody, requestIdFor } from "@/lib/api/http";

export const runtime = "nodejs";

type BuyBody = { account?: unknown; sol?: unknown; cluster?: unknown };

export async function POST(req: NextRequest) {
  const requestId = requestIdFor(req);
  try {
    const body = await readJsonBody<BuyBody>(req);
    const network = resolveServerSolanaNetwork(String(body.cluster ?? ""));
    const buyer = new PublicKey(String(body.account ?? ""));
    const sol = String(body.sol ?? "");
    const lamports = decimalToRaw(sol, 9);
    if (lamports <= 0n) throw new Error("Invalid SOL amount");

    const built = await buildBuyTransaction(buyer, lamports, network);
    return apiJson(requestId, {
      cluster: network.cluster,
      reference: built.reference.toBase58(),
      purchaseLamports: lamports.toString(),
      serviceFeeLamports: built.serviceFeeLamports.toString(),
      totalBeforeNetworkFeeLamports: built.totalBeforeNetworkFeeLamports.toString(),
      transaction: built.tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    });
  } catch (error) {
    return errorResponse(error, "Unable to build purchase", requestId);
  }
}
