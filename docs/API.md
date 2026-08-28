# PowerPay API conventions

PowerPay 1.0.0 uses Next.js App Router route handlers under `apps/web/app/api/`.

## Shared response contract

Every normal API response is emitted through the hardened helpers in `lib/api/http.ts` or `lib/errors.ts` and carries:

```text
Cache-Control: no-store, max-age=0
Pragma: no-cache
x-request-id: <correlation-id>
```

Callers may supply an `x-request-id` containing only the supported safe character set; invalid or absent IDs are replaced with a server-generated UUID.

## Request-body policy

POST bodies use `readJsonBody()` and are limited to **1 MiB** both by declared `Content-Length` and by the actual UTF-8 body size. Empty or malformed JSON produces an explicit 4xx response.

## Key routes

| Route | Purpose |
| --- | --- |
| `GET /api/quote` | live SaleConfig quote + fee disclosure |
| `GET /api/market/sol-usd` | Pyth/Birdeye reference SOL/USD state |
| `POST /api/transactions/buy` | build quote-bound connected-wallet purchase |
| `GET /api/solana-pay/url` | create expiring Solana Pay request URL |
| `POST /api/solana-pay/buy` | build Solana Pay transaction request |
| `GET /api/solana-pay/status` | verify program-owned purchase receipt |
| `GET /api/system/health` | network/program/mint/vault readiness |
| `GET /api/openapi` | OpenAPI 3.1 metadata |

## Fee fields

Quote/purchase responses distinguish:

- base purchase SOL
- 2% PowerPay service fee in SOL
- total SOL before network fee
- gross PWRC
- exact Token-2022 PWRC fee
- net PWRC
- Solana network fee as a wallet/runtime estimate

Pyth/Birdeye reference pricing never becomes an executable token-rate authority.

## Network selection

The API accepts only `devnet` and `mainnet-beta`. A request cannot provide a raw RPC URL or program id. Server configuration resolves the requested network to reviewed infrastructure.

## OpenAPI / Swagger policy

The OpenAPI route publishes security-oriented UI defaults with authorization persistence disabled. A documentation renderer must not override that to retain secrets by default.
