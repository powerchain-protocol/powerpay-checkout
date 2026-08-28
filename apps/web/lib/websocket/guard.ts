import { AppError } from "@/lib/errors";

export const WS_MAX_MESSAGE_BYTES = 64 * 1024;
export const WS_MAX_FAILED_AUTH_ATTEMPTS = 3;
export const WS_MAX_SUBSCRIPTIONS_PER_CONNECTION = 32;
export const WS_MESSAGES_PER_MINUTE = 120;
export const WS_POLICY_CLOSE_CODE = 1008;
export const WS_RATE_LIMIT_CLOSE_CODE = 1013;

export type WebSocketGuardState = {
  authenticated: boolean;
  failedAuthAttempts: number;
  subscriptions: number;
  messageCount: number;
  windowStartedAt: number;
};

export function createWebSocketGuardState(): WebSocketGuardState {
  return { authenticated: false, failedAuthAttempts: 0, subscriptions: 0, messageCount: 0, windowStartedAt: Date.now() };
}

export function assertWebSocketMessage(state: WebSocketGuardState, byteLength: number, now = Date.now()) {
  if (byteLength > WS_MAX_MESSAGE_BYTES) throw new AppError("WebSocket message exceeds policy limit", "RATE_LIMITED", 429);
  if (now - state.windowStartedAt >= 60_000) {
    state.windowStartedAt = now;
    state.messageCount = 0;
  }
  state.messageCount += 1;
  if (state.messageCount > WS_MESSAGES_PER_MINUTE) throw new AppError("WebSocket message rate limit exceeded", "RATE_LIMITED", 429);
}

export function recordFailedWebSocketAuth(state: WebSocketGuardState) {
  state.failedAuthAttempts += 1;
  if (state.failedAuthAttempts >= WS_MAX_FAILED_AUTH_ATTEMPTS) {
    throw new AppError("WebSocket authentication policy failed", "UNAUTHORIZED", 401);
  }
}

export function reserveWebSocketSubscription(state: WebSocketGuardState) {
  if (!state.authenticated) throw new AppError("WebSocket authentication required", "UNAUTHORIZED", 401);
  if (state.subscriptions >= WS_MAX_SUBSCRIPTIONS_PER_CONNECTION) {
    throw new AppError("WebSocket subscription limit exceeded", "RATE_LIMITED", 429);
  }
  state.subscriptions += 1;
}
export type WebSocketPolicyClose = {
  code: typeof WS_POLICY_CLOSE_CODE | typeof WS_RATE_LIMIT_CLOSE_CODE;
  reason: string;
};

export function webSocketPolicyClose(error: unknown): WebSocketPolicyClose {
  if (error instanceof AppError && error.code === "RATE_LIMITED") {
    return { code: WS_RATE_LIMIT_CLOSE_CODE, reason: error.message.slice(0, 123) };
  }
  if (error instanceof AppError) {
    return { code: WS_POLICY_CLOSE_CODE, reason: error.message.slice(0, 123) };
  }
  return { code: WS_POLICY_CLOSE_CODE, reason: "WebSocket policy violation" };
}

