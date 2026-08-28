import { NextResponse } from "next/server";

export type ErrorCode =
  | "BAD_REQUEST"
  | "CONFIGURATION_ERROR"
  | "UPSTREAM_UNAVAILABLE"
  | "ONCHAIN_UNAVAILABLE"
  | "TRANSACTION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "UNKNOWN_ERROR";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly status = 500,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function asAppError(error: unknown, fallbackMessage = "Unexpected error") {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(error.message || fallbackMessage, "UNKNOWN_ERROR", 500, error);
  return new AppError(fallbackMessage, "UNKNOWN_ERROR", 500, error);
}

export function errorResponse(error: unknown, fallbackMessage?: string, requestId?: string, extraHeaders?: HeadersInit) {
  const appError = asAppError(error, fallbackMessage);
  const headers = new Headers(extraHeaders);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  if (requestId) headers.set("x-request-id", requestId);
  return NextResponse.json(
    { error: appError.message, code: appError.code, requestId: requestId || undefined },
    { status: appError.status, headers },
  );
}
