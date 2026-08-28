# PowerPay architecture

PowerPay `1.0.0` separates **network selection**, **settlement**, **wallet authorization**, **market reference data**, and **presentation**. Only the selected cluster's on-chain sale program is settlement authority.

## System overview

```text
                         ┌──────────────┐
                         │ Network mode │
                         │ devnet /     │
                         │ mainnet-beta │
                         └──────┬───────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
      browser RPC/program                  server RPC/program
              │                                   │
              ▼                                   ▼
Wallet Standard / Solana Pay           Next.js transaction APIs
              │                                   │
              └─────────────────┬─────────────────┘
                                ▼
                       PWRC sale program
                          ├─ SaleConfig PDA
                          ├─ Token-2022 vault
                          └─ PurchaseReceipt PDA
```

## Network control plane

Browser network state lives in:

```text
context/solana-network-context.tsx
```

Canonical network metadata lives in:

```text
constants/network.ts
```

Server selection lives in:

```text
lib/solana/network.ts
```

A request may select only `devnet` or `mainnet-beta`. The server then resolves its RPC and program id from environment mappings. It never executes against a client-provided endpoint/program id.

Changing network remounts the Solana connection provider and disconnects an already-connected wallet to prevent ambiguous signing context.

## Settlement truth

`SaleConfig` is authoritative for:

- SOL treasury
- canonical PWRC Token-2022 mint
- gross PWRC-per-SOL rate
- minimum/maximum purchase
- enabled state
- sale-vault ownership boundary

Canonical PWRC:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

The active PWRC transfer-fee policy must be 200 bps / 2%; the mint must use 9 decimals.

## Buy path

```text
cluster selection
  ↓
cluster-specific quote
  ↓
review gross / fee / net / rate / network
  ↓
cluster-specific transaction builder
  ↓
wallet signature
  ↓
buy_pwrc(...)
  ├─ SOL → treasury
  ├─ gross PWRC → buyer ATA
  └─ PurchaseReceipt PDA
```

Browser-wallet and Solana Pay purchases converge on the same transaction builder.

## Solana Pay path

The generated transaction-request endpoint embeds:

- selected cluster
- SOL amount
- expiry
- unique reference

The scanning wallet POSTs its account to that endpoint and receives an unsigned transaction for the selected cluster.

After settlement, status verification derives the cluster-specific program-owned `PurchaseReceipt` PDA. A transaction is not considered settled simply because a reference account appears in an unrelated transaction.

## Mainnet fail-closed behavior

Devnet may show a clearly labeled preview when the program is not initialized and preview mode is allowed.

Mainnet Beta does not expose a purchasable fallback state. If program id, RPC, sale config, mint policy or live quote cannot be verified, purchase construction fails.

## Market-reference boundary

```text
Pyth Hermes ──────┐
                  ├─► /api/market/sol-usd ─► MarketPriceContext ─► display
Birdeye ──────────┘

selected SaleConfig PDA ───────────────────────────────────────► executable PWRC/SOL rate
```

Pyth is preferred when fresh. Birdeye is an independent corroboration/fallback source. Market data never mutates the sale-program rate.

## UI composition

```text
RootLayout
  └─ AppProviders
      └─ SolanaNetworkProvider
          └─ SolanaProvider
              ├─ ConnectionProvider
              ├─ WalletProvider
              └─ WalletConnectModalProvider
```

The header contains the network selector. The wallet modal repeats the network choice with explicit Devnet/Test and Mainnet/Real-assets labels.

`components/mobile.tsx` owns the phone sticky checkout action and exposes the selected network in the mobile summary.

## Send / receive

- SOL send uses the currently selected `ConnectionProvider`.
- PWRC send uses the canonical Token-2022 mint and current cluster connection.
- Receive Solana Pay links include the selected cluster server routing.
- Explorer links use devnet query parameters only on devnet; Mainnet Beta uses canonical mainnet links.

## Error and degradation model

- unsupported cluster → `BAD_REQUEST`
- missing cluster RPC/program mapping → `CONFIGURATION_ERROR`
- unreadable on-chain sale → `ONCHAIN_UNAVAILABLE`
- market-provider failure → display degradation only
- wallet rejection → never a settlement success
- cluster change → stale checkout signature/reference state cleared

## Production gates

1. canonical PowerPay version `1.0.0`
2. devnet validation complete
3. mainnet program audited and deployed
4. canonical PWRC mint/fee verified on mainnet
5. exact mainnet treasury/rate/limits verified
6. production RPCs configured
7. Solana Pay HTTPS origin configured
8. on-chain quote fail-closed enabled
9. browser-wallet + QR path tested with controlled mainnet value
10. receipt verification and reconciliation monitored
