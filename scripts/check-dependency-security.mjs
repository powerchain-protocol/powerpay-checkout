import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const lockPath = path.join(root, "pnpm-lock.yaml");
const errors = [];
const warnings = [];

function compareVersion(a, b) {
  const av = a.split(".").map(Number);
  const bv = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (av[i] !== bv[i]) return av[i] < bv[i] ? -1 : 1;
  }
  return 0;
}

function packageVersions(lock, packageName) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s{2}['\"]?${escaped}@(\\d+\\.\\d+\\.\\d+)(?:[^'\"\\n:]*)?['\"]?:`, "gm");
  return [...lock.matchAll(pattern)].map((match) => match[1]);
}

if (!fs.existsSync(lockPath)) {
  const message = "pnpm-lock.yaml is not present; generate and commit it before release.";
  if (process.env.CI) errors.push(message);
  else warnings.push(message);
} else {
  const lock = fs.readFileSync(lockPath, "utf8");

  for (const version of packageVersions(lock, "bigint-buffer")) {
    if (compareVersion(version, "1.1.5") <= 0) {
      errors.push(`forbidden vulnerable lockfile entry: bigint-buffer@${version} (upstream has no patched release)`);
    }
  }

  for (const version of packageVersions(lock, "image-size")) {
    if (compareVersion(version, "2.0.2") <= 0) {
      errors.push(`forbidden vulnerable lockfile entry: image-size@${version} (all published <=2.0.2 releases are affected)`);
    }
  }

  for (const version of packageVersions(lock, "serialize-javascript")) {
    if (compareVersion(version, "7.0.5") < 0) {
      errors.push(`forbidden vulnerable lockfile entry: serialize-javascript@${version}; require >=7.0.5 if reintroduced`);
    }
  }

  for (const version of packageVersions(lock, "uuid")) {
    const vulnerable = compareVersion(version, "11.1.1") < 0 || version === "12.0.0" || version === "13.0.0";
    if (vulnerable) errors.push(`forbidden vulnerable lockfile entry: uuid@${version}`);
  }

  if (/^\s{2}['\"]?react-native@/m.test(lock) || /^\s{2}['\"]?metro@/m.test(lock)) {
    errors.push("unused React Native/Metro dependency subtree is present in the browser checkout lockfile");
  }

  if (!/bigint-buffer:\s*\n\s*specifier:\s*workspace:/m.test(lock) && !/bigint-buffer:\s*\$bigint-buffer/m.test(lock)) {
    warnings.push("verify the transitive bigint-buffer override resolves to packages/bigint-buffer after regenerating the lockfile");
  }
}

const workspace = fs.readFileSync(path.join(root, "pnpm-workspace.yaml"), "utf8");
if (!/autoInstallPeers:\s*false/.test(workspace)) errors.push("autoInstallPeers must remain false for the browser-only wallet stack");
if (!/peerDependencyRules:[\s\S]*ignoreMissing:[\s\S]*react-native/.test(workspace)) errors.push("react-native must remain an explicitly ignored browser-unused peer");
if (!/uuid:\s*11\.1\.1/.test(workspace)) errors.push("uuid security convergence must remain pinned to 11.1.1 or a later reviewed patched version");
if (!/bigint-buffer:\s*\$bigint-buffer/.test(workspace)) errors.push("bigint-buffer must resolve through the reviewed workspace replacement");
if (/^\s*bigint-buffer:\s*true\s*$/m.test(workspace)) errors.push("the pure-JS bigint-buffer replacement must not receive native build-script approval");

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
for (const name of ["mocha", "ts-mocha", "chai", "serialize-javascript"]) {
  if (rootPkg.dependencies?.[name] || rootPkg.devDependencies?.[name]) {
    errors.push(`${name} must not be a root dependency in the canonical test stack`);
  }
}

const compatPkg = JSON.parse(fs.readFileSync(path.join(root, "packages/bigint-buffer/package.json"), "utf8"));
if (compatPkg.scripts && Object.keys(compatPkg.scripts).length) errors.push("packages/bigint-buffer must not define install/build scripts");

for (const warning of warnings) console.warn(`[dependency-security] WARN: ${warning}`);
for (const error of errors) console.error(`[dependency-security] ERROR: ${error}`);

if (errors.length) process.exit(1);
console.log("[dependency-security] dependency policy checks passed");
