# PowerPay

**Canonical version: 1.0.0**

PowerPay is the Solana-native checkout for buying **PWRC** with **SOL**. It provides browser-wallet checkout, Solana Pay Scan To Pay, SOL/PWRC send and receive, Token-2022 fee-aware settlement, and Pyth/Birdeye SOL/USD reference data in a responsive Next.js application.

> **Canonical PWRC Token-2022 mint**  
> `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`

## Canonical release contract

PowerPay `1.0.0` is the stable product/version identifier for this repository. Feature work does not change that product version unless a deliberate release-version decision is made.

The release supports exactly two public Solana environments:

| Network | Runtime cluster | Purpose | Value |
| --- | --- | --- | --- |
| Devnet | `devnet` | integration, wallet, Solana Pay and program testing | test assets |
| Mainnet Beta | `mainnet-beta` | production settlement | real SOL / PWRC |

The UI can switch between both networks. A network change disconnects the active wallet, changes the browser RPC, routes API requests to the matching server RPC/program mapping, resets stale checkout state, and uses the correct explorer URL.

## What ships

- **Buy PWRC** with SOL through a connected Solana wallet.
- **Solana Pay Scan To Pay** with expiring transaction-request QR codes.
- **Wallet Standard** discovery with a PowerPay-owned connect modal.
- **Devnet / Mainnet Beta selector** with explicit TEST/LIVE states and a production confirmation step.
- **Send SOL / PWRC** with wallet-reviewed transactions.
- **Receive SOL** through public address or Solana Pay QR/link.
- **Token-2022 fee enforcement** requiring the active PWRC transfer fee to be **200 bps / 2%**.
- **Pyth + Birdeye SOL/USD** reference data with freshness/deviation state.
- **Cluster-aware wallet balances** for SOL/PWRC with visibility-aware refresh, checkout sufficiency checks, transfer balance review and a safe SOL max buffer.
- **Runtime health surface** backed by `/api/system/health`, verifying RPC reachability, deployed program state, sale initialization, canonical Token-2022 mint ownership, active 2% fee policy and sale-vault inventory.
- **API hardening** with a 1 MiB request-body ceiling, request correlation IDs, no-store responses, safe JSON parsing and an OpenAPI endpoint with authorization persistence disabled.
- **RPC hardening** with an 8-second timeout, explicit latency/error states, response-size limits and clear separation between read transport and on-chain settlement authority.
- **Navigation accessibility** with route-aware `aria-current`, Next.js client transitions, focus trapping, Escape-to-close, focus restoration and background scroll locking on the public mobile dialog.
- **WebSocket policy guard** for adapters/gateways: 64 KiB messages, authentication-attempt limits, subscription caps, message-rate limits and policy/rate-limit close mappings.
- **Responsive UI** including `components/mobile.tsx` for phone checkout actions, accessible skip navigation and stronger transaction-state feedback.
- **Legal routes** for Terms of Sale, Cookies and Disclaimer.
- **Anchor sale program** with quote binding and replay-resistant purchase receipt PDAs.

## Settlement model

```text
selected cluster
    │
    ├─ devnet RPC + devnet program
    └─ mainnet-beta RPC + mainnet program
    │
    ▼
Buyer reviews quote
    ├─ SOL purchase amount
    ├─ 2% PowerPay service fee in SOL
    ├─ gross PWRC
    ├─ 2% PWRC Token-2022 transfer fee
    ├─ net PWRC
    └─ separate Solana network fee
    │
    ▼
Wallet signature / Solana Pay transaction request
    │
    ▼
buy_pwrc(...)
    ├─ purchase SOL + 2% service fee ─► configured treasury
    ├─ gross PWRC ────────────────────► buyer Token-2022 ATA
    └─ PurchaseReceipt ───────────────► immutable settlement evidence
```

The **sale config PDA** remains settlement authority for the executable PWRC/SOL rate, treasury, limits, enabled state and inventory boundary. Pyth/Birdeye data never controls the executable token rate.

Mainnet is intentionally stricter: if the live on-chain quote cannot be read, the mainnet quote endpoint fails closed instead of returning a purchasable preview.

## Fee model

| Fee | Policy |
| --- | --- |
| PWRC Token-2022 transfer fee | **2% / 200 bps**, subject to the mint max-fee cap |
| Solana transaction fee | separate; paid by the transaction fee payer |
| PowerPay checkout service fee | **2% / 200 bps** of the SOL purchase amount; charged atomically to the configured treasury |

See [`docs/FEES.md`](docs/FEES.md).

## Toolchain

| Component | Version / policy |
| --- | --- |
| PowerPay | **1.0.0** |
| Node.js | `>=20.18` |
| pnpm | `11.24.0` |
| Next.js | `16.3.x` |
| React | `19.x` |
| TypeScript | `5.9.3` |
| Anchor CLI / Rust crates | `1.1.2` |
| Anchor TypeScript client | `@anchor-lang/core@1.1.2` |
| Solana CLI | `3.1.10` |
| Solana client | `@solana/web3.js` v1 line |

## Repository

