# PowerPay architecture

PowerPay separates four concerns: **settlement**, **wallet authorization**, **market reference data**, and **presentation**. Only the on-chain sale program is settlement authority.

## System overview

```text
Browser / mobile wallet
        │
        ├─ Wallet Standard connection
        ├─ browser-wallet transaction signing
        └─ Solana Pay transaction request
        │
        ▼
Next.js application
        ├─ quote API
        ├─ transaction builder
        ├─ Solana Pay request/status APIs
        └─ SOL/USD reference API
        │
        ▼
PWRC sale program (Anchor 1.1.2)
        ├─ SaleConfig PDA
        ├─ Token-2022 sale vault
        └─ PurchaseReceipt PDA per order/reference
```

## Settlement truth

The `SaleConfig` PDA is authoritative for:

- configured SOL treasury
- canonical PWRC Token-2022 mint
- gross PWRC-per-SOL rate
- minimum / maximum purchase size
- enabled state
- sale-vault ownership boundary

Canonical PWRC:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

The active PWRC transfer-fee policy must be 200 bps / 2% and the mint must use 9 decimals.

## Market-reference boundary

```text
Pyth Hermes ───────┐
                   ├─► /api/market/sol-usd ─► MarketPriceContext ─► UI
Birdeye ───────────┘             │
                                 ├─ source
                                 ├─ freshness
                                 └─ divergence bps

SaleConfig PDA ───────────────────────────────────────► executable PWRC/SOL rate
```

Pyth is the preferred observation when fresh. Birdeye provides independent corroboration/fallback. A configured fallback may be displayed when both are unavailable, but it must be visibly marked reference-only.

No market provider may mutate the sale rate.

## Buy path

Both browser-wallet and Solana Pay paths converge on the same transaction builder.

```text
quote
  ↓
review gross / fee / net / rate
  ↓
transaction builder
  ↓
wallet signature
  ↓
buy_pwrc(...)
  ├─ SOL → treasury
  ├─ gross PWRC → buyer ATA
  └─ PurchaseReceipt PDA
```

The buyer remains the transaction fee payer. The server builds unsigned transactions and does not hold the buyer's signing key.

## Solana Pay path

A Scan To Pay request contains a unique reference. The scanning wallet requests an unsigned transaction from PowerPay and signs it locally. After settlement, status verification resolves the program-owned `PurchaseReceipt` PDA derived from that reference.

This prevents a transaction from being considered settled solely because a reference key appears somewhere in its account list.

## Token-2022 fee handling

`GET /api/quote` reads the canonical mint's active transfer-fee configuration and reports:

- gross PWRC
- fee basis points
- exact expected token fee
- maximum-fee cap
- net PWRC

The on-chain program repeats the fee-policy validation and executes an exact checked-fee transfer. A fee change between quote review and execution fails closed.

The Solana runtime network fee is separate from the 2% PWRC fee.

## Web composition

```text
RootLayout
  └─ AppProviders
      └─ SolanaProvider
          ├─ ConnectionProvider
          ├─ WalletProvider (Wallet Standard discovery)
          └─ WalletConnectModalProvider

/checkout
  └─ MarketPriceProvider
      └─ checkout state + responsive mobile action surface
```

`components/mobile.tsx` owns phone-specific sticky checkout actions. It reuses the same quote and transaction logic as desktop rather than implementing a second settlement path.

## Error and degradation model

- `lib/errors.ts` defines typed application/API errors.
- `app/error.tsx` handles recoverable route rendering failures.
- `app/loading.tsx` provides the App Router loading state.
- Market-data failure degrades display/reference health only.
- On-chain quote failure can fail closed with `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true`.
- Wallet rejection never becomes an application-level settlement success.

## Client/server boundaries

Browser-safe configuration lives under `env/client.ts`. Secrets and server-only settings live under `env/server.ts` / server routes.

Never expose:

- Pyth API keys
- Birdeye API keys
- operator wallet material
- sale administration authority secrets

## Legal routes

- `/terms-of-sale`
- `/cookies`
- `/disclaimer`

These are deployment templates and require jurisdiction-specific review before production use.

## Production architecture gates

1. audited program binary and known upgrade authority
2. canonical PWRC mint and 200 bps active fee
3. correct program id / cluster
4. funded vault and correct treasury
5. private/production RPC strategy
6. authenticated market-data providers
7. public HTTPS Solana Pay origin
8. fail-closed on-chain quote mode
9. staging verification of browser-wallet and QR purchase paths
10. settlement receipt verification and operational monitoring
