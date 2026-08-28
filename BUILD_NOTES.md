# PowerPay build notes

## Current validation target

Repository release line: **PowerPay v1.6.0**.

### Toolchain

```text
Node:                     >=20.18
pnpm:                     11.24.0
TypeScript:               5.9.3
Anchor CLI:               1.1.2
anchor-lang:              =1.1.2
anchor-spl:               =1.1.2
Anchor TypeScript client: @anchor-lang/core@1.1.2
Solana CLI:               3.1.10
```

The workspace is migrated off the legacy `@coral-xyz/anchor` TypeScript package.

### Canonical PWRC invariant

```text
Mint:                PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
Decimals:            9
Token program:       Token-2022
Active transfer fee: 200 bps / 2%
PowerPay service fee: 0%
Solana network fee:  separate; transaction fee payer pays it
```

Program and web paths fail closed on a different mint. Program execution also fails if the active Token-2022 fee policy is missing or differs from 200 bps.

## pnpm dependency builds

Reviewed native install scripts are explicit in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  bigint-buffer: true
  bufferutil: true
  utf-8-validate: true
```

Do not use `dangerouslyAllowAllBuilds`. New dependency scripts should remain blocked until individually reviewed.

Transitive deprecation notices such as `glob@10.5.0` or `uuid@8.3.2` are warnings, not reasons to bypass install policy.

## Environment setup

Use:

```bash
pnpm run setup:env
```

instead of manual `cp` commands. It resolves repository paths and does not overwrite existing `.env.local` files.

## Web validation

```bash
pnpm run doctor
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

Next.js notes:

- `experimental.optimizePackageImports` is not required by this project.
- `apps/web/tsconfig.json` includes `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`.
- the wallet UI is implemented in `components/wallet-connect-modal.tsx`.
- `@solana/wallet-adapter-react-ui` is intentionally not required.

## Program validation

```bash
cargo fmt --check
anchor build
anchor test
```

After a program change, regenerate IDL/types and verify the web builder matches the deployed instruction/account layout.

If the predecessor deployment is Anchor 0.32.x and retains a legacy IDL account, complete `docs/ANCHOR_V1_MIGRATION.md` before upgrading the binary.

## Sale validation

Before enabling a sale:

```bash
pnpm sale:inspect
```

Confirm:

- cluster
- deployed program id
- canonical PWRC mint
- 9 decimals
- active 200 bps fee
- current maximum-fee cap
- treasury
- PWRC-per-SOL rate
- min/max limits
- vault inventory
- enabled state

Exercise browser-wallet and Solana Pay purchases on devnet/staging before production enablement.

## Release checklist

The complete ordered release gate is maintained in [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).
