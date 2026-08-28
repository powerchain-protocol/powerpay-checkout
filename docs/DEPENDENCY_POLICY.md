# Dependency build policy

PowerPay uses pnpm 11 with a fail-closed dependency-build policy. A dependency that introduces an install/build script must receive an explicit decision in `pnpm-workspace.yaml`; unreviewed build scripts stop installation.

## Reviewed decisions

| Package | Decision | Rationale |
| --- | --- | --- |
| `bigint-buffer` | allow | Reviewed dependency in the current lockfile. |
| `bufferutil` | allow | Reviewed native WebSocket accelerator. |
| `utf-8-validate` | allow | Reviewed native WebSocket validation helper. |

These decisions are scoped approvals, not a global permission to execute dependency build scripts.

Do **not** enable `dangerouslyAllowAllBuilds`.

## Review process for a new build script

1. identify the direct/transitive dependency that introduced it
2. inspect the exact package/version and install script
3. determine whether the native build is required for correctness or only optimization
4. add an explicit `true` or `false` decision to `pnpm-workspace.yaml`
5. regenerate/commit the lockfile when dependency state changes
6. verify a frozen install succeeds

## Transitive deprecation warnings

`glob@10.5.0` and `uuid@8.3.2` may appear as transitive deprecation warnings in the current graph. They are not the cause of `ERR_PNPM_IGNORED_BUILDS`.

Prefer upgrading the upstream dependency that owns a deprecated transitive package. Avoid unsafe root overrides solely to silence warnings.

## Reproducible install

Initial network-enabled setup:

```bash
pnpm run doctor
pnpm run setup:env
pnpm install
```

Release verification:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```
