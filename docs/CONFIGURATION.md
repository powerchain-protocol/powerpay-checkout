# PowerPay configuration

PowerPay separates public browser configuration from server-only secrets and operator configuration.

## Environment files

| File | Used by | Purpose |
| --- | --- | --- |
| `.env.local` | root scripts | sale administration and operator tooling |
| `apps/web/.env.local` | Next.js | web runtime, RPC, public configuration, market-data secrets |

Create missing files with:

```bash
pnpm run setup:env
```

The setup script does not overwrite existing local values.

## Public web variables

These values may be exposed to the browser because they use `NEXT_PUBLIC_` prefixes.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | `devnet`, `testnet`, or `mainnet-beta` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | client RPC endpoint |
| `NEXT_PUBLIC_POWERPAY_PROGRAM_ID` | deployed PWRC sale program id |
| `NEXT_PUBLIC_PWRC_MINT` | canonical PWRC Token-2022 mint |
| `NEXT_PUBLIC_APP_URL` | public HTTPS origin encoded in Solana Pay requests |

Canonical PWRC value:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

## Server-only web variables

Never expose these with `NEXT_PUBLIC_` prefixes.

| Variable | Purpose |
| --- | --- |
| `SOLANA_RPC_URL` | server-side Solana RPC |
| `POWERPAY_PROGRAM_ID` | server-side program id |
| `POWERPAY_REQUIRE_ONCHAIN_QUOTE` | fail closed when live sale config cannot be read |
| `PWRC_PER_SOL_FALLBACK` | display/bootstrap fallback only; not settlement authority |
| `PYTH_API_KEY` | Pyth Hermes authentication |
| `PYTH_HERMES_BASE_URL` | Hermes base URL |
| `PYTH_SOL_USD_FEED_ID` | SOL/USD feed id |
| `BIRDEYE_API_KEY` | Birdeye authentication |
| `BIRDEYE_BASE_URL` | Birdeye API base URL |
| `SOL_USD_FALLBACK` | reference-only SOL/USD fallback |
| `MARKET_STALE_AFTER_SECONDS` | market freshness threshold |

## Operator variables

Used by `scripts/sale-admin.mjs` from the root `.env.local`.

| Variable | Purpose |
| --- | --- |
| `ANCHOR_WALLET` | operator wallet path |
| `POWERPAY_TREASURY` | sale SOL treasury |
| `PWRC_MINT` | canonical PWRC mint |
| `PWRC_PER_SOL` | configured gross PWRC-per-SOL rate |
| `PWRC_MIN_SOL` | minimum SOL purchase |
| `PWRC_MAX_SOL` | maximum SOL purchase |
| `PWRC_SALE_ENABLED` | desired sale enabled state |
| `PWRC_FUND_AMOUNT` | inventory funding amount |

## Production baseline

Recommended production values:

```bash
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_APP_URL=https://<public-powerpay-origin>
POWERPAY_REQUIRE_ONCHAIN_QUOTE=true
```

Also:

- use the deployed audited mainnet program id
- use the canonical PWRC mint
- use authenticated Pyth and Birdeye keys
- use production-grade RPC infrastructure
- keep sale administration keys outside the web runtime
- inspect the sale config before enablement

## Configuration invariants

1. The browser may display public program/mint identifiers but must never receive market-data API keys or operator wallet material.
2. `PWRC_PER_SOL_FALLBACK` cannot become executable settlement authority.
3. The on-chain sale config must match the intended treasury, rate, limits, mint, and enabled state.
4. The program rejects a non-canonical PWRC mint and a Token-2022 fee policy other than 200 bps.
5. Solana Pay requires a public HTTPS origin outside local development.
