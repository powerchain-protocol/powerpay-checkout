# PowerPay release checklist

Use this checklist for staging and mainnet releases. A release should not advance while a higher gate is incomplete.

## 1. Reproducible dependencies

```bash
node --version
pnpm --version
pnpm run doctor
pnpm install --frozen-lockfile
```

Required:

- Node satisfies `>=20.18`
- pnpm is `11.24.0`
- lockfile is committed and frozen install succeeds
- no unreviewed dependency build scripts remain
- `pnpm-workspace.yaml` contains only explicitly reviewed `allowBuilds` decisions

## 2. Web quality gates

```bash
pnpm typecheck
pnpm build
```

Verify:

- no TypeScript errors
- no route generation errors
- no experimental Next.js flags required for production startup
- wallet modal works with keyboard and mobile viewport
- `/checkout`, `/send`, `/receive`, and legal routes render

## 3. Program toolchain

```bash
rustc --version
solana --version
anchor --version
cargo fmt --check
anchor build
anchor test
```

Expected repository toolchain:

```text
Anchor:     1.1.2
Solana CLI: 3.1.10
Rust:       >=1.89
```

## 4. Program / IDL alignment

After every program change:

- rebuild the program
- regenerate IDL/types
- confirm web transaction account order and instruction encoding match the deployed program
- validate `PurchaseReceipt` account decoding
- if upgrading a legacy Anchor 0.32.x deployment, complete the legacy IDL-account migration gate first

## 5. Canonical PWRC checks

Verify:

```text
Mint:     PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals: 9
Fee:      200 bps / 2%
```

Also confirm the current Token-2022 maximum-fee cap and expected net receipt for representative purchase sizes.

## 6. Sale configuration

```bash
pnpm sale:inspect
```

Confirm:

- correct cluster
- correct deployed program id
- canonical PWRC mint
- expected treasury
- expected PWRC-per-SOL rate
- min/max purchase limits
- sufficient vault inventory
- intended enabled/disabled state

Keep the sale disabled until staging purchase validation is complete.

## 7. Market data

Verify:

- authenticated Pyth request succeeds
- authenticated Birdeye request succeeds
- freshness thresholds are correct
- divergence is surfaced rather than silently ignored
- stale/fallback values are visibly degraded
- market feeds cannot affect executable PWRC settlement rate

## 8. Wallet and Solana Pay staging

Test at least:

- Phantom-compatible Wallet Standard flow
- Solflare-compatible flow
- Backpack-compatible flow where available
- wallet rejection
- wallet switch
- disconnect/reconnect
- browser-wallet purchase
- same-device mobile Solana Pay handoff
- QR Scan To Pay
- expired QR
- reused reference rejection
- insufficient SOL
- insufficient sale inventory
- min/max purchase rejection

## 9. Settlement evidence

For a successful purchase, verify:

- buyer SOL transfer to configured treasury
- PWRC gross transfer from sale vault
- exact Token-2022 fee
- expected net PWRC receipt
- separate network fee paid by fee payer
- immutable `PurchaseReceipt` PDA
- receipt fields match reviewed quote/reference
- status endpoint resolves settlement from program-owned evidence

## 10. Production configuration

Before mainnet enablement:

```bash
POWERPAY_REQUIRE_ONCHAIN_QUOTE=true
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_APP_URL=https://<public-origin>
```

Also require:

- production RPC
- HTTPS
- server-only API keys
- operator wallet isolated from browser runtime
- program audit / security review
- jurisdiction-specific legal review
- monitoring and incident-response ownership

## 11. Enablement

Only after every previous gate succeeds:

1. fund intended sale inventory
2. re-run `pnpm sale:inspect`
3. enable the sale
4. execute a controlled production smoke purchase
5. verify receipt and treasury state
6. monitor errors, RPC health, market-data health, and settlement confirmations
