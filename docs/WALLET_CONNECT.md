# PowerPay wallet connection

PowerPay uses `@solana/wallet-adapter-react` for connection state and **Wallet Standard discovery**. The application passes `wallets={[]}` so compatible wallets can be discovered without bundling the legacy aggregate wallet-adapter package.

The stock `@solana/wallet-adapter-react-ui` modal is not used. `components/wallet-connect-modal.tsx` owns the PowerPay connection experience while `components/solana-provider.tsx` owns network and provider state.

## Provider composition

```text
ConnectionProvider
  └─ WalletProvider wallets={[]} autoConnect
      └─ WalletConnectModalProvider
          └─ application
```

The configured RPC endpoint comes from client environment configuration, with `clusterApiUrl(...)` as the fallback.

## UX contract

The modal must make these facts clear before wallet selection:

1. active Solana cluster
2. canonical PWRC mint context
3. connection is non-custodial
4. wallet connection is not transaction approval

Detected/available Wallet Standard wallets are ranked ahead of unavailable wallets. Phantom, Solflare, and Backpack receive familiar Web3 Icons when their names match; actual connection still uses discovered adapters rather than hard-coded wallet implementations.

## Connection states

```text
closed
  ↓
open
  ↓
wallet discovered / unavailable
  ↓
wallet selected
  ↓
connecting
  ├─ rejected/error → error state
  └─ connected      → close + public key available
```

Changing wallets disconnects the active adapter before selecting and connecting the replacement.

## Connected-wallet menu

The application exposes explicit account actions rather than turning the wallet button into an implicit disconnect control:

- copy address
- change wallet
- disconnect

Purchase and send operations still require a separate wallet signature.

## Mobile behavior

The PowerPay modal behaves as a bottom sheet on narrow screens and respects safe-area insets. Wallet availability remains adapter-driven, allowing mobile-wallet integrations exposed by the provider/runtime where supported.

Mobile checkout actions live in `components/mobile.tsx`; opening a wallet or Solana Pay from the same device must not require scanning the device's own QR code.

## Accessibility

The modal includes:

- `role="dialog"`
- `aria-modal="true"`
- labelled title/description
- Escape-to-close
- focus containment
- focus restoration
- body scroll lock while open
- keyboard-operable wallet rows
- reduced-motion handling
- explicit loading/error/connected text states
- touch targets suitable for mobile interaction

## Security contract

PowerPay never asks for:

- recovery phrase
- seed phrase
- private key

A public key indicates the selected account only. The wallet remains responsible for showing and authorizing transaction signatures.
