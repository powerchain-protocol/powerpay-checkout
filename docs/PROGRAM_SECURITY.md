# PowerPay program security invariants

Canonical PowerPay release: **1.0.0**.

The PWRC sale program fails closed whenever asset identity, quote terms, fee policy, network mapping, or settlement evidence differs from the buyer-reviewed state.

## Toolchain boundary

```text
Anchor CLI:               1.1.2
anchor-lang:              =1.1.2
anchor-spl:               =1.1.2
Anchor TypeScript client: @anchor-lang/core@1.1.2
Solana CLI:               3.1.10
```

The legacy `@coral-xyz/anchor` TypeScript package is not part of the canonical workspace.

## Canonical asset

```text
PWRC mint:        PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals:         9
Token program:    Token-2022
PWRC transfer fee 200 bps / 2%
```

Execution fails if the mint differs, uses the wrong token program, has the wrong decimals, lacks `TransferFeeConfig`, or exposes an active fee policy other than 200 bps.

## Fee semantics

A successful checkout has three independently disclosed cost layers:

1. **PowerPay service fee — 2% / 200 bps in SOL.** It is calculated from the base purchase amount, rounded up at lamport precision, and transferred atomically with the base purchase to the configured sale treasury.
2. **PWRC Token-2022 transfer fee — 2% / 200 bps.** The active maximum-fee cap still applies. Exact fee and net PWRC are calculated from the mint state at execution time.
3. **Solana network fee.** It is charged separately by the runtime to the transaction fee payer and is not transferred to the PowerPay treasury.

PWRC output is derived from the **base purchase lamports**, not from the service-fee-inclusive SOL total. This prevents an application fee from changing the advertised PWRC/SOL exchange rate.

The service-fee math lives in `programs/settlements/` and is consumed by the Anchor program. The browser uses the matching canonical constants for disclosure and quote review, but the deployed program remains authoritative at settlement.

## Network binding

PowerPay accepts only `devnet` and `mainnet-beta` at the application boundary. Browser callers select a cluster identifier; server code resolves that identifier to reviewed RPC/program mappings. A request cannot inject an executable RPC URL or program id.

The selected RPC is a **read/transport boundary**, not settlement authority. Settlement authority remains the deployed program, SaleConfig, canonical PWRC mint, signed quote parameters, and Solana runtime.

RPC readiness checks use an 8-second timeout, response-size limits, safe JSON parsing, explicit latency/error state, and no-store semantics.

## Atomic settlement

`buy_pwrc` executes the economic legs in one Solana transaction:

```text
buyer SOL
  ├─ base purchase ──────────► configured treasury
  ├─ 2% service fee ─────────► configured treasury
  └─ Solana network fee ─────► runtime (separate)

sale vault gross PWRC ───────► buyer Token-2022 ATA
PurchaseReceipt PDA ─────────► immutable settlement evidence
```

If any required instruction fails, Solana rolls back the transaction.

## Quote binding

The purchase instruction binds execution to the buyer-reviewed terms:

- base SOL amount in lamports
- expected gross PWRC-per-SOL rate
- minimum acceptable net PWRC
- expected PWRC Token-2022 fee basis points = 200
- expected PowerPay service fee basis points = 200

The program rejects settlement when the sale rate changes, either fee policy differs, inventory is insufficient, arithmetic overflows, or computed net PWRC falls below the signed minimum.

## Replay-resistant receipt

Each checkout reference derives one receipt PDA:

```text
PDA("purchase", reference)
```

The account is created with `init`, so the same reference cannot settle twice. The receipt records:

- buyer and reference
- base purchase lamports
- service-fee bps and lamports
- total SOL before network fee
- gross PWRC
- Token-2022 fee bps and exact fee
- net PWRC
- confirmation slot and PDA bump

The Solana Pay status route verifies this program-owned receipt rather than accepting an arbitrary transaction merely because it contains a reference account.

## API boundary

Public API routes use the shared `lib/api/http.ts` boundary:

- 1 MiB default request-body ceiling
- request correlation through `x-request-id`
- generated request IDs when an incoming value is absent/invalid
- `Cache-Control: no-store` and `Pragma: no-cache`
- safe JSON decoding for request bodies
- typed application errors without leaking secrets

OpenAPI metadata is available at `/api/openapi`; Swagger authorization persistence is explicitly disabled in its published UI policy.

## WebSocket policy boundary

The current Next.js application does not expose a public WebSocket server. `lib/websocket/guard.ts` defines the mandatory policy for any adapter/gateway that adds one:

- 64 KiB per-message ceiling
- maximum three failed authentication attempts
- maximum 32 subscriptions per connection
- maximum 120 messages per minute
- explicit rate-limit errors
- policy close (`1008`) and overload/rate close (`1013`) mapping

A future transport must call these guards at the connection boundary; their presence alone does not secure an unrelated WebSocket implementation.

## Browser/navigation boundary

Public mobile navigation is a modal dialog with focus trapping, Escape-to-close, focus restoration, background scroll locking, and route-aware `aria-current`. Internal routes use Next.js client transitions rather than forced full-page reloads.

Global browser headers include `X-Robots-Tag: noindex, nofollow, noarchive`, `X-Content-Type-Options: nosniff`, a restrictive referrer policy, and a Permissions Policy.

## Off-chain market-data boundary

Pyth and Birdeye are reference data only. They may inform USD display, freshness, divergence, and reconciliation, but cannot change the executable PWRC rate or bypass program checks.

## Upgrade safety

When the program ABI changes:

1. rebuild the Anchor program and regenerate its IDL/types
2. deploy the matching web transaction builder and Solana Pay transaction route atomically with the program upgrade
3. run Rust + Anchor + TypeScript/static regression checks
4. test first on Devnet
5. verify service-fee math, Token-2022 exact fee behavior, and replay rejection
6. upgrade only with the intended program upgrade authority
7. inspect program id, executable state, SaleConfig, treasury, mint, fee policy, and vault inventory before enablement

The current `buy_pwrc` ABI and `PurchaseReceipt` layout include the 2% service-fee fields. An older client/status decoder must not be mixed with this binary.
