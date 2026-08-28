import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export const MAX_API_REQUEST_BODY_BYTES = 1 * 1024 * 1024;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function requestIdFor(req: NextRequest) {
  const incoming = req.headers.get("x-request-id")?.trim() ?? "";
  return REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
}

export function apiHeaders(requestId: string, extra?: HeadersInit) {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("x-request-id", requestId);
  return headers;
}

export function apiJson<T>(requestId: string, data: T, init: ResponseInit = {}) {
  return NextResponse.json(data, {
    ...init,
    headers: apiHeaders(requestId, init.headers),
  });
}

export function apiEmpty(requestId: string, status = 204, headers?: HeadersInit) {
  return new NextResponse(null, { status, headers: apiHeaders(requestId, headers) });
}

export async function readJsonBody<T>(req: NextRequest): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_API_REQUEST_BODY_BYTES) {
    throw new AppError("Request body exceeds the 1 MiB limit", "PAYLOAD_TOO_LARGE", 413);
  }

  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_API_REQUEST_BODY_BYTES) {
    throw new AppError("Request body exceeds the 1 MiB limit", "PAYLOAD_TOO_LARGE", 413);
  }
  if (!text.trim()) throw new AppError("JSON request body is required", "BAD_REQUEST", 400);

  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new AppError("Malformed JSON request body", "BAD_REQUEST", 400, cause);
  }
}
