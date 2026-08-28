import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const canonicalPwrcMint = "PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc";
const canonicalVersion = "1.0.0";
const requiredFiles = [
  ".env.example",
  "apps/web/.env.example",
  "package.json",
  "apps/web/package.json",
  "pnpm-workspace.yaml",
  "Anchor.toml",
  "programs/pwrc-sale/Cargo.toml",
  "programs/settlements/Cargo.toml",
  "programs/settlements/src/lib.rs",
  "apps/web/constants/price-rates.ts",
  "apps/web/data/fetch-data.ts",
  "apps/web/lib/solana/rpc.ts",
  "apps/web/lib/solana/solana.ts",
  "apps/web/lib/api/http.ts",
  "apps/web/lib/websocket/guard.ts",
  "apps/web/components/public-navigation.tsx",
  "apps/web/context/wallet-balance-context.tsx",
  "apps/web/context/system-health-context.tsx",
  "apps/web/app/api/system/health/route.ts",
  "apps/web/components/system-status.tsx",
  "apps/web/components/app-shell.tsx",
];

let failed = false;

for (const relative of requiredFiles) {
  try {
    await access(resolve(root, relative), constants.R_OK);
    console.log(`ok    ${relative}`);
  } catch {
    console.error(`fail  ${relative} is missing or unreadable`);
    failed = true;
  }
}

try {
  await access(resolve(root, "pnpm-lock.yaml"), constants.R_OK);
  console.log("ok    pnpm-lock.yaml is present");
} catch {
  console.warn("warn  pnpm-lock.yaml is not present; run pnpm install and commit the generated lockfile before the frozen-lockfile release gate");
}

const [major, minor] = process.versions.node.split(".").map(Number);
const nodeSupported = major > 20 || (major === 20 && minor >= 18);
if (!nodeSupported) {
  console.error(`fail  Node ${process.versions.node}; PowerPay requires Node >=20.18`);
  failed = true;
} else {
  console.log(`ok    Node ${process.versions.node}`);
}

const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
console.log(`info  packageManager ${pkg.packageManager ?? "not declared"}`);
if (pkg.version !== canonicalVersion) {
  console.error(`fail  package version must be canonical ${canonicalVersion}`);
  failed = true;
} else {
  console.log(`ok    canonical PowerPay version ${canonicalVersion}`);
}
const webPkg = JSON.parse(await readFile(resolve(root, "apps/web/package.json"), "utf8"));
if (webPkg.version !== canonicalVersion) {
  console.error(`fail  web package version must be canonical ${canonicalVersion}`);
  failed = true;
} else {
  console.log(`ok    web package version ${canonicalVersion}`);
}
if (pkg.devDependencies?.["@anchor-lang/core"] !== "1.1.2") {
  console.error("fail  @anchor-lang/core must be pinned to 1.1.2 for this release");
  failed = true;
} else {
  console.log("ok    @anchor-lang/core 1.1.2");
}
if (pkg.devDependencies?.["@coral-xyz/anchor"]) {
  console.error("fail  legacy @coral-xyz/anchor must be removed after the Anchor v1 migration");
  failed = true;
} else {
  console.log("ok    legacy @coral-xyz/anchor is absent");
}

const workspace = await readFile(resolve(root, "pnpm-workspace.yaml"), "utf8");
for (const name of ["bufferutil", "utf-8-validate"]) {
  if (!new RegExp(`^\\s*${name}:\\s*(?:true|false)\\s*$`, "m").test(workspace)) {
    console.error(`fail  ${name} does not have an explicit build policy`);
    failed = true;
  }
}
if (/^\s*bigint-buffer:\s*true\s*$/m.test(workspace)) {
  console.error("fail  local pure-JS bigint-buffer replacement must not be approved for dependency build scripts");
  failed = true;
}
if (!/autoInstallPeers:\s*false/.test(workspace) || !/react-native/.test(workspace)) {
  console.error("fail  browser-only peer policy must prevent unused React Native auto-installation");
  failed = true;
}
if (!/uuid:\s*11\.1\.1/.test(workspace) || !/bigint-buffer:\s*\$bigint-buffer/.test(workspace)) {
  console.error("fail  dependency security overrides are missing");
  failed = true;
}
if (!failed) console.log("ok    dependency build / peer / security override policy is explicit and fail-closed");

