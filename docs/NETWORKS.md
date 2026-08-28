# Solana network modes

PowerPay `1.0.0` supports two public Solana clusters and no arbitrary runtime network injection:

- `devnet`
- `mainnet-beta`

The network is a first-class execution context. It controls the RPC endpoint, sale program id, Solana Pay transaction construction, purchase receipt verification, wallet connection remount, and explorer links.

## Network registry

The canonical browser registry is defined in:

```text
apps/web/constants/network.ts
```

Each network has:

- canonical cluster id
- human-readable label
- TEST/LIVE badge
- production flag
- default public RPC fallback
- Solscan query behavior

`testnet` is intentionally not part of the PowerPay `1.0.0` runtime contract.

## Browser selection

`SolanaNetworkProvider` owns the selected cluster.

```text
AppProviders
  └─ SolanaNetworkProvider
      └─ SolanaProvider
          ├─ ConnectionProvider(selected RPC)
          ├─ WalletProvider
          └─ WalletConnectModalProvider
```

The selection is persisted under:

```text
powerpay.solana.cluster
```

Changing network:

1. disconnects the active wallet
2. changes the selected cluster
3. remounts the Solana connection provider
4. resets stale checkout/transaction state
5. regenerates cluster-bound quote and Solana Pay requests

The UI requires a second confirmation before moving from devnet to Mainnet Beta.

## Server routing

The client sends only a cluster identifier. It does **not** send an RPC URL or executable program id.

```text
request ?cluster=devnet
          │
          ▼
resolveServerSolanaNetwork()
          │
          ├─ devnet ───────► SOLANA_RPC_URL_DEVNET
          │                  POWERPAY_PROGRAM_ID_DEVNET
          │
          └─ mainnet-beta ─► SOLANA_RPC_URL_MAINNET_BETA
                             POWERPAY_PROGRAM_ID_MAINNET_BETA
```

This prevents a caller from redirecting server transaction construction to an unreviewed RPC/program pair.

## Devnet

Purpose:

- integration testing
- wallet-connect validation
- Solana Pay QR testing
- sale-program deployment testing
- receipt/replay testing
- send/receive testing

Devnet may use preview quotes when the on-chain sale is unavailable and `POWERPAY_REQUIRE_ONCHAIN_QUOTE=false`. Preview data must never become executable settlement authority.

The canonical program still requires the configured PWRC mint address and Token-2022 fee policy. A usable devnet deployment therefore needs the expected PWRC test/mirror mint to exist on devnet with the required 9 decimals and 200 bps transfer-fee configuration.

## Mainnet Beta

Mainnet Beta is production settlement. It requires both the browser-facing selector flag and the server-side `POWERPAY_ENABLE_MAINNET_BETA` execution policy to permit the full flow.

PowerPay applies stricter behavior:

- real-asset warning in UI
- explicit switch confirmation
- active wallet disconnected during network change
- no purchasable preview when live on-chain quote is unavailable
- cluster-specific production program mapping
- production Solscan URLs without a devnet query suffix

A mainnet deployment must use production-grade RPC infrastructure even though the example environment includes the public Solana endpoint as a bootstrap value.

## Anchor naming

Solana web/runtime libraries use:

```text
mainnet-beta
```

Anchor configuration uses:

```text
mainnet
```

Therefore:

```bash
anchor deploy --provider.cluster mainnet
```

maps to PowerPay runtime cluster `mainnet-beta`.

## Program identity

`Anchor.toml` contains localnet, devnet and mainnet mappings. The same program keypair can use the same program address on more than one cluster, but each deployment must be independently verified.

Do not infer that a program exists on mainnet merely because the address is present in configuration.

## Canonical PWRC mint

PowerPay pins:

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

The sale program rejects any other mint and requires:

- Token-2022 ownership
- 9 decimals
- TransferFeeConfig extension
- active transfer fee = 200 bps / 2%

Before enabling a network, verify that this mint exists and has the required configuration on that cluster.

## Production checklist

For `mainnet-beta`:

1. audited program deployed
2. exact program id configured in client + server mappings
3. canonical PWRC mint verified on-chain
4. treasury verified
5. sale vault funded
6. transfer fee verified at current epoch
7. sale limits and rate reviewed
8. `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true`
9. HTTPS `NEXT_PUBLIC_APP_URL`
10. browser wallet purchase tested with controlled value
11. Solana Pay Scan To Pay tested end-to-end
12. PurchaseReceipt verification tested
13. explorer links confirmed on Mainnet Beta
