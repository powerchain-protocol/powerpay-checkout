# PowerPay configuration

PowerPay `1.0.0` separates browser-safe configuration, server-only execution configuration and operator tooling. It supports `devnet` and `mainnet-beta` as explicit network mappings.

PowerPay defaults to Devnet. Mainnet Beta support is present but the browser and server gates default to `false` unless explicitly enabled in the deployment environment.

## Environment files

| File | Consumer | Purpose |
| --- | --- | --- |
| `.env.local` | root scripts | operator network, sale administration, program/RPC mappings |
| `apps/web/.env.local` | Next.js | browser/server runtime, RPC/program mappings, market-data secrets |

Create missing local files with:

```bash
pnpm run setup:env
```

Existing local files are not overwritten.

## Browser network variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DEFAULT_SOLANA_CLUSTER` | startup cluster: `devnet` or `mainnet-beta` |
| `NEXT_PUBLIC_ENABLE_MAINNET_BETA` | exposes/disables the Mainnet Beta selector |
| `NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET` | browser devnet RPC |
| `NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET_BETA` | browser mainnet RPC |
| `NEXT_PUBLIC_POWERPAY_PROGRAM_ID_DEVNET` | devnet sale program id |
| `NEXT_PUBLIC_POWERPAY_PROGRAM_ID_MAINNET_BETA` | mainnet sale program id |
| `NEXT_PUBLIC_PWRC_MINT` | canonical PWRC Token-2022 mint |
| `NEXT_PUBLIC_APP_URL` | public origin for Solana Pay transaction requests |

Canonical PWRC:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

`NEXT_PUBLIC_PWRC_MINT` is validated against this value.

## Server execution variables

| Variable | Purpose |
| --- | --- |
| `SOLANA_RPC_URL_DEVNET` | server devnet RPC |
| `SOLANA_RPC_URL_MAINNET_BETA` | server mainnet RPC |
| `POWERPAY_PROGRAM_ID_DEVNET` | server devnet program id |
| `POWERPAY_PROGRAM_ID_MAINNET_BETA` | server mainnet program id |
| `POWERPAY_ENABLE_MAINNET_BETA` | server-side Mainnet Beta execution kill switch |
| `POWERPAY_REQUIRE_ONCHAIN_QUOTE` | require live on-chain sale config |
| `PWRC_PER_SOL_FALLBACK` | reference/bootstrap preview only |

Requests may select a cluster, but cannot supply an RPC or program id. `resolveServerSolanaNetwork()` maps the requested cluster to these reviewed variables.

Mainnet quote handling is fail-closed even if `POWERPAY_REQUIRE_ONCHAIN_QUOTE=false`.

## Market-data variables

Never expose these values with `NEXT_PUBLIC_` prefixes.

| Variable | Purpose |
| --- | --- |
| `PYTH_API_KEY` | Pyth Hermes authentication |
| `PYTH_HERMES_BASE_URL` | Hermes endpoint |
| `PYTH_SOL_USD_FEED_ID` | SOL/USD price feed |
| `BIRDEYE_API_KEY` | Birdeye authentication |
| `BIRDEYE_BASE_URL` | Birdeye endpoint |
| `SOL_USD_FALLBACK` | reference-only fallback |
| `MARKET_STALE_AFTER_SECONDS` | freshness threshold |

Market data does not control the sale-program rate.

## Operator variables

| Variable | Purpose |
| --- | --- |
| `POWERPAY_CLUSTER` | default operator cluster |
| `SOLANA_CLUSTER` | compatibility operator cluster |
| `ANCHOR_WALLET` | operator keypair path |
| `POWERPAY_TREASURY` | SOL treasury |
| `PWRC_MINT` | canonical PWRC mint |
| `PWRC_PER_SOL` | gross PWRC per SOL |
| `PWRC_MIN_SOL` | minimum purchase |
| `PWRC_MAX_SOL` | maximum purchase |
| `PWRC_SALE_ENABLED` | desired enabled state |
| `PWRC_FUND_AMOUNT` | inventory amount for funding command |

The admin script accepts an explicit network override:

```bash
node --env-file=.env.local scripts/sale-admin.mjs inspect --cluster devnet
node --env-file=.env.local scripts/sale-admin.mjs inspect --cluster mainnet-beta
```

Prefer the package scripts:

```bash
pnpm sale:inspect:devnet
pnpm sale:inspect:mainnet
```

## Production baseline

```bash
NEXT_PUBLIC_DEFAULT_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_ENABLE_MAINNET_BETA=true
POWERPAY_ENABLE_MAINNET_BETA=true
NEXT_PUBLIC_APP_URL=https://<public-powerpay-origin>
POWERPAY_REQUIRE_ONCHAIN_QUOTE=true
```

Also configure:

- audited mainnet program id
- production-grade client/server RPC endpoints
- canonical PWRC mint
- authenticated Pyth/Birdeye access
- reviewed treasury/rate/limits
- operator key material outside the web runtime

## Compatibility variables

The code retains limited compatibility with older single-network variables such as `NEXT_PUBLIC_SOLANA_CLUSTER`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `SOLANA_RPC_URL`, `NEXT_PUBLIC_POWERPAY_PROGRAM_ID` and `POWERPAY_PROGRAM_ID`.

They are fallback-only. New deployments should use the network-specific variables above so devnet and mainnet configuration cannot be confused.

## Invariants

1. Canonical application version is `1.0.0`.
2. Runtime clusters are limited to `devnet` and `mainnet-beta`.
3. Browser callers cannot choose arbitrary RPC/program endpoints.
4. Mainnet cannot execute from preview-only quote state.
5. PWRC mint remains canonical and Token-2022 fee policy remains 200 bps.
6. Market data never becomes settlement authority.
7. Operator secrets and market API keys never enter browser-visible variables.
