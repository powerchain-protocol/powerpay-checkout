# PowerPay market-data boundary

PowerPay uses live SOL/USD data to improve checkout transparency without allowing an off-chain API to control settlement.

## Providers

### Pyth

- Server-only authentication: `PYTH_API_KEY`
- Default Hermes base: `https://pyth.dourolabs.app/hermes`
- Endpoint: `/v2/updates/price/latest`
- SOL/USD feed id: `ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d`
- PowerPay consumes parsed price, confidence, exponent and publish time.

### Birdeye

- Server-only authentication: `BIRDEYE_API_KEY`
- Base: `https://public-api.birdeye.so`
- Endpoint: `/defi/price`
- Solana wrapped-SOL address: `So11111111111111111111111111111111111111112`
- Required header: `x-chain: solana`

## Selection policy

1. Fresh Pyth observation.
2. Fresh Birdeye observation.
3. Stale upstream observation, visibly degraded.
4. Configured `SOL_USD_FALLBACK`, visibly marked reference-only.

If Pyth and Birdeye are both available, PowerPay computes their percentage difference and exposes it as basis points. Divergence above the configured UI tolerance degrades the market-data health indicator.

## Settlement invariant

Market providers **never** determine the executable PWRC sale rate. The on-chain sale config PDA remains authoritative for `pwrcPerSolGross`, treasury, mint, limits and enabled state. Market data is used only for USD reference values, freshness, provider comparison, and reconciliation context.
