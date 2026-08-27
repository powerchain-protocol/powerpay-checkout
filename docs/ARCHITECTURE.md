# PowerPay architecture

## Truth boundaries

PowerPay separates **settlement truth** from **market reference data**.

### Settlement truth

The sale config PDA is authoritative for:

- treasury
- canonical PWRC Token-2022 mint (`PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`)
- active PWRC transfer-fee policy: 200 bps / 2%
- gross PWRC per SOL
- min/max purchase size
- enabled/disabled state
- sale inventory boundary

The server builds but does not sign the purchase transaction. The buyer wallet is the payer and signer. Browser-wallet and Solana Pay QR paths share the same transaction builder and on-chain program.

### Market reference data

```text
Pyth Hermes ───────┐
                   ├─> /api/market/sol-usd ─> MarketPriceContext ─> checkout UI
Birdeye ───────────┘           │
                               ├─ freshness / source
                               └─ divergence bps

sale config PDA ────────────────────────────────────────────────> executable PWRC rate
```

Pyth is preferred when fresh. Birdeye acts as independent corroboration/fallback. Provider divergence is exposed to the UI and can downgrade the market-data health indicator. Neither source is permitted to override the on-chain sale rate.

All provider keys remain in server environment variables.

## Atomic purchase

```text
Buyer wallet
   │ signs
   ▼
buy_pwrc(lamports)
   ├── System Program: buyer SOL → treasury
   └── Token-2022: sale vault gross PWRC → buyer ATA
            │
            ├── canonical mint enforced
            ├── active fee must be 200 bps / 2%
            └── exact TransferCheckedWithFee value asserted

Solana runtime
   └── network fee charged separately to transaction fee payer
```

The transaction cannot leave a paid-but-undelivered application state: either both transfer legs complete or the transaction fails.

## Token-2022 fee display

`GET /api/quote` loads the canonical Token-2022 mint, resolves the active transfer-fee schedule for the current epoch, and reports gross, exact token fee, maximum-fee cap, and net PWRC. PowerPay requires the active basis-point policy to be exactly 200 bps (2%), while the actual token amount is still calculated from current on-chain mint state so Token-2022's maximum-fee cap is respected.

The Anchor program repeats this check at execution time and uses `transfer_checked_with_fee`, so a mint fee-policy change between quote review and execution fails closed. Solana's network fee is not part of the 2% token fee and is paid separately by the transaction fee payer.

## Client composition

```text
RootLayout
  └─ AppProviders
      └─ SolanaProvider
          ├─ ConnectionProvider
          ├─ WalletProvider (Wallet Standard)
          └─ WalletModalProvider

/checkout
  └─ MarketPriceProvider
      └─ 15s SOL/USD refresh
```

`components/mobile.tsx` owns the mobile sticky purchase action so responsive behavior does not duplicate settlement logic.

## Error boundary

- `lib/errors.ts` defines typed API errors and consistent JSON error responses.
- `app/error.tsx` is the client route boundary for recoverable render failures.
- `app/loading.tsx` is the App Router loading surface.
- Upstream market-data failure does not enable or disable settlement; it only degrades the reference-data indicator.
- On-chain quote failure can be configured to fail closed with `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true`.

## Legal surfaces

- `/terms-of-sale`
- `/cookies`
- `/disclaimer`

These are deployment templates and should be reviewed for the intended jurisdiction and sale structure before production use.

## Wallets and icons

Wallet discovery uses Wallet Standard through `@solana/wallet-adapter-react` with `wallets={[]}`. Visual identities use `@web3icons/react/dynamic` for Solana, SOL, Phantom, Solflare and Backpack.

## Production gates

1. Build and audit the Anchor program.
2. Deploy to the intended cluster and replace the program id.
3. Initialize config with canonical PWRC mint `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc` and the intended treasury.
4. Fund the sale vault.
5. Verify the active Token-2022 transfer-fee policy is 200 bps (2%), inspect the current maximum-fee cap, and confirm expected net receipt.
6. Configure authenticated Pyth and Birdeye server keys.
7. Validate market-data freshness and divergence behavior.
8. Enable the sale only after inventory, quote, treasury and legal checks pass.
9. Set a private production RPC and public HTTPS `NEXT_PUBLIC_APP_URL`.
10. Set `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true`.
11. Exercise browser-wallet and QR purchases on devnet/staging before mainnet.
