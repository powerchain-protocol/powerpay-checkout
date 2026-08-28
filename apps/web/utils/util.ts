export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function percentageDifference(a: number, b: number) {
  const midpoint = (Math.abs(a) + Math.abs(b)) / 2;
  return midpoint === 0 ? 0 : Math.abs(a - b) / midpoint;
}

export function formatAge(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "unknown";
  if (seconds < 1) return "now";
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}


export async function readJsonResponse<T>(response: Response, maxBytes = 1 * 1024 * 1024): Promise<T> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error("JSON response exceeds the safe size limit");
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new Error("JSON response exceeds the safe size limit");
  }
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new Error("Malformed JSON response", { cause });
  }
}
