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

The active PWRC transfer-fee policy must be 200 bps / 2%; the mint must use 9 decimals. The PowerPay application service fee is independently fixed at 200 bps / 2% of the base SOL purchase and is enforced by the settlement program.

## Buy path

```text
cluster selection
  ↓
cluster-specific quote
  ↓
review base SOL / 2% service fee / gross PWRC / token fee / net / rate / network
  ↓
cluster-specific transaction builder
  ↓
wallet signature
  ↓
buy_pwrc(...)
  ├─ base SOL + 2% service fee → treasury
  ├─ gross PWRC → buyer ATA (2% Token-2022 fee applies)
  └─ PurchaseReceipt PDA → fee + settlement evidence
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
          ├─ SystemHealthProvider
          └─ SolanaProvider
              ├─ ConnectionProvider
              ├─ WalletProvider
              └─ WalletBalanceProvider
                  └─ WalletConnectModalProvider
```

The header contains the network selector. The wallet modal repeats the network choice with explicit Devnet/Test and Mainnet/Real-assets labels.

`components/mobile.tsx` owns the phone sticky checkout action and exposes the selected network in the mobile summary. `AppShell` provides correct header/main/footer semantics and skip navigation for the Buy, Send and Receive surfaces.

## Wallet balance boundary

`WalletBalanceProvider` reads the connected wallet's SOL and canonical PWRC balances from the currently selected cluster. It refreshes on wallet/network changes, on visibility return, on a bounded interval and after confirmed Buy/Send transactions.

Balance data is a UX guard, not settlement truth. Checkout disables direct wallet purchase only when the known SOL balance is definitely insufficient for the requested amount; the signing wallet remains authoritative for the final network fee and rent requirements. SOL Max on the Send surface intentionally leaves a small fee buffer.

## Runtime health

`GET /api/system/health?cluster=...` validates a bounded set of public/runtime conditions:

- cluster RPC responds within the 8-second application timeout and returns a confirmed slot
- RPC response is valid JSON and below the 1 MiB safety ceiling
- configured PowerPay program account exists and is executable
- SaleConfig PDA is initialized
- canonical PWRC mint is owned by Token-2022
- SaleConfig references the canonical mint
- active PWRC transfer-fee policy remains 200 bps
- PowerPay service-fee policy remains 200 bps
- sale enabled/paused state is reported separately

The endpoint does not return private RPC URLs or API keys. The header status control can refresh the check manually and polls only while the document is visible.


## API and transport boundaries

All normal App Router API responses pass through the shared HTTP boundary, which adds `x-request-id`, `Cache-Control: no-store`, and `Pragma: no-cache`. Public POST bodies are capped at 1 MiB and decoded explicitly so malformed JSON and oversized payloads fail with typed errors.

`data/fetch-data.ts` applies equivalent bounded client-side fetch behavior for checkout and status surfaces. `lib/solana/rpc.ts` adds the separate 8-second RPC timeout, 1 MiB response ceiling, defensive JSON parsing, latency reporting and explicit error states.

`/api/openapi` publishes OpenAPI metadata with Swagger authorization persistence disabled by default.

There is no public WebSocket server in the current Next.js application. `lib/websocket/guard.ts` is the mandatory guard contract for a future gateway: message-size/rate limits, failed-auth limits, subscription caps and policy-close mappings.

## Navigation and accessibility boundary

Public desktop/mobile navigation uses Next.js `Link` transitions and route-aware `aria-current`. The mobile navigation dialog traps keyboard focus, closes on Escape, restores focus to its trigger and locks background scroll while modal. Wallet connection uses the same non-custodial dialog discipline.

Static regression scripts enforce accessible links/images/focus treatment, the hardened API contract, architecture boundaries and privacy headers before typecheck/build gates.

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
- known insufficient wallet balance → client action blocked before wallet prompt
- health endpoint degraded → visible runtime warning; transaction APIs still validate independently

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
