import { AppError } from "@/lib/errors";

export const DEFAULT_CLIENT_FETCH_TIMEOUT_MS = 8_000;
export const MAX_JSON_RESPONSE_BYTES = 1 * 1024 * 1024;

type FetchDataOptions = RequestInit & {
  timeoutMs?: number;
};

function parseJsonSafely<T>(text: string): T {
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new AppError("Received malformed JSON from the server", "UPSTREAM_UNAVAILABLE", 502, cause);
  }
}

export async function fetchData<T>(input: RequestInfo | URL, options: FetchDataOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_CLIENT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(input, {
      ...options,
      cache: options.cache ?? "no-store",
      headers: {
        Accept: "application/json",
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_JSON_RESPONSE_BYTES) {
      throw new AppError("Server response exceeded the safe JSON limit", "UPSTREAM_UNAVAILABLE", 502);
    }
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_JSON_RESPONSE_BYTES) {
      throw new AppError("Server response exceeded the safe JSON limit", "UPSTREAM_UNAVAILABLE", 502);
    }
    const data = parseJsonSafely<T & { error?: string }>(text);
    if (!response.ok) {
      throw new AppError(data.error || `Request failed with ${response.status}`, "UPSTREAM_UNAVAILABLE", response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError("Request timed out", "UPSTREAM_UNAVAILABLE", 504, error);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