for (const relative of [".env.example", "apps/web/.env.example"]) {
  const envTemplate = await readFile(resolve(root, relative), "utf8");
  if (!envTemplate.includes(`NEXT_PUBLIC_PWRC_MINT=${canonicalPwrcMint}`)) {
    console.error(`fail  ${relative} does not pin the canonical PWRC mint`);
    failed = true;
  } else {
    console.log(`ok    ${relative} canonical PWRC mint`);
  }
  for (const variable of [
    "NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET",
    "NEXT_PUBLIC_SOLANA_RPC_URL_MAINNET_BETA",
    "NEXT_PUBLIC_POWERPAY_PROGRAM_ID_DEVNET",
    "NEXT_PUBLIC_POWERPAY_PROGRAM_ID_MAINNET_BETA",
    "SOLANA_RPC_URL_DEVNET",
    "SOLANA_RPC_URL_MAINNET_BETA",
    "POWERPAY_PROGRAM_ID_DEVNET",
    "POWERPAY_PROGRAM_ID_MAINNET_BETA",
    "POWERPAY_ENABLE_MAINNET_BETA",
  ]) {
    if (!envTemplate.includes(`${variable}=`)) {
      console.error(`fail  ${relative} is missing ${variable}`);
      failed = true;
    }
  }
}


const nextConfig = await readFile(resolve(root, "apps/web/next.config.ts"), "utf8");
for (const header of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Robots-Tag"]) {
  if (!nextConfig.includes(header)) {
    console.error(`fail  apps/web/next.config.ts is missing ${header}`);
    failed = true;
  }
}
if (nextConfig.includes("optimizePackageImports")) {
  console.error("fail  experimental optimizePackageImports must remain disabled");
  failed = true;
} else {
  console.log("ok    Next.js production headers / stable package optimization policy");
}

const programCargo = await readFile(resolve(root, "programs/pwrc-sale/Cargo.toml"), "utf8");
if (!/^version\s*=\s*"1\.0\.0"$/m.test(programCargo)) {
  console.error("fail  pwrc-sale crate version must be 1.0.0");
  failed = true;
} else {
  console.log("ok    pwrc-sale crate version 1.0.0");
}
for (const crate of ["anchor-lang", "anchor-spl"]) {
  if (!new RegExp(`${crate}\\s*=\\s*\\{[^}]*version\\s*=\\s*"=1\\.1\\.2"`).test(programCargo)) {
    console.error(`fail  ${crate} must be exactly =1.1.2`);
    failed = true;
  }
}
if (!programCargo.includes('rust-version = "1.89"')) {
  console.error("fail  pwrc-sale must declare Rust 1.89 MSRV for Anchor v1");
  failed = true;
} else {
  console.log("ok    Anchor Rust crates 1.1.2 / Rust 1.89 program policy");
}

const programSource = await readFile(resolve(root, "programs/pwrc-sale/src/lib.rs"), "utf8");
for (const required of [
  `pubkey!("${canonicalPwrcMint}")`,
  "REQUIRED_PWRC_TRANSFER_FEE_BPS: u16 = 200",
  "expected_service_fee_bps",
  "total_before_network_fee_lamports",
  "transfer_checked_with_fee",
  "anchor_lang::system_program::ID",
  "anchor_spl::token_2022::ID",
]) {
  if (!programSource.includes(required)) {
    console.error(`fail  program invariant missing: ${required}`);
    failed = true;
  }
}


const settlementSource = await readFile(resolve(root, "programs/settlements/src/lib.rs"), "utf8");
if (!settlementSource.includes("POWERPAY_SERVICE_FEE_BPS: u16 = 200") || !settlementSource.includes("powerpay_service_fee_lamports")) {
  console.error("fail  canonical PowerPay 200 bps service-fee math is missing");
  failed = true;
} else {
  console.log("ok    PowerPay service fee policy 200 bps / 2%");
}

const httpSource = await readFile(resolve(root, "apps/web/lib/api/http.ts"), "utf8");
for (const required of ["MAX_API_REQUEST_BODY_BYTES = 1 * 1024 * 1024", 'headers.set("x-request-id"', 'headers.set("Cache-Control", "no-store']) {
  if (!httpSource.includes(required)) {
    console.error(`fail  API hardening invariant missing: ${required}`);
    failed = true;
  }
}

const rpcSource = await readFile(resolve(root, "apps/web/lib/solana/rpc.ts"), "utf8");
if (!rpcSource.includes("RPC_REQUEST_TIMEOUT_MS = 8_000")) {
  console.error("fail  Solana RPC timeout must remain 8 seconds");
  failed = true;
} else {
  console.log("ok    API/RPC hardening boundaries");
}

const anchorToml = await readFile(resolve(root, "Anchor.toml"), "utf8");
if (!anchorToml.includes('anchor_version = "1.1.2"') || !anchorToml.includes('solana_version = "3.1.10"')) {
  console.error("fail  Anchor.toml toolchain must pin Anchor 1.1.2 and Solana 3.1.10");
  failed = true;
} else {
  console.log("ok    Anchor 1.1.2 / Solana 3.1.10 toolchain policy");
}
if (!anchorToml.includes("[programs.devnet]") || !anchorToml.includes("[programs.mainnet]")) {
  console.error("fail  Anchor.toml must declare both devnet and mainnet program mappings");
  failed = true;
} else {
  console.log("ok    Anchor program mappings: devnet + mainnet-beta");
}

if (failed) process.exit(1);
