# PowerPay

**PowerPay** is the Solana-native checkout for buying **PWRC** with **SOL**. It combines wallet-signed settlement, Solana Pay Scan To Pay, Token-2022 fee enforcement, SOL/PWRC send and receive, and independent SOL/USD market references in a responsive Next.js application.

> **Canonical PWRC mint**  
> `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`

## What ships

- **Buy PWRC** — browser-wallet and Solana Pay checkout paths share the same transaction builder.
- **Scan To Pay** — Solana Pay transaction-request QR with single-use purchase receipts.
- **Wallet connection** — Wallet Standard discovery with a PowerPay-owned modal, wallet switching, mobile bottom-sheet behavior, and non-custodial safety states.
- **Send / Receive** — SOL and canonical PWRC transfer workflows.
- **Token-2022 fee handling** — active PWRC transfer fee must be **200 bps / 2%**; the current maximum-fee cap is respected.
- **Market references** — Pyth primary SOL/USD data with Birdeye corroboration/fallback. Market data never controls settlement.
- **Responsive checkout** — dedicated `components/mobile.tsx` action surface for phone layouts.
- **Legal surfaces** — Terms of Sale, Cookies, and Disclaimer routes.
- **Anchor program** — atomic SOL → PWRC sale program with quote binding and replay-resistant purchase receipt PDAs.

## Settlement model

```text
Buyer reviews quote
      │
      ├─ SOL purchase amount
      ├─ gross PWRC
      ├─ 2% PWRC Token-2022 transfer fee
      ├─ net PWRC
      └─ separate Solana network fee
      │
      ▼
Wallet signature / Solana Pay request
      │
      ▼
buy_pwrc(...)
      ├─ buyer SOL ─────────────► configured treasury
      ├─ sale vault gross PWRC ─► buyer Token-2022 ATA
      └─ PurchaseReceipt PDA ───► immutable settlement evidence
```

The **sale config PDA is settlement authority** for the executable PWRC/SOL rate, treasury, limits, enabled state, and sale inventory boundary. Pyth and Birdeye are display/reconciliation inputs only.

## Fee model

| Fee | Current policy | Paid by / destination |
| --- | --- | --- |
| PWRC Token-2022 transfer fee | **2% / 200 bps**, subject to mint max-fee cap | Applied by Token-2022 |
| Solana network fee | Runtime-dependent | Transaction fee payer |
| PowerPay checkout service fee | **0%** | Not charged |

See [`docs/FEES.md`](docs/FEES.md) for the complete fee contract.

## Toolchain

| Component | Version / policy |
| --- | --- |
| Node.js | `>=20.18` |
| pnpm | `11.24.0` |
| Next.js | `16.3.x` |
| React | `19.x` |
| TypeScript | `5.9.3` |
| Anchor CLI / crates | `1.1.2` |
| Anchor TypeScript client | `@anchor-lang/core@1.1.2` |
| Solana CLI | `3.1.10` |
| Solana web3 client | `@solana/web3.js` v1 line |

Anchor v1 removed the legacy `@coral-xyz/anchor` TypeScript package from this workspace. See [`docs/ANCHOR_V1_MIGRATION.md`](docs/ANCHOR_V1_MIGRATION.md).

## Repository

```text
powerpay/
├─ apps/web/                 Next.js checkout application
├─ programs/pwrc-sale/       Anchor SOL → PWRC program
├─ scripts/                  environment, diagnostics, sale admin
├─ tests/                    Anchor integration tests
├─ docs/                     architecture and operations docs
├─ Anchor.toml               pinned Anchor / Solana toolchain
├─ pnpm-workspace.yaml       workspace + reviewed build scripts
└─ README.md
```

### Web application

