# PowerPay security controls

This document describes application-level controls around the canonical **PowerPay 1.0.0** checkout. On-chain settlement invariants are documented separately in [`PROGRAM_SECURITY.md`](PROGRAM_SECURITY.md).

## Request boundary

All normal Next.js API handlers use `lib/api/http.ts`.

| Control | Policy |
| --- | --- |
| Request body | **1 MiB maximum** |
| Correlation | `x-request-id`, sanitized or generated server-side |
| Response cache | `Cache-Control: no-store, max-age=0` + `Pragma: no-cache` |
| JSON | explicit malformed-body errors; no blind `request.json()` in public POST routes |
| Errors | typed `AppError` responses with stable status codes |

The limit protects application parsing resources; infrastructure-level limits should remain at least as strict.

## Solana RPC boundary

RPC calls are constrained by reviewed environment mappings and an **8-second timeout**. Responses are capped at 1 MiB and decoded defensively. Runtime health exposes status/latency without returning private RPC URLs or provider credentials.

A selected read RPC cannot change settlement authority. The program id, SaleConfig, canonical PWRC mint, quote-bound instruction parameters, and Solana runtime govern execution.

## API caching and privacy

Transactional/readiness API responses are non-cacheable by default. The web application also sends:

```text
X-Robots-Tag: noindex, nofollow, noarchive
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

The robots directive is a privacy/discovery signal, not an authorization mechanism. Production ingress still requires normal access controls where a route is non-public.

## Navigation/dialog accessibility

The public mobile navigation implements:

- `role="dialog"` + `aria-modal="true"`
- keyboard focus trapping
- Escape-to-close
- focus restoration to the opening control
- background scroll locking
- route-aware `aria-current="page"`
- Next.js `Link` transitions for internal navigation

The wallet modal follows the same keyboard/focus model for transaction connection UX.

## Swagger/OpenAPI

`/api/openapi` publishes the supported API shape. Any Swagger UI consuming the document must use the supplied policy with:

```text
persistAuthorization = false
tryItOutEnabled = false
```

This prevents a documentation surface from retaining bearer credentials by default.

## WebSocket adapters

There is no public WebSocket server in the current Next.js app. Any future gateway must apply `lib/websocket/guard.ts` at the actual connection boundary:

- 64 KiB max message
- 3 failed-auth attempts
- 32 subscriptions
- 120 messages/minute
- close code 1008 for policy failures
- close code 1013 for rate/overload failures

## Static regression gates

`pnpm check:static` runs:

- `scripts/doctor.mjs`
- `scripts/check-accessibility.mjs`
- `scripts/check-security.mjs`
- `scripts/check-architecture.mjs`

The accessibility check rejects dead `href="#"` links, image elements without alt text, unsafe `_blank` links, and focus-outline regressions. The security/architecture checks enforce the API boundary, headers, fee policy, WebSocket constants, Next.js navigation, and required source boundaries.

`pnpm check` adds the TypeScript typecheck after the static gates.
