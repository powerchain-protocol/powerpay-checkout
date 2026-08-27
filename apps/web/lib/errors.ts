import { NextResponse } from "next/server";

export type ErrorCode =
  | "BAD_REQUEST"
  | "CONFIGURATION_ERROR"
  | "UPSTREAM_UNAVAILABLE"
  | "ONCHAIN_UNAVAILABLE"
  | "TRANSACTION_FAILED"
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

export function errorResponse(error: unknown, fallbackMessage?: string) {
  const appError = asAppError(error, fallbackMessage);
  return NextResponse.json(
    { error: appError.message, code: appError.code },
    { status: appError.status },
  );
}