```text
powerpay/
├─ apps/web/
│  ├─ app/                    App Router pages + APIs
│  ├─ components/             checkout, wallet, network, mobile UI
│  ├─ constants/              app, market, route and network constants
│  ├─ context/                network, market, wallet-balance + system-health state
│  ├─ env/                    browser/server environment boundaries
│  ├─ lib/                    pricing, errors, Solana builders
│  ├─ app/api/system/health/  cluster/runtime readiness API
│  └─ utils/
├─ programs/pwrc-sale/        Anchor SOL → PWRC program
├─ programs/settlements/      canonical fee/settlement math shared by the program
├─ scripts/                   setup, diagnostics and sale administration
├─ tests/                     Anchor integration tests
├─ docs/                      architecture and operating documentation
└─ Anchor.toml
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

PowerPay starts on **devnet** by default. The network selector is available in the header and wallet-connect surface.
Mainnet Beta is fully wired but **disabled by default**; enable both the browser selector and server execution gate only after the production program, mint, RPC and treasury configuration are verified.

## Dual-network configuration

PowerPay never accepts an arbitrary RPC URL or program id from a request. A request may select only `devnet` or `mainnet-beta`; server code then resolves that cluster against reviewed environment configuration.

Required mappings:

```bash
NEXT_PUBLIC_DEFAULT_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_ENABLE_MAINNET_BETA=false
POWERPAY_ENABLE_MAINNET_BETA=false

NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET_BETA=https://api.mainnet-beta.solana.com
SOLANA_RPC_URL_DEVNET=https://api.devnet.solana.com
SOLANA_RPC_URL_MAINNET_BETA=https://api.mainnet-beta.solana.com

NEXT_PUBLIC_POWERPAY_PROGRAM_ID_DEVNET=<devnet-program-id>
NEXT_PUBLIC_POWERPAY_PROGRAM_ID_MAINNET_BETA=<mainnet-program-id>
POWERPAY_PROGRAM_ID_DEVNET=<devnet-program-id>
POWERPAY_PROGRAM_ID_MAINNET_BETA=<mainnet-program-id>
```

For production, replace public RPC defaults with production-grade infrastructure and set:

```bash
POWERPAY_REQUIRE_ONCHAIN_QUOTE=true
NEXT_PUBLIC_APP_URL=https://<powerpay-origin>
```

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) and [`docs/NETWORKS.md`](docs/NETWORKS.md).

## Program deployment

Local tests remain on Anchor localnet. Deployment is explicit by cluster.

```bash
anchor build
anchor test

# Devnet
anchor deploy --provider.cluster devnet
pnpm sale:inspect:devnet

# Mainnet Beta — only after audit/release approval
anchor deploy --provider.cluster mainnet
pnpm sale:inspect:mainnet
```

Anchor calls the production cluster `mainnet`; the web/runtime identifier is `mainnet-beta`.

Before enabling either sale:

- verify program id for the selected cluster
- verify canonical PWRC mint
- verify 9 decimals
- verify active Token-2022 transfer fee = 200 bps
- verify treasury and rate
- verify min/max purchase limits
- verify vault inventory
- verify Solana Pay request/status flow
- verify explorer links resolve to the selected cluster

## Operator commands

Generic commands use `POWERPAY_CLUSTER` from `.env.local`:

```bash
pnpm sale:init
pnpm sale:fund
pnpm sale:update
pnpm sale:inspect
```

Cluster-explicit commands are preferred for release operations:

```bash
pnpm sale:init:devnet
pnpm sale:fund:devnet
pnpm sale:inspect:devnet

pnpm sale:init:mainnet
pnpm sale:fund:mainnet
pnpm sale:inspect:mainnet
```

Mainnet initialization/funding/enabling should remain a separately approved operational action.

## Runtime readiness

The header health badge is backed by `GET /api/system/health?cluster=devnet|mainnet-beta`. It is informational for operators and users; settlement remains governed by the same fail-closed transaction builders and on-chain program invariants. The health response does not expose private RPC credentials.

Connected-wallet SOL/PWRC balances are read through the active cluster connection. They are used for UX validation only; the wallet and Solana runtime remain authoritative at signing time.

## Release gates

If `pnpm-lock.yaml` is not present in a fresh source export, run `pnpm install` once and commit the generated lockfile before using the frozen-lockfile gate.

```bash
pnpm run doctor
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
anchor build
anchor test
```

Then execute the network-specific checks in [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).

## Documentation

- [`CHANGELOG.md`](CHANGELOG.md) — canonical 1.0.0 hardening history
- [`MANIFEST.md`](MANIFEST.md) — source, policy and release manifest
- [`docs/README.md`](docs/README.md) — documentation index
- [`docs/SECURITY.md`](docs/SECURITY.md) — API, RPC, WebSocket and browser security controls
- [`docs/API.md`](docs/API.md) — hardened API conventions and OpenAPI behavior
- [`docs/NETWORKS.md`](docs/NETWORKS.md) — devnet/mainnet-beta architecture
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system boundaries
- [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) — environment contract
- [`docs/PROGRAM_SECURITY.md`](docs/PROGRAM_SECURITY.md) — settlement invariants
- [`docs/PRICE_DATA.md`](docs/PRICE_DATA.md) — Pyth/Birdeye boundary
- [`docs/WALLET_CONNECT.md`](docs/WALLET_CONNECT.md) — wallet connection UX
- [`docs/FEES.md`](docs/FEES.md) — fee contract
- [`docs/DEPENDENCY_POLICY.md`](docs/DEPENDENCY_POLICY.md) — pnpm build policy
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — release gates

## Security boundary

PowerPay is non-custodial. The web/server components construct and inspect transactions; the buyer wallet signs them. Never place wallet seed phrases, private keys, operator keypairs, Pyth API keys or Birdeye API keys in browser-exposed environment variables.

Legal documents in this repository are deployment templates and require jurisdiction-specific review before production use.
