# PowerPay 1.0.0 release checklist

PowerPay uses **1.0.0** as the canonical product/repository version. Promotion is ordered **local → devnet → mainnet-beta**. Mainnet must not be enabled merely because devnet passes.

## 1. Runtime reproducibility

```bash
node --version
pnpm --version
pnpm run doctor
pnpm install --frozen-lockfile
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
Transfer fee: 200 bps / 2%
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
- active 2% fee confirmed
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
- Solana Pay endpoint remains on the same cluster
- receipt verification uses the mainnet program
- transaction links have no devnet suffix

Use controlled-value transactions for the first production checks.

## 10. Solana Pay production gate

Confirm:

- public HTTPS origin
- GET metadata returns correct label/icon
- transaction-request POST accepts wallet account only
- generated transaction uses selected mainnet RPC/program
- reference is unique and expiring
- PurchaseReceipt PDA is created
- status endpoint validates exact lamports/reference
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

## 12. Legal / production presentation

Review deployment-specific:

- Terms of Sale
- Disclaimer
- Cookies
- jurisdiction restrictions
- entity/operator identification
- support/contact details

Confirm all UI network language accurately distinguishes Devnet test activity from Mainnet Beta real-asset activity.

## 13. Final release command gate

```bash
pnpm run doctor
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
anchor build
anchor test
pnpm sale:inspect:devnet
pnpm sale:inspect:mainnet
```

A release is blocked if any environment maps the wrong RPC/program pair, if the canonical PWRC mint/fee cannot be verified, or if Mainnet Beta depends on preview-only quote state.
