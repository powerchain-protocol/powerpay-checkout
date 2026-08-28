# PowerPay manifest

Canonical release: **1.0.0**  
Canonical PWRC mint: `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`

## Product surfaces

| Surface | Source | Contract |
| --- | --- | --- |
| Buy PWRC checkout | `apps/web/components/checkout-app.tsx` | SOL purchase → fee-aware PWRC settlement |
| Mobile checkout action | `apps/web/components/mobile.tsx` | compact safe-area checkout control |
| Wallet connect | `apps/web/components/wallet-connect-modal.tsx` | Wallet Standard discovery; user-controlled signing |
| Public navigation | `apps/web/components/public-navigation.tsx` | route-aware Next.js transitions + modal accessibility |
| Send | `apps/web/app/send/` | SOL/PWRC wallet-signed transfer |
| Receive | `apps/web/app/receive/` | address + Solana Pay receive request |
| Solana Pay | `apps/web/app/api/solana-pay/` | expiring request, transaction build, receipt verification |

## Canonical economic policy

```text
Base SOL purchase
  + 2% PowerPay service fee in SOL
  + separate Solana runtime/network fee

Gross PWRC from base purchase rate
  - exact 2% Token-2022 fee (subject to maximum-fee cap)
  = net PWRC delivered to buyer
```

The service fee and base purchase are transferred to the configured treasury in the same Anchor instruction. Market-reference pricing never sets the executable PWRC/SOL rate.

## Core code boundaries

```text
apps/web/
├─ app/api/                 hardened App Router APIs
├─ components/              checkout, navigation, wallet and responsive UI
├─ constants/
│  └─ price-rates.ts        fee/rate constants
├─ context/                 network, health, price and wallet state
├─ data/
│  └─ fetch-data.ts         bounded client fetching
├─ lib/api/                 request-id/body/no-store/OpenAPI controls
├─ lib/pricing/
│  ├─ pyth.ts
│  └─ birdeye.ts
├─ lib/solana/
│  ├─ rpc.ts                bounded RPC transport
│  ├─ solana.ts             Solana helpers / authority messaging
│  └─ sale.ts               purchase transaction builder
└─ lib/websocket/guard.ts   policy contract for future WS adapters

programs/
├─ pwrc-sale/               Anchor sale + PurchaseReceipt
└─ settlements/             pure Rust service-fee math
```

## Security invariants

- API JSON request bodies: **1 MiB max**.
- API responses: correlation ID + no-store.
- RPC timeout: **8 seconds**.
- RPC response ceiling: **1 MiB**.
- Public cluster choices: `devnet`, `mainnet-beta` only.
- Mainnet execution: fail closed without verified program/SaleConfig/mint state.
- Swagger: authorization persistence disabled by default.
- Global privacy header: `X-Robots-Tag: noindex, nofollow, noarchive`.
- WebSocket policy: 64 KiB messages, 3 failed auth attempts, 32 subscriptions, 120 messages/minute, policy close mappings.
- Public mobile navigation: focus trap, Escape close, focus restoration, background scroll lock, route-aware `aria-current`.

## Regression gates

```bash
pnpm run doctor
pnpm run check:accessibility
pnpm run check:security
pnpm run check:architecture
pnpm check
```

`pnpm check` runs the static guard suite before TypeScript validation.

## Release networks

| Application name | Solana runtime | Purpose |
| --- | --- | --- |
| Devnet | `devnet` | test assets / integration |
| Mainnet Beta | `mainnet-beta` | production assets |

Anchor refers to the production deployment target as `mainnet`; the web/runtime identifier remains `mainnet-beta`.
