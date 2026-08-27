# PowerPay architecture

## Truth boundaries

PowerPay separates **settlement truth** from **market reference data**.

### Settlement truth

The sale config PDA is authoritative for:

- treasury
- PWRC Token-2022 mint
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
   └── Token-2022: sale vault PWRC → buyer ATA
            │
            └── transfer-fee extension enforced by mint
```

The transaction cannot leave a paid-but-undelivered application state: either both transfer legs complete or the transaction fails.

## Token-2022 fee display

`GET /api/quote` loads the Token-2022 mint, resolves the active transfer-fee schedule for the current epoch, and reports gross, fee, and net PWRC. This avoids hard-coding a fee percentage into settlement logic.

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
3. Initialize config with the real PWRC Token-2022 mint and treasury.
4. Fund the sale vault.
5. Verify mint transfer-fee configuration and expected net receipt.
6. Configure authenticated Pyth and Birdeye server keys.
7. Validate market-data freshness and divergence behavior.
8. Enable the sale only after inventory, quote, treasury and legal checks pass.
9. Set a private production RPC and public HTTPS `NEXT_PUBLIC_APP_URL`.
10. Set `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true`.
11. Exercise browser-wallet and QR purchases on devnet/staging before mainnet.
