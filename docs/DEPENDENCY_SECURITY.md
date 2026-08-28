# Dependency security

PowerPay treats the lockfile as release input. A clean manifest without a regenerated lockfile is not considered remediated.

## August 2026 Dependabot remediation

| Finding | Status in this source | Remediation |
| --- | --- | --- |
| `image-size` ICNS infinite-loop DoS | removed from intended browser dependency graph | Disable pnpm automatic peer installation so the unused `react-native` → Metro → `image-size` subtree is not installed. Ignore only the missing `react-native` peer required by the native wallet export. |
| `image-size` JXL/HEIF infinite-loop DoS | removed from intended browser dependency graph | Same graph-pruning control. Upstream currently has no published patched `image-size` release, so pinning cannot safely solve this alert. |
| `bigint-buffer@1.1.5` buffer-overflow/DoS | replaced | `packages/bigint-buffer` is a private pure-JS compatibility implementation at version `1.1.6`; pnpm overrides all transitive requests to this workspace package. No native binding or install script remains. |
| `serialize-javascript` RCE | removed | The Mocha/`ts-mocha` stack was removed. Tests use Node's built-in test runner, so `serialize-javascript` is no longer required. |
| `serialize-javascript` CPU-exhaustion DoS | removed | Same removal. |
| `uuid` bounds-check issue | converged | pnpm override pins `uuid` to `11.1.1`, the patched 11.x line suitable for legacy CommonJS consumers. |

## Why `image-size` is removed instead of overridden

The vulnerable `image-size` package is not part of PowerPay application functionality. It arrives through pnpm's automatic installation of the `react-native` peer declared by the Solana Mobile Wallet Adapter, which is itself a dependency of the legacy React wallet adapter. PowerPay uses the browser export, not the React Native export.

`autoInstallPeers: false` plus an explicit `peerDependencyRules.ignoreMissing` entry for `react-native` prevents pnpm from materializing the unused native toolchain. This is preferable to installing an unofficial `image-size` fork solely to satisfy a package path that PowerPay does not execute.

## Lockfile regeneration

After applying these changes, regenerate the lockfile from the repository root:

```bash
rm -rf node_modules apps/web/node_modules
pnpm install --no-frozen-lockfile
pnpm run check:dependency-security
pnpm why image-size
pnpm why serialize-javascript
pnpm why bigint-buffer
pnpm why uuid
pnpm audit --audit-level=moderate
```

Expected results:

- `pnpm why image-size` returns no dependency path.
- `pnpm why serialize-javascript` returns no dependency path.
- `pnpm why bigint-buffer` resolves to the local workspace `1.1.6` compatibility package.
- any resolved `uuid` is `11.1.1` or a later explicitly reviewed patched line.
- the audit contains no open findings corresponding to Dependabot alerts #1, #3, #4, #5, #6, or #7.

Then commit `pnpm-lock.yaml` and validate reproducibility:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
anchor build
anchor test
```

## Strategic endpoint

The in-repository `bigint-buffer` compatibility package is a bridge, not the architecture target. PowerPay should progressively move browser and server transaction construction from legacy `@solana/web3.js` v1 / `@solana/spl-token` APIs to `@solana/kit` and current generated program clients. Once no dependency requires `bigint-buffer`, remove the compatibility package and its override.
