# PowerPay documentation

This directory contains the technical and operational contract for PowerPay. The root [`README.md`](../README.md) is intentionally concise; implementation details live here.

## Architecture and protocol

| Document | Purpose |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System boundaries, settlement authority, transaction paths, and runtime composition. |
| [`PROGRAM_SECURITY.md`](PROGRAM_SECURITY.md) | On-chain invariants, quote binding, receipt PDAs, canonical mint, and failure behavior. |
| [`FEES.md`](FEES.md) | PWRC Token-2022 fee, Solana network fee, and PowerPay service-fee policy. |
| [`ANCHOR_V1_MIGRATION.md`](ANCHOR_V1_MIGRATION.md) | Current Anchor v1 toolchain and legacy 0.32.x deployment migration gate. |

## Application and integrations

| Document | Purpose |
| --- | --- |
| [`WALLET_CONNECT.md`](WALLET_CONNECT.md) | Wallet Standard discovery, custom modal behavior, mobile UX, accessibility, and security. |
| [`PRICE_DATA.md`](PRICE_DATA.md) | Pyth/Birdeye SOL/USD reference data, freshness, divergence, and settlement isolation. |
| [`CONFIGURATION.md`](CONFIGURATION.md) | Environment variables, client/server boundaries, and production configuration. |

## Operations and release

| Document | Purpose |
| --- | --- |
| [`DEPENDENCY_POLICY.md`](DEPENDENCY_POLICY.md) | pnpm 11 fail-closed dependency-build policy and approved native scripts. |
| [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) | Build, program, configuration, staging, and mainnet release gates. |
| [`../BUILD_NOTES.md`](../BUILD_NOTES.md) | Current repository validation notes and local commands. |

## Canonical protocol values

```text
PWRC mint:       PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
PWRC decimals:   9
PWRC token fee:  200 bps / 2% (Token-2022; maximum-fee cap still applies)
PowerPay fee:    0%
Solana fee:      separate; paid by transaction fee payer
Anchor:          1.1.2
Solana CLI:      3.1.10
```

If a document conflicts with deployed on-chain state, **on-chain state and the audited program binary are authoritative**. Documentation should then be corrected before the next release.
