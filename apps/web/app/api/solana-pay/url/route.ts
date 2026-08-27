import { NextRequest, NextResponse } from "next/server";
import { createMerchantClient } from "@solana/pay";
import { Connection, Keypair } from "@solana/web3.js";
import { appUrl, rpcUrl } from "@/lib/env";
import { decimalToRaw } from "@/lib/format";
import { readSaleConfig } from "@/lib/solana/sale";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sol = req.nextUrl.searchParams.get("sol") ?? "0.5";
  let lamports: bigint;
  try { lamports = decimalToRaw(sol, 9); if (lamports <= 0n) throw new Error(); } catch { return NextResponse.json({ error: "Invalid amount" }, { status: 400 }); }
  const config = await readSaleConfig(new Connection(rpcUrl, "confirmed"));
  if (!config || !config.enabled) return NextResponse.json({ error: "PWRC sale is not live" }, { status: 503 });
  if (lamports < config.minLamports || lamports > config.maxLamports) return NextResponse.json({ error: "Amount outside on-chain sale limits" }, { status: 400 });
  const expires = Date.now() + 5 * 60_000;
  const reference = Keypair.generate().publicKey;
  const endpoint = new URL("/api/solana-pay/buy", appUrl);
  endpoint.searchParams.set("sol", String(sol));
  endpoint.searchParams.set("expires", String(expires));
  endpoint.searchParams.set("reference", reference.toBase58());
  const merchant = createMerchantClient({ rpcUrl });
  const url = merchant.pay.encodeURL({ link: endpoint });
  return NextResponse.json({ url: url.toString(), expiresAt: expires, reference: reference.toBase58(), lamports: lamports.toString() });
}
