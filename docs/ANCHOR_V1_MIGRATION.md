# Anchor v1 migration — PowerPay

PowerPay v1.5.0 migrates the PWRC sale workspace from Anchor 0.32.1 to **Anchor 1.1.2** and pins the recommended **Solana 3.1.10** toolchain.

## Dependency migration

```text
Rust
anchor-lang = =1.1.2
anchor-spl  = =1.1.2

TypeScript
@coral-xyz/anchor  →  @anchor-lang/core@1.1.2

Toolchain
Anchor CLI 1.1.2
Solana CLI 3.1.10
Node >=20.18
Rust >=1.89
```

`@coral-xyz/anchor` is intentionally removed. Anchor v1 renamed the TypeScript package to `@anchor-lang/core`. The current Anchor TypeScript client remains compatible with the legacy `@solana/web3.js` v1 line used by PowerPay.

## CPI migration

Anchor v1 removed the redundant program `AccountInfo` from `CpiContext`. CPI construction now receives the target program ID. PowerPay therefore uses:

```rust
CpiContext::new(anchor_lang::system_program::ID, accounts)
CpiContext::new_with_signer(anchor_spl::token_2022::ID, accounts, signer_seeds)
```

The Token-2022 `TransferCheckedWithFee` account set still includes `token_program_id` because the SPL transfer-fee wrapper uses it when building/invoking the extension instruction.

## Existing deployed program: IDL migration gate

**Do this before upgrading any deployed Anchor 0.32.x program that already has a legacy IDL account:**

1. Keep/use the Anchor **0.32.1 CLI**.
2. Record/export the existing IDL and deployment metadata.
3. Close the legacy on-chain IDL account using the old CLI while the old program still exposes the legacy IDL management instructions.
4. Switch the workspace/toolchain to Anchor 1.1.2.
5. `anchor build` and regenerate the IDL/types.
6. Run the full devnet/staging suite, including quote binding, single-use receipt replay rejection, 2% fee enforcement and Solana Pay confirmation.
7. Upgrade the program binary with the existing upgrade authority.
8. Publish/upgrade the v1 IDL through Anchor's Program Metadata flow.
9. Verify the deployed bytecode and only then enable the sale.

Skipping step 3 can strand the legacy IDL account after the v1 binary removes the old IDL management instructions.

## Program data compatibility

The `SaleConfig` data layout is unchanged by the Anchor framework migration. PowerPay's newer `buy_pwrc` instruction and `PurchaseReceipt` PDA must still be deployed and its regenerated IDL/client artifacts must match the web transaction builder before checkout is enabled.

## Release commands

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

For Anchor v1 local testing, Surfpool is the default backend. Use `anchor test --validator legacy` only when intentionally retaining `solana-test-validator`.
