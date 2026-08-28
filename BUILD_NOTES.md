# PowerPay build notes

Canonical repository/application/program version: **1.0.0**.

## Current implementation

PowerPay supports `devnet` and `mainnet-beta` as explicit execution contexts. The network selector changes the browser connection, server RPC/program mapping, health state, explorer links, transaction construction and Solana Pay flow; it never changes only a display label.

Current hardening includes:

- canonical PWRC Token-2022 mint pinning
- 2% PWRC Token-2022 transfer-fee enforcement
- 2% PowerPay SOL service fee, quote-bound and enforced on-chain
- separate Solana runtime/network fee disclosure
- `programs/settlements/` shared pure-Rust settlement math
- Pyth + Birdeye SOL/USD reference data
- 8-second bounded RPC checks with safe JSON and explicit latency/error state
- cluster-aware SOL/PWRC wallet balances
- `/api/system/health` runtime readiness
- 1 MiB API request-body ceiling
- `x-request-id` correlation and no-store API responses
- OpenAPI metadata with Swagger authorization persistence disabled
- WebSocket policy guard for future gateway adapters
- route-aware Next.js public navigation with modal focus/scroll semantics
- global `X-Robots-Tag: noindex, nofollow, noarchive`
- static accessibility, security and architecture regression gates

## Fee execution contract

```text
base purchase SOL
  + 2% PowerPay service fee → configured sale treasury
  + Solana runtime fee      → separate, paid by transaction fee payer

gross PWRC from base purchase
  - exact 2% Token-2022 fee
  = net PWRC to buyer
```

The current `buy_pwrc` ABI and `PurchaseReceipt` layout include service-fee fields. Upgrade the deployed program and transaction/status clients as one release unit; do not mix an older client with the current program binary.

## Local verification

Recommended order:

```bash
pnpm run doctor
pnpm install
pnpm run check:static
pnpm typecheck
pnpm build
anchor build
anchor test
```

If the repository does not yet contain `pnpm-lock.yaml`, the first dependency install must create it. Commit the lockfile before CI/release reproducibility checks, then use:

```bash
pnpm install --frozen-lockfile
```

## pnpm native build policy

`pnpm-workspace.yaml` records explicit reviewed build policy for:

- `bigint-buffer`
- `bufferutil`
- `utf-8-validate`

If the lockfile introduces another package with a build script, pnpm should fail closed until that dependency is reviewed.

## Environment bootstrap

```bash
pnpm run setup:env
```

The script creates missing root/web `.env.local` files from templates without overwriting existing local configuration.

## Network-specific program inspection

```bash
pnpm sale:inspect:devnet
pnpm sale:inspect:mainnet
```

The operator script resolves the matching reviewed RPC/program mapping and rejects unsupported cluster names.

## Mainnet safety

Mainnet Beta:

- uses real assets
- requires explicit UI confirmation when switching from Devnet
- disconnects an active wallet on switch
- fails closed when the live sale quote cannot be verified
- must use reviewed mainnet program/RPC configuration
- must validate the deployed program's 2% service-fee ABI and the canonical PWRC 2% Token-2022 policy before sale enablement

## Toolchain

```text
PowerPay       1.0.0
Anchor         1.1.2
Solana CLI     3.1.10
TypeScript     5.9.3
pnpm           11.24.0
```

The project uses `@anchor-lang/core`; legacy `@coral-xyz/anchor` is not part of the canonical TypeScript workspace.
