# Dependency policy

PowerPay uses pnpm 11 with two independent fail-closed controls: dependency build-script approval and browser-only peer installation policy.

## Build-script decisions

| Package | Decision | Rationale |
| --- | --- | --- |
| `bufferutil` | allow | Reviewed optional native WebSocket accelerator. |
| `utf-8-validate` | allow | Reviewed optional native WebSocket validation helper. |
| `bigint-buffer` | **not approved / no script** | Replaced by the private pure-JS workspace implementation; it has no install or native build script. |

Never enable `dangerouslyAllowAllBuilds`.

## Browser-only peer policy

`@solana/wallet-adapter-react` reaches the Solana mobile adapter, which declares a `react-native` peer. PowerPay is a browser checkout and does not execute the React Native export.

`pnpm-workspace.yaml` therefore sets:

```yaml
autoInstallPeers: false
peerDependencyRules:
  ignoreMissing:
    - react-native
```

This prevents the unused React Native → Metro → `image-size` dependency chain from being installed. It is a targeted graph-pruning rule, not a blanket peer-dependency bypass.

## Security convergence

```yaml
overrides:
  bigint-buffer: $bigint-buffer
  uuid: 11.1.1
```

- `bigint-buffer` resolves to `packages/bigint-buffer`, a private pure-JS compatibility implementation with explicit input and width bounds checks.
- `uuid` converges on patched `11.1.1` for compatibility with older CommonJS consumers.
- Mocha/`ts-mocha`/Chai are not used; deterministic invariant tests use Node's built-in test runner, removing the `serialize-javascript` development chain.

## Lockfile gate

After a dependency-policy change, regenerate the lockfile in a network-enabled environment and inspect the graph:

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

Expected state:

- no `image-size` path
- no `serialize-javascript` path
- `bigint-buffer` resolves to the local workspace package
- any `uuid` resolution is `11.1.1` or a later explicitly reviewed patched line

Commit `pnpm-lock.yaml`, then verify:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```
