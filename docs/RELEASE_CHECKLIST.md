# PowerPay 1.0.0 release checklist

PowerPay uses **1.0.0** as the canonical product/repository version. Promotion is ordered **local → devnet → mainnet-beta**. Mainnet must not be enabled merely because devnet passes.

## 1. Runtime reproducibility

```bash
node --version
pnpm --version
pnpm run doctor
pnpm install --frozen-lockfile
pnpm check:static
pnpm typecheck
pnpm build
```

Required:

- Node `>=20.18`
- pnpm `11.24.0`
- TypeScript `5.9.3`
- package versions = `1.0.0`
- no unreviewed dependency build scripts
- committed lockfile

Dependency-security verification:

```bash
pnpm run check:dependency-security
pnpm why image-size
pnpm why serialize-javascript
pnpm why bigint-buffer
pnpm why uuid
pnpm audit --audit-level=moderate
```

Required graph state:

- no `image-size` path in the browser workspace
- no `serialize-javascript` path
- `bigint-buffer` resolves to the reviewed private workspace compatibility package
- no vulnerable `uuid` resolution; canonical convergence is `11.1.1`
- CI treats a missing lockfile as a release failure

## 2. Anchor / Solana toolchain

```bash
anchor --version
solana --version
anchor build
anchor test
```

Expected policy:

- Anchor `1.1.2`
- Solana CLI `3.1.10`
- Rust program crate `1.0.0`
- canonical program id synced

## 3. Canonical PWRC invariants

Verify on every cluster before enabling its sale:

```text
Mint: PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Program: Token-2022
Decimals: 9
PWRC transfer fee: 200 bps / 2%
PowerPay service fee: 200 bps / 2% of base SOL purchase
```

Also verify the active epoch fee, maximum-fee cap and expected mint extensions.

## 4. Devnet deployment

Deploy and inspect explicitly:

```bash
anchor deploy --provider.cluster devnet
pnpm sale:inspect:devnet
```

Then initialize/fund only if required:

```bash
pnpm sale:init:devnet
pnpm sale:fund:devnet
pnpm sale:inspect:devnet
```

Enable only after the expected treasury, rate, limits and inventory are confirmed.

## 5. Devnet application validation

Use the UI network selector and verify:

- Devnet shows `TEST`
- switching to Devnet changes the wallet/RPC context
- wallet connect works with Wallet Standard wallets
- Buy PWRC live quote resolves from the devnet sale config
- browser-wallet purchase settles
- Solana Pay QR request settles
- purchase receipt status verifies
- replaying a used reference fails
- SOL send works
- PWRC send uses exact Token-2022 fee handling
- receive QR/link works
- transaction links open Solscan with `?cluster=devnet`
- switching network clears prior signature/reference state
- wallet SOL/PWRC balances refresh after connect and confirmed transactions
- direct wallet checkout blocks a known-insufficient SOL balance before signature
- Send balance review and Max behavior are correct for SOL and PWRC
- `/api/system/health?cluster=devnet` reports the expected RPC slot, executable program, sale state, vault inventory, Token-2022 ownership and 200 bps fee policy

## 6. Mainnet configuration review

Before any mainnet deploy/enable action, review:

```bash
NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET_BETA=...
SOLANA_RPC_URL_MAINNET_BETA=...
NEXT_PUBLIC_POWERPAY_PROGRAM_ID_MAINNET_BETA=...
POWERPAY_PROGRAM_ID_MAINNET_BETA=...
NEXT_PUBLIC_APP_URL=https://...
POWERPAY_REQUIRE_ONCHAIN_QUOTE=true
POWERPAY_ENABLE_MAINNET_BETA=true
```

Production RPC endpoints should be reviewed/private where appropriate rather than relying on the public bootstrap endpoint.

## 7. Mainnet program deployment

Anchor names the production cluster `mainnet`:

```bash
anchor deploy --provider.cluster mainnet
pnpm sale:inspect:mainnet
```

