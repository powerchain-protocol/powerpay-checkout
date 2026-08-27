# PowerPay

PowerPay is the Solana-native checkout for buying **PWRC** with **SOL**. It ships a light-theme desktop and mobile checkout, Solana Pay **Scan To Pay**, Wallet Standard connection modal, direct browser-wallet purchases, SOL/PWRC send and receive, Web3 Icons, independent SOL/USD market references, legal surfaces, and an Anchor Token-2022 sale program.

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
  sale vault PWRC → buyer ATA
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
pnpm install
cp .env.example .env.local
cp apps/web/.env.example apps/web/.env.local
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

Update `POWERPAY_PROGRAM_ID` / `NEXT_PUBLIC_POWERPAY_PROGRAM_ID` with the deployed id. Initialize the sale with the real Token-2022 PWRC mint, treasury, gross PWRC-per-SOL rate, and min/max purchase limits. Fund the sale config PDA's associated Token-2022 account before enabling purchases.

```bash
cp .env.example .env.local
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
- Token-2022 transfer fees are read from the mint and surfaced as gross/fee/net values.
- Pyth/Birdeye are display and reconciliation inputs only; they cannot mutate the sale rate.
- Market-data API keys remain server-side.
- Set `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true` for fail-closed production sale quotes.
- Use a private production RPC and public HTTPS app URL.
- Audit the Anchor program and legal/compliance configuration before mainnet sale enablement.
- Exercise browser-wallet and Scan To Pay paths on devnet/staging before mainnet.

## Brand reference

The provided PowerPay mark is under `apps/web/public/assets/brand/`. The approved light checkout reference is retained under `docs/reference/`.
