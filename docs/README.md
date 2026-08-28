# PowerPay documentation

PowerPay uses **1.0.0** as the canonical product/repository version.

Repository-level references:

- [`../CHANGELOG.md`](../CHANGELOG.md) — canonical 1.0.0 hardening history
- [`../MANIFEST.md`](../MANIFEST.md) — source/policy manifest

## Core

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — execution boundaries and application composition
- [`NETWORKS.md`](NETWORKS.md) — Devnet/Mainnet Beta network model
- [`CONFIGURATION.md`](CONFIGURATION.md) — environment and operator configuration
- [`PROGRAM_SECURITY.md`](PROGRAM_SECURITY.md) — Anchor settlement invariants
- [`SECURITY.md`](SECURITY.md) — API, RPC, WebSocket, browser and regression controls
- [`API.md`](API.md) — API response/body conventions and OpenAPI behavior
- [`FEES.md`](FEES.md) — 2% PowerPay SOL service fee + 2% PWRC Token-2022 fee + separate Solana network fee

## Integrations

- [`WALLET_CONNECT.md`](WALLET_CONNECT.md) — Wallet Standard connection UX
- [`PRICE_DATA.md`](PRICE_DATA.md) — Pyth/Birdeye SOL/USD references

## Build and release

- [`DEPENDENCY_POLICY.md`](DEPENDENCY_POLICY.md) — pnpm build-script, peer-installation, and override policy
- [`DEPENDENCY_SECURITY.md`](DEPENDENCY_SECURITY.md) — Dependabot remediation and lockfile verification
- [`ANCHOR_V1_MIGRATION.md`](ANCHOR_V1_MIGRATION.md) — Anchor 1.x migration notes
- [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) — Devnet → Mainnet Beta release gates

## Canonical identifiers

```text
PowerPay version: 1.0.0
PWRC mint: PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
PWRC decimals: 9
PowerPay service fee: 200 bps / 2% of base SOL purchase
PWRC transfer fee: 200 bps / 2%
Solana network fee: separate runtime fee
Runtime networks: devnet, mainnet-beta
```

## Runtime health

PowerPay exposes `GET /api/system/health?cluster=devnet|mainnet-beta` for non-secret runtime readiness checks. See [Architecture](ARCHITECTURE.md) and [Release Checklist](RELEASE_CHECKLIST.md).