Verify program data and upgrade authority independently on Mainnet Beta.

Do not infer deployment success from the configured address alone.

## 8. Mainnet sale activation

Before enabling:

- canonical PWRC mint exists and matches required extensions
- active PWRC 2% Token-2022 fee confirmed
- deployed program enforces the canonical 2% PowerPay SOL service fee
- 0.50 SOL test quote produces 0.01 SOL service fee and 0.51 SOL total before network fee
- treasury verified out of band
- sale rate reviewed
- min/max purchase limits reviewed
- sale vault inventory verified
- operator wallet/authority verified
- mainnet program id verified against deployment
- on-chain quote endpoint succeeds

Mainnet purchase APIs must fail closed when these checks cannot be satisfied.

## 9. Mainnet UI validation

Verify:

- selector shows `Mainnet Beta` + `LIVE`
- switching from Devnet requires explicit confirmation
- active wallet disconnects during switch
- UI warns that real SOL/PWRC are used
- wallet reconnect happens deliberately
- quote reports `cluster=mainnet-beta`
- quote discloses base SOL, 2% service fee, total-before-network fee, gross PWRC, exact PWRC token fee and net PWRC
- Solana Pay endpoint remains on the same cluster
- receipt verification uses the mainnet program
- transaction links have no devnet suffix
- `/api/system/health?cluster=mainnet-beta` passes against the exact production program/mint configuration
- health output does not expose RPC credentials or provider API keys

Use controlled-value transactions for the first production checks.

## 10. Solana Pay production gate

Confirm:

- public HTTPS origin
- GET metadata returns correct label/icon
- transaction-request POST accepts wallet account only
- generated transaction uses selected mainnet RPC/program
- reference is unique and expiring
- PurchaseReceipt PDA is created
- status endpoint validates base lamports, 200 bps service fee, exact service-fee lamports, total-before-network fee and reference
- repeated reference cannot settle again

## 11. Market-data gate

Verify Pyth + Birdeye independently:

- Pyth authentication works
- Birdeye authentication works
- timestamps are fresh
- source identity is displayed
- divergence state works
- stale/fallback state is clearly labeled
- market price does not alter executable PWRC/SOL rate

## 12. API / RPC / accessibility security gate

Run:

```bash
pnpm check:static
```

Confirm:

- every public POST route uses the 1 MiB JSON-body boundary
- API responses include `x-request-id` and `Cache-Control: no-store`
- RPC failure is bounded by the 8-second timeout and surfaces an explicit error state
- UI makes clear that changing the read RPC cannot change settlement authority
- `/api/openapi` has Swagger authorization persistence disabled
- public mobile navigation traps focus, closes on Escape, restores trigger focus and locks background scroll
- internal public navigation uses Next.js transitions and preserves `aria-current`
- `X-Robots-Tag: noindex, nofollow, noarchive` is present
- accessibility regression script reports no dead `href="#"`, missing alt, unsafe `_blank`, or focus-outline regressions
- any deployed WebSocket gateway applies `lib/websocket/guard.ts`; do not mark this gate complete merely because the policy module exists

## 13. Legal / production presentation

Review deployment-specific:

- Terms of Sale
- Disclaimer
- Cookies
- jurisdiction restrictions
- entity/operator identification
- support/contact details

Confirm all UI network language accurately distinguishes Devnet test activity from Mainnet Beta real-asset activity.

## 14. Final release command gate

```bash
pnpm run doctor
pnpm install --frozen-lockfile
pnpm check:static
pnpm typecheck
pnpm build

# Confirm security headers and runtime health route in the built app.
# A committed pnpm-lock.yaml is required before using --frozen-lockfile in CI.

anchor build
anchor test
pnpm sale:inspect:devnet
pnpm sale:inspect:mainnet
```

A release is blocked if any environment maps the wrong RPC/program pair, if the canonical PWRC mint/fee cannot be verified, or if Mainnet Beta depends on preview-only quote state.