```text
apps/web/
├─ app/
│  ├─ api/quote/
│  ├─ api/market/sol-usd/
│  ├─ api/transactions/buy/
│  ├─ api/solana-pay/
│  ├─ checkout/
│  ├─ send/
│  ├─ receive/
│  ├─ terms-of-sale/
│  ├─ cookies/
│  └─ disclaimer/
├─ components/
│  ├─ checkout-app.tsx
│  ├─ mobile.tsx
│  ├─ solana-provider.tsx
│  └─ wallet-connect-modal.tsx
├─ constants/
├─ context/
├─ env/
├─ lib/
└─ utils/
```

## Quick start

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate

pnpm run doctor
pnpm run setup:env
pnpm install
pnpm dev
```

`pnpm run setup:env` creates missing local environment files from the checked-in templates without overwriting existing values.

Open `http://localhost:3000` and use devnet unless you have deliberately configured another cluster.

## Environment

Two local environment files are used:

- `.env.local` — sale administration and root tooling.
- `apps/web/.env.local` — Next.js runtime configuration.

Important production rules:

- Keep `PYTH_API_KEY` and `BIRDEYE_API_KEY` server-only.
- Use a private production RPC where appropriate.
- Set `NEXT_PUBLIC_APP_URL` to a public HTTPS origin for Solana Pay.
- Set `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true` in production.
- Keep the canonical PWRC mint unchanged unless the protocol itself is intentionally migrated.

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

## Program workflow

Build and test the program:

```bash
anchor build
anchor test
```

For a new deployment:

```bash
anchor keys sync
anchor build
anchor deploy --provider.cluster devnet
anchor keys list
```

Then update `POWERPAY_PROGRAM_ID` and `NEXT_PUBLIC_POWERPAY_PROGRAM_ID`, initialize the sale, fund inventory, inspect configuration, and only then enable it.

```bash
pnpm sale:init
pnpm sale:fund
pnpm sale:inspect
pnpm sale:update
```

Before enabling a sale, verify:

- canonical PWRC mint
- 9 decimals
- active Token-2022 fee = 200 bps
- treasury
- PWRC-per-SOL rate
- min/max purchase limits
- vault inventory
- program id and cluster

## Wallet connection

PowerPay uses `@solana/wallet-adapter-react` with Wallet Standard discovery and a custom connection surface. The UI does not treat wallet connection as transaction approval and never requests private keys or recovery phrases.

See [`docs/WALLET_CONNECT.md`](docs/WALLET_CONNECT.md).

## Market data

`GET /api/market/sol-usd` selects a reference observation using:

1. fresh Pyth observation
2. fresh Birdeye observation
3. stale upstream observation, visibly degraded
4. configured fallback, marked reference-only

Provider divergence and freshness are surfaced to the UI. None of these inputs can mutate the executable PWRC/SOL sale rate.

See [`docs/PRICE_DATA.md`](docs/PRICE_DATA.md).

## Release gates

```bash
pnpm run doctor
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
cargo fmt --check
anchor build
anchor test
pnpm sale:inspect
```

The repository uses pnpm's fail-closed dependency-build policy. Approved native build scripts are listed explicitly in `pnpm-workspace.yaml`; do not replace that policy with `dangerouslyAllowAllBuilds`.

See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) and [`docs/DEPENDENCY_POLICY.md`](docs/DEPENDENCY_POLICY.md).

## Documentation

Start at [`docs/README.md`](docs/README.md).

- [Architecture](docs/ARCHITECTURE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Fees](docs/FEES.md)
- [Price data](docs/PRICE_DATA.md)
- [Wallet connection](docs/WALLET_CONNECT.md)
- [Program security](docs/PROGRAM_SECURITY.md)
- [Anchor v1 migration](docs/ANCHOR_V1_MIGRATION.md)
- [Dependency policy](docs/DEPENDENCY_POLICY.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Build notes](BUILD_NOTES.md)

## Legal and production notice

PowerPay includes technical templates for Terms of Sale, Cookies, and Disclaimer pages. They are not a substitute for jurisdiction-specific legal, tax, sanctions, consumer-protection, securities, or digital-asset review. Audit the program and production configuration before mainnet enablement.
