# PowerPay build notes

## v1.3.0 validation target

PowerPay v1.4.0 hardens the Buy PWRC path around the canonical Token-2022 mint and explicit fee semantics.

### Toolchain

- Node: 20+ (project package manager remains `pnpm@11.24.0`)
- TypeScript: 5.9.3
- Anchor CLI / crates / TypeScript package: 0.32.1
- Solana toolchain pinned in `Anchor.toml`: 2.3.0
- `anchor-spl`: 0.32.1 with `associated_token`, `token_2022`, and `token_2022_extensions`

### Canonical PWRC invariant

```text
Mint: PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals: 9
Active Token-2022 transfer fee: 200 bps / 2%
PowerPay checkout service fee: 0%
Solana network fee: separate, paid by transaction fee payer
```

The program and web application fail closed on a different mint. Program instructions also fail if the current Token-2022 fee policy is missing or not exactly 200 bps.

### Dependency builds

The reviewed pnpm workspace explicitly approves:

```yaml
allowBuilds:
  bigint-buffer: true
  bufferutil: true
  utf-8-validate: true
```

Do not use `dangerouslyAllowAllBuilds`. New install scripts should remain blocked until reviewed.

### Release validation

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm run doctor
pnpm run setup:env
pnpm install
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
cargo fmt --check
anchor build
anchor test
```

Before `PWRC_SALE_ENABLED=true`, also run:

```bash
pnpm sale:inspect
```

Confirm the canonical mint, 200 bps active transfer fee, treasury, rate, inventory, limits, cluster, and deployed program id. An upgrade of an existing deployed program should be exercised on devnet/staging before production enablement.


## v1.4 program migration checks

The `buy_pwrc` instruction account/argument layout changed. After `anchor build`, regenerate the IDL/client artifacts and redeploy the upgraded program before enabling checkout. Validate that the web transaction builder and deployed IDL agree on the new quote-binding arguments and `purchase_receipt` account. Existing `SaleConfig` layout is unchanged, so no sale-config data migration is required.

Verify a devnet purchase produces a program-owned `PurchaseReceipt` PDA and that reusing the same reference fails. Confirm the receipt reports the canonical PWRC mint path, 200 bps fee, exact gross/net amounts and expected SOL amount.
