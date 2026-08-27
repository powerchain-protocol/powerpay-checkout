# PowerPay wallet connection

PowerPay uses `@solana/wallet-adapter-react` for connection state and Wallet Standard discovery. It intentionally passes `wallets={[]}` so compatible Wallet Standard wallets are discovered without bundling the legacy `@solana/wallet-adapter-wallets` aggregate package.

The application does **not** use the generic `@solana/wallet-adapter-react-ui` modal. `components/wallet-connect-modal.tsx` is the PowerPay-owned presentation layer and keeps wallet state inside the Solana provider.

## UX contract

The connection dialog must make four things explicit before the user selects a wallet:

1. network / cluster
2. canonical PWRC mint context
3. wallet connection is non-custodial
4. connecting a wallet is not transaction approval

Detected Wallet Standard wallets are listed first. Phantom, Solflare and Backpack are shown as common supported wallets through `@web3icons/react`, but PowerPay does not hard-code those wallets as adapters.

## Connection flow

```text
Connect wallet
  ↓
Wallet Standard discovery
  ↓
select(adapter.name)
  ↓
wallet becomes active
  ↓
connect()
  ↓
wallet-owned approval UI
  ↓
public key available to PowerPay
```

Changing wallets disconnects the existing browser wallet before selecting the next adapter. Transaction approval is always a separate wallet-owned step.

## Mobile

The upstream WalletProvider can expose Solana Mobile Wallet Adapter when appropriate. The PowerPay dialog is rendered as a bottom sheet below 480 px and respects `env(safe-area-inset-bottom)`.

## Accessibility

The modal provides:

- `role="dialog"` and `aria-modal="true"`
- title and description relationships
- Escape-to-close
- focus restoration after closing
- keyboard focus containment
- reduced-motion support
- 44 px-class touch targets
- explicit connecting, connected and error states

## Security

PowerPay never asks for a seed phrase, private key or recovery phrase. A connected public key is an account-selection signal only. Purchases and sends still require the wallet to sign the final Solana transaction.
