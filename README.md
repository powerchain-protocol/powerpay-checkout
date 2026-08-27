# PowerPay

PowerPay is the Solana-native checkout for buying **PWRC** with **SOL**. It ships a light-theme desktop and mobile checkout, Solana Pay **Scan To Pay**, Wallet Standard connection modal, direct browser-wallet purchases, SOL/PWRC send and receive, Web3 Icons, independent SOL/USD market references, legal surfaces, and an Anchor 0.32.1 Token-2022 sale program. The application is pinned to canonical PWRC mint `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`.

## Application architecture

```text
PowerPay Web (Next.js 16 / React 19)
  ├─ /checkout          Buy PWRC with SOL
  ├─ /send              Send SOL or PWRC
  ├─ /receive           Receive by address / Solana Pay QR
  ├─ /terms-of-sale     Transaction terms
  ├─ /cookies           Cookie/storage notice
  ├─ /disclaimer        Digital-asset + market-data disclaimer
  └─ /api
      ├─ quote                    Authoritative sale config + Token-2022 fee
      ├─ market/sol-usd           Pyth primary + Birdeye corroboration/fallback
      ├─ transactions/buy         Build unsigned atomic buy transaction
      └─ solana-pay/*             Transaction-request / receive URLs
              ↓
Wallet Standard / Solana Pay
              ↓
programs/pwrc-sale
  buyer SOL → treasury
  sale vault gross PWRC → buyer ATA
  Token-2022 fee: 2% / 200 bps (subject to on-chain max-fee cap)
  Solana network fee: separate, paid by transaction fee payer
  (one atomic transaction)
```

The checkout never lets an off-chain market feed set the executable sale rate. **The sale config PDA is authoritative.** Pyth and Birdeye are used only for SOL/USD display, market-data freshness, independent divergence checks, and reconciliation context.

## Frontend structure

```text
apps/web/
├─ app/
│  ├─ api/market/sol-usd/route.ts
│  ├─ checkout/page.tsx
│  ├─ cookies/page.tsx
│  ├─ disclaimer/page.tsx
│  ├─ terms-of-sale/page.tsx
│  ├─ error.tsx
│  └─ loading.tsx
├─ components/
│  ├─ mobile.tsx
│  ├─ checkout-app.tsx
│  ├─ solana-provider.tsx
│  └─ legal/
├─ constants/
├─ context/
├─ env/
├─ lib/
│  ├─ errors.ts
│  └─ pricing/
└─ utils/
   ├─ util.ts
   └─ helpers.tsx
```

`components/mobile.tsx` contains the phone-specific sticky checkout action surface instead of overloading the desktop layout. The same quote and transaction functions are shared across breakpoints.

## Market data

PowerPay uses two server-side providers:

1. **Pyth Hermes** — primary SOL/USD observation.
2. **Birdeye** — independent corroboration and fallback.

`GET /api/market/sol-usd` returns the selected observation plus all available provider observations, freshness, and Pyth/Birdeye divergence in basis points. If live data is unavailable, `SOL_USD_FALLBACK` can be displayed, but it is marked stale/reference-only.

Required production secrets remain server-side:

```bash
PYTH_API_KEY=
BIRDEYE_API_KEY=
```

Do not prefix either key with `NEXT_PUBLIC_`. Pyth Hermes requires authenticated access in the current production API. Birdeye uses the `X-API-KEY` header. Both requests are made by the Next.js server route, never directly by the browser.

