# PowerPay wallet connection

PowerPay `1.0.0` uses `@solana/wallet-adapter-react` for connection state and **Wallet Standard discovery**. The app passes `wallets={[]}` so compatible wallets can be discovered without bundling the legacy aggregate wallet-adapter package.

The stock `@solana/wallet-adapter-react-ui` modal is not used. PowerPay owns both its connection modal and its network selector.

## Provider composition

```text
SolanaNetworkProvider
  └─ SolanaProvider
      └─ ConnectionProvider(selected cluster RPC)
          └─ WalletProvider wallets={[]} autoConnect={false}
              └─ WalletConnectModalProvider
                  └─ application
```

Supported runtime clusters:

- `devnet`
- `mainnet-beta`

## Network switching

The selected cluster lives in `context/solana-network-context.tsx` and is persisted locally.

When a user changes cluster:

1. the active wallet is disconnected
2. the Solana provider remounts with the new RPC
3. stale checkout signatures/QR references are cleared
4. subsequent API requests include the selected cluster
5. server routes resolve the matching reviewed RPC/program mapping

Moving to Mainnet Beta requires explicit confirmation because transactions use real SOL/PWRC.

## Wallet modal context

Before wallet selection, the modal surfaces:

- current Solana network
- TEST or LIVE meaning
- canonical PWRC mint
- network-specific PowerPay sale program id
- non-custodial connection statement

A missing program id is visible as configuration state rather than being hidden.

## Wallet discovery

Detected/available Wallet Standard wallets are ranked ahead of unavailable wallets. Phantom, Solflare and Backpack receive familiar Web3 Icons when their names match; connection still uses the discovered adapter rather than a hard-coded wallet implementation.

## Connection states

```text
closed
  ↓
open
  ↓
network reviewed
  ↓
wallet discovered / unavailable
  ↓
wallet selected
  ↓
connecting
  ├─ rejected/error → error state
  └─ connected      → close + public key available
```

Changing wallets disconnects the active adapter before selecting the replacement.

## Connected-wallet menu

- copy address
- change wallet
- disconnect

Connection does not authorize payment. Buy/send actions still require a wallet signature.

## Mobile behavior

The modal becomes a bottom sheet on narrow screens and keeps network controls accessible. `components/mobile.tsx` exposes the current network in the sticky checkout summary so a user can distinguish TEST from LIVE immediately before opening Solana Pay or signing.

## Accessibility

The wallet experience includes:

- `role="dialog"`
- `aria-modal="true"`
- labelled title/description
- Escape-to-close
- focus containment/restoration
- body scroll lock
- keyboard-operable wallet/network rows
- explicit loading/error/connected states
- mobile-sized touch targets

## Security contract

PowerPay never asks for a recovery phrase, seed phrase or private key. Automatic reconnect is disabled in the canonical release so a network change or reload does not silently re-authorize a wallet session. The public key identifies the selected account only; the wallet remains responsible for transaction review and authorization.
