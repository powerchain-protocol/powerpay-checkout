# Changelog

PowerPay uses **1.0.0** as its canonical product and repository version. This file records hardening and implementation changes within that canonical release line; it does not imply a semantic-version bump.

## 1.0.0 — canonical hardening refresh

### Checkout / UX

- Refined the right-side checkout card with a compact three-stage progress indicator that preserves the card footprint.
- Added a fixed-height dark-green PowerChain marketing card inside the Scan To Pay panel.
- Improved fee disclosure across the quote, purchase details, order summary, wallet sufficiency checks, mobile checkout bar, and Solana Pay flow.
- Added route-aware public navigation with Next.js client transitions.
- Added modal keyboard focus trapping, Escape-to-close, trigger focus restoration, stronger dialog semantics, and background scroll locking for the public mobile navigation.
- Preserved `aria-current="page"` for current public routes.

### Settlement / fees

- Added `programs/settlements/` for shared, pure Rust settlement mathematics.
- Canonical PowerPay service fee is **200 bps / 2% of base SOL purchase**.
- The service fee is transferred atomically with the base purchase to the configured sale treasury.
- PWRC output remains based on base purchase SOL; it is not inflated by the service fee.
- Canonical PWRC Token-2022 transfer fee remains **200 bps / 2%**, subject to the mint maximum-fee cap.
- Solana network fees remain separate and are estimated/charged by the runtime and signing wallet.
- `PurchaseReceipt` now records service-fee bps, service-fee lamports, and total SOL before network fee.
- `buy_pwrc` binds both reviewed fee policies into the signed instruction.

### Pricing / Solana infrastructure

- Added canonical `constants/price-rates.ts`.
- Hardened `lib/pricing/pyth.ts` and `lib/pricing/birdeye.ts` JSON handling.
- Added `lib/solana/rpc.ts` with an 8-second timeout, 1 MiB response ceiling, safe JSON decoding, latency reporting, and explicit error states.
- Added `lib/solana/solana.ts` to centralize connection/public-key helpers and clarify that RPC transport cannot change settlement authority.
- Added `data/fetch-data.ts` for bounded no-store client fetches.

### API / transport security

- Added a shared 1 MiB API request-body ceiling.
- Added `x-request-id` correlation IDs across API responses.
- Added `Cache-Control: no-store` and `Pragma: no-cache` across normal API responses.
- Added hardened OpenAPI metadata at `/api/openapi`.
- Disabled Swagger authorization persistence and Try It Out by default.
- Added WebSocket guard policy for message size, authentication failures, subscriptions, message rate, explicit errors, and policy/rate close mappings. The current Next.js app does not expose a public WebSocket server.
- Added `X-Robots-Tag: noindex, nofollow, noarchive` globally.

### Regression / release controls

- Added `scripts/check-accessibility.mjs`.
- Added `scripts/check-security.mjs`.
- Added `scripts/check-architecture.mjs`.
- Added `pnpm check:static` and integrated all static guards into `pnpm check` before TypeScript validation.
- Refreshed README, MANIFEST, architecture, fee, API, security, and release documentation.
### Security hardening — dependency remediation

- Removed Mocha/ts-mocha/Chai test dependencies in favor of Node test runner, eliminating vulnerable `serialize-javascript` from the intended lockfile.
- Disabled automatic peer installation and intentionally omitted the browser-unused `react-native` peer, pruning the React Native/Metro/`image-size` subtree.
- Added a reviewed private pure-JS `bigint-buffer` compatibility workspace package and transitive override for CVE-2025-3194; the implementation adds explicit input and width bounds checks and no native build script.
- Converged `uuid` to patched 11.1.1.
- Added dependency-security CI/audit gates and Dependabot configuration.

