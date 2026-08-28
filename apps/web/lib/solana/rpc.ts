import { AppError } from "@/lib/errors";
import { fetchWithTimeout } from "@/utils/util";

export const RPC_REQUEST_TIMEOUT_MS = 8_000;
const MAX_RPC_RESPONSE_BYTES = 1 * 1024 * 1024;

type RpcEnvelope<T> = {
  jsonrpc?: string;
  id?: string | number;
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
};

export type RpcHealth = {
  ok: boolean;
  slot: number | null;
  latencyMs: number;
  error: string | null;
};

export async function rpcJson<T>(rpcUrl: string, method: string, params: unknown[] = []): Promise<T> {
  const response = await fetchWithTimeout(
    rpcUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify({ jsonrpc: "2.0", id: "powerpay", method, params }),
    },
    RPC_REQUEST_TIMEOUT_MS,
  );
  if (!response.ok) throw new AppError(`Solana RPC returned HTTP ${response.status}`, "UPSTREAM_UNAVAILABLE", 503);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_RPC_RESPONSE_BYTES) throw new AppError("Solana RPC response exceeded 1 MiB", "UPSTREAM_UNAVAILABLE", 503);
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RPC_RESPONSE_BYTES) throw new AppError("Solana RPC response exceeded 1 MiB", "UPSTREAM_UNAVAILABLE", 503);

  let payload: RpcEnvelope<T>;
  try {
    payload = JSON.parse(text) as RpcEnvelope<T>;
  } catch (cause) {
    throw new AppError("Solana RPC returned malformed JSON", "UPSTREAM_UNAVAILABLE", 503, cause);
  }
  if (payload.error) {
    throw new AppError(payload.error.message || `Solana RPC error ${payload.error.code ?? "unknown"}`, "UPSTREAM_UNAVAILABLE", 503);
  }
  if (payload.result === undefined) throw new AppError("Solana RPC response is missing a result", "UPSTREAM_UNAVAILABLE", 503);
  return payload.result;
}

export async function checkRpc(rpcUrl: string): Promise<RpcHealth> {
  const started = Date.now();
  try {
    const slot = await rpcJson<number>(rpcUrl, "getSlot", [{ commitment: "confirmed" }]);
    return { ok: Number.isFinite(slot), slot, latencyMs: Date.now() - started, error: null };
  } catch (error) {
    return {
      ok: false,
      slot: null,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "RPC health check failed",
    };
  }
}
