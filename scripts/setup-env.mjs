import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const files = [
  [resolve(projectRoot, ".env.example"), resolve(projectRoot, ".env.local")],
  [resolve(projectRoot, "apps/web/.env.example"), resolve(projectRoot, "apps/web/.env.local")],
];

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

for (const [source, target] of files) {
  if (!(await exists(source))) {
    console.error(`Missing environment template: ${source}`);
    console.error("Run this command from the repository root or restore the missing .env.example file.");
    process.exitCode = 1;
    continue;
  }

  if (await exists(target)) {
    console.log(`skip  ${target} (already exists)`);
    continue;
  }

  await copyFile(source, target);
  console.log(`create ${target}`);
}
