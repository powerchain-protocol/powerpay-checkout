# Dependency Build Policy

PowerPay uses pnpm 11 with the default fail-closed `strictDepBuilds` behavior. A dependency that introduces an install/build script must receive an explicit decision in `pnpm-workspace.yaml`; otherwise installation fails.

## Current reviewed decisions

| Package | Decision | Rationale |
| --- | --- | --- |
| `bigint-buffer` | allow build | Explicitly approved for the reviewed lockfile. |
| `bufferutil` | allow build | Explicitly approved native WebSocket accelerator. |
| `utf-8-validate` | allow build | Explicitly approved native WebSocket validation helper. |

These approvals are explicit and scoped. They are different from globally allowing dependency build scripts. Unreviewed build scripts continue to stop installation.

Do not enable `dangerouslyAllowAllBuilds`. When a new dependency appears, review the exact package/version and then add an explicit `true` or `false` decision.

## Transitive deprecation warnings

`glob@10.5.0` and `uuid@8.3.2` are currently transitive dependencies. They are warnings, not the cause of `ERR_PNPM_IGNORED_BUILDS`. Remove them by upgrading the upstream dependency that owns them when a compatible release is available; avoid forcing an incompatible major through a root override.

## Reproducible install

On the first network-enabled install, run:

```sh
pnpm run doctor
pnpm run setup:env
pnpm install
```

Commit the resulting `pnpm-lock.yaml`, then use:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```
