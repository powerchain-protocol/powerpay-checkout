import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const canonicalPwrcMint = "PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc";
const requiredFiles = [
  ".env.example",
  "apps/web/.env.example",
  "package.json",
  "apps/web/package.json",
  "pnpm-workspace.yaml",
  "Anchor.toml",
  "programs/pwrc-sale/Cargo.toml",
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
for (const name of ["bigint-buffer", "bufferutil", "utf-8-validate"]) {
  if (!new RegExp(`^\\s*${name}:\\s*(?:true|false)\\s*$`, "m").test(workspace)) {
    console.error(`fail  ${name} does not have an explicit build policy`);
    failed = true;
  }
}
if (!failed) console.log("ok    dependency build policy is explicit and fail-closed for new packages");

for (const relative of [".env.example", "apps/web/.env.example"]) {
  const envTemplate = await readFile(resolve(root, relative), "utf8");
  if (!envTemplate.includes(`NEXT_PUBLIC_PWRC_MINT=${canonicalPwrcMint}`)) {
    console.error(`fail  ${relative} does not pin the canonical PWRC mint`);
    failed = true;
  } else {
    console.log(`ok    ${relative} canonical PWRC mint`);
  }
}


const programCargo = await readFile(resolve(root, "programs/pwrc-sale/Cargo.toml"), "utf8");
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
  "transfer_checked_with_fee",
  "anchor_lang::system_program::ID",
  "anchor_spl::token_2022::ID",
]) {
  if (!programSource.includes(required)) {
    console.error(`fail  program invariant missing: ${required}`);
    failed = true;
  }
}

const anchorToml = await readFile(resolve(root, "Anchor.toml"), "utf8");
if (!anchorToml.includes('anchor_version = "1.1.2"') || !anchorToml.includes('solana_version = "3.1.10"')) {
  console.error("fail  Anchor.toml toolchain must pin Anchor 1.1.2 and Solana 3.1.10");
  failed = true;
} else {
  console.log("ok    Anchor 1.1.2 / Solana 3.1.10 toolchain policy");
}

if (failed) process.exit(1);
