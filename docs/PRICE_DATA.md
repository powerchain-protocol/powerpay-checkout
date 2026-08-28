# PowerPay market-data boundary

PowerPay uses SOL/USD observations to improve checkout transparency without allowing an off-chain market provider to control token settlement.

## Providers

### Pyth

```text
Role:              primary SOL/USD reference
Authentication:    PYTH_API_KEY (server-only)
Default Hermes:    https://pyth.dourolabs.app/hermes
Endpoint:          /v2/updates/price/latest
SOL/USD feed id:   ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d
```

PowerPay consumes parsed price information, confidence, exponent, and publish time.

### Birdeye

```text
Role:              corroboration / fallback
Authentication:    BIRDEYE_API_KEY (server-only)
Default base:       https://public-api.birdeye.so
Endpoint:           /defi/price
Chain header:       x-chain: solana
Wrapped SOL:        So11111111111111111111111111111111111111112
```

## Selection policy

`GET /api/market/sol-usd` follows this order:

1. fresh Pyth observation
2. fresh Birdeye observation
3. available but stale upstream observation, marked degraded
4. configured `SOL_USD_FALLBACK`, marked reference-only

When both providers are available, PowerPay calculates provider divergence in basis points. Divergence and freshness are exposed to the UI rather than silently normalized away.

## Freshness

`MARKET_STALE_AFTER_SECONDS` defines the application freshness threshold. A stale observation may still be useful for context, but it must not be presented as equivalent to a fresh provider update.

## Settlement invariant

Market data never determines the executable PWRC sale rate.

The on-chain sale config remains authoritative for:

- gross PWRC per SOL
- treasury
- canonical PWRC mint
- min/max purchase limits
- enabled state
- inventory boundary

Market observations are limited to:

- USD reference display
- provider/source identity
- freshness
- confidence/divergence context
- reconciliation and diagnostics

## Failure behavior

A market-data outage should degrade market reference UI without making an unavailable price feed equivalent to settlement failure. Separately, production can require a live on-chain sale quote with:

```bash
POWERPAY_REQUIRE_ONCHAIN_QUOTE=true
```

This preserves a strict distinction between **market-reference availability** and **settlement-state availability**.
