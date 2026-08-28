# Anchor v1 migration

PowerPay's current program workspace is already migrated to **Anchor 1.1.2** and **Solana CLI 3.1.10**.

## Current dependency set

```text
Rust
anchor-lang = =1.1.2
anchor-spl  = =1.1.2

TypeScript
@anchor-lang/core = 1.1.2

Toolchain
Anchor CLI = 1.1.2
Solana CLI = 3.1.10
Rust       >= 1.89
Node       >= 20.18
```

The legacy `@coral-xyz/anchor` TypeScript client is intentionally absent.

## CPI changes already applied

Anchor v1 CPI construction uses the target program ID in `CpiContext`. PowerPay's program uses the v1-compatible construction for System Program and Token-2022 CPIs.

The Token-2022 transfer path continues to use exact checked-fee semantics and the canonical PWRC mint invariant.

## Legacy deployed-program migration gate

This section applies **only** when upgrading an already-deployed Anchor 0.32.x PowerPay program that still owns a legacy on-chain IDL account.

Before installing the v1 binary:

1. use Anchor CLI `0.32.1`
2. export/record existing IDL and deployment metadata
3. close the legacy on-chain IDL account while the old binary still exposes legacy IDL management instructions
4. switch the local workspace/toolchain to Anchor `1.1.2`
5. build and regenerate IDL/types
6. run the full devnet/staging suite
7. upgrade the program binary with the existing upgrade authority
8. publish/update v1 IDL metadata using the current Anchor flow
9. verify deployed program id, bytecode, IDL/types, sale config, and receipt decoding
10. only then re-enable checkout

Skipping the legacy-IDL close step can strand the old IDL account after the v1 binary removes the legacy instructions.

## Program-data compatibility

The framework migration does not by itself require a `SaleConfig` data-layout migration in this repository. However, the deployed binary, generated IDL/types, and web transaction builder must always agree on the current `buy_pwrc` account and argument layout.

## Validation

```bash
node --version
rustc --version
solana --version
anchor --version
pnpm --version

pnpm run doctor
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
cargo fmt --check
anchor build
anchor test
```

For an upgraded deployed program, additionally verify:

- canonical PWRC mint
- 200 bps active fee
- exact fee calculation
- quote binding
- one-time receipt creation
- replay rejection
- browser-wallet purchase
- Solana Pay purchase/status resolution