## Install

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm run doctor
pnpm run setup:env
pnpm install
pnpm dev
```

The root `.env.local` is used by the sale administration script; `apps/web/.env.local` is loaded by Next.js. `@solana/pay` v1 requires Node 20+. The app uses Wallet Standard discovery (`wallets={[]}`), so compatible wallets can be discovered without bundling legacy wallet adapters.

## Program

Install Solana/Anchor tooling, then:

```bash
anchor build
anchor keys sync
anchor build
anchor deploy --provider.cluster devnet
anchor keys list
```

Update `POWERPAY_PROGRAM_ID` / `NEXT_PUBLIC_POWERPAY_PROGRAM_ID` with the deployed id. Initialize the sale with the canonical Token-2022 PWRC mint, treasury, gross PWRC-per-SOL rate, and min/max purchase limits. The program rejects any mint other than `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc` and requires the active transfer-fee policy to be exactly 200 bps (2%). Fund the sale config PDA's associated Token-2022 account before enabling purchases.

```bash
pnpm run setup:env
pnpm sale:init
pnpm sale:fund
# verify inventory, treasury, mint, limits and program id
pnpm sale:update
pnpm sale:inspect
```

### Core sale invariant

`buy_pwrc(lamports)` performs both legs in one instruction:

1. buyer SOL → configured treasury
2. configured sale vault PWRC → buyer Token-2022 ATA

If either leg fails, the Solana transaction fails. The program also enforces enabled state, purchase limits, inventory, checked arithmetic, and the on-chain sale rate.

## Solana Pay Scan To Pay

`/api/solana-pay/url?sol=0.5` generates a Solana Pay transaction-request URL. A scanning wallet calls `/api/solana-pay/buy` and receives the same unsigned atomic sale transaction used by the browser-wallet path. The QR request expires after five minutes. Status verification checks the configured program, QR reference, and expected lamport amount before marking the checkout complete.

For production, `NEXT_PUBLIC_APP_URL` must be a public HTTPS origin accessible by mobile wallets.

## Security and release gates

- No private key is shipped to the browser or required by the checkout server.
- Buyer is always the fee payer and signer.
- Treasury, PWRC mint, inventory and sale rate are read from the sale config account.
- The canonical PWRC Token-2022 mint is enforced in the program, checkout, send flow, quote service, and admin tooling.
- Buy execution is quote-bound: expected rate, minimum net PWRC and the 200 bps fee policy are signed into the instruction.
- Each checkout reference creates a single-use program-owned purchase receipt PDA for replay-resistant settlement verification.
- PWRC's active Token-2022 transfer fee must be 200 bps (2%); exact expected fees are used for checked-fee transfers.
- Solana network fees remain separate and are paid by the transaction fee payer; PowerPay currently adds no separate checkout service fee.
- Pyth/Birdeye are display and reconciliation inputs only; they cannot mutate the sale rate.
- Market-data API keys remain server-side.
- Set `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true` for fail-closed production sale quotes.
- Use a private production RPC and public HTTPS app URL.
- Audit the Anchor program and legal/compliance configuration before mainnet sale enablement.
- Exercise browser-wallet and Scan To Pay paths on devnet/staging before mainnet.

## Brand reference

The provided PowerPay mark is under `apps/web/public/assets/brand/`. The approved light checkout reference is retained under `docs/reference/`.


## pnpm 11 dependency-build policy

PowerPay keeps pnpm 11's fail-closed dependency-build policy. The reviewed lockfile explicitly approves build scripts for `bigint-buffer`, `bufferutil`, and `utf-8-validate`. Any newly introduced dependency build script remains unreviewed and causes install to fail until it is explicitly approved or denied in `pnpm-workspace.yaml`.

Do not use `dangerouslyAllowAllBuilds`. Review new build-script dependencies individually.

For environment setup, use `pnpm run setup:env` instead of manual `cp` commands. It resolves paths from the repository root and never overwrites an existing `.env.local`.


## v1.6.0 frontend and wallet UX

PowerPay v1.6.0 removes two unnecessary sources of frontend risk and improves the wallet connection surface.

- Removed `experimental.optimizePackageImports` from `next.config.ts`. Next.js already optimizes `lucide-react` by default, while PowerPay imports Web3 Icons from `@web3icons/react/dynamic`; keeping the experimental flag added a production warning without a clear benefit.
- Added `.next/dev/types/**/*.ts` to the committed TypeScript include list so local development and generated route types agree with Next.js 16's generated configuration.
- Replaced the stock `@solana/wallet-adapter-react-ui` modal with a PowerPay-owned Wallet Standard modal.
- Removed the `@solana/wallet-adapter-react-ui` dependency and stylesheet from the web bundle.
- Added installed-wallet discovery, connecting / connected states, explicit wallet switching, canonical PWRC mint context and Solana cluster context.
- Added wallet-owned icons with Web3 Icons fallbacks for Phantom, Solflare and Backpack.
- Added modal focus containment, Escape handling, focus restoration, scroll locking, reduced-motion handling and mobile bottom-sheet behavior.
- Added non-custodial safety copy: connecting a wallet does not approve a transaction and PowerPay never asks for recovery phrases or private keys.

See `docs/WALLET_CONNECT.md` for the connection-state and accessibility contract.

## v1.2.0 UI/UX hardening

The checkout is intentionally optimized around one conversion: **buy PWRC with SOL**.

- Added a compact sale/market status rail so users can distinguish live on-chain settlement state from display-only market data before acting.
- Reworked the purchase hierarchy around `You pay → You receive → authoritative sale rate → payment method`.
- Added quick SOL amount controls, explicit min/max sale limits, inline validation, quote refresh state, and clearer net/gross Token-2022 fee presentation.
- Made Solana Pay and connected-wallet checkout real selectable interaction states instead of decorative payment rows.
- Improved mobile behavior: same-device users get a sticky `Open Solana Pay` or wallet action instead of being forced to scan their own screen.
- Improved Scan To Pay empty, expired, loading, and ready states; added direct mobile wallet opening and clearer order protection messaging.
- Added a connected-wallet account menu with copy address, change wallet, and explicit disconnect actions instead of disconnecting on the first click.
- Added active Buy / Send / Receive navigation plus visible Solana cluster status.
- Refactored Send and Receive into clearer transaction workflows with asset selection, address validation, paste/copy helpers, transfer review, and stronger wallet-custody messaging.
- Added keyboard focus states, reduced-motion support, responsive breakpoints, 44px+ interactive targets, and improved wallet-modal theming.

The visual system remains intentionally light, industrial, calm, and finance-oriented. Green communicates verified/operational state; market data never uses styling that suggests it is the executable PWRC price.

See `docs/DEPENDENCY_POLICY.md` for the reviewed pnpm build-script policy and frozen-lockfile release workflow.

## v1.3.0 — canonical PWRC + fee-policy hardening

- Anchor program remains on the latest stable `@coral-xyz/anchor` / Anchor crates line used by this repository: **0.32.1**.
- Added Anchor toolchain pinning and `anchor-spl` Token-2022 extension support.
- Pinned the canonical PWRC mint: `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`.
- `initialize_sale`, `update_sale`, `buy_pwrc`, and inventory withdrawals now fail closed if canonical mint/decimals/Token-2022 fee invariants are violated.
- `buy_pwrc` and withdrawals use exact expected `TransferCheckedWithFee` semantics.
- Enforced an active PWRC fee of **200 bps / 2%**, while respecting the mint's on-chain maximum-fee cap.
- Kept Solana's network fee separate from the PWRC token fee and explicitly models PowerPay's current checkout service fee as 0%.
- Hardened `/send` to use the same canonical mint and expected-fee transfer instruction.
- Added `docs/FEES.md`, mint/fee disclosure in checkout, Terms of Sale, and Disclaimer.


## PowerPay v1.4.0

- Pinned `@coral-xyz/anchor`, `anchor-lang`, and `anchor-spl` to 0.32.1 for this release line.
- Added quote-bound `buy_pwrc` execution guards.
- Added immutable single-use `PurchaseReceipt` PDAs for Solana Pay settlement evidence.
- Kept the canonical PWRC mint pinned to `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`.
- Enforced the active PWRC Token-2022 transfer fee at 200 bps / 2%; Solana runtime fees remain separate and buyer-paid.
- Added `docs/PROGRAM_SECURITY.md`.
