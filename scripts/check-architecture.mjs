import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const web = join(root, "apps/web");
const failures = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(path);
  }
  return out;
}

for (const file of await walk(web)) {
  const source = await readFile(file, "utf8");
  const name = relative(root, file);
  if (/<a\b[^>]*href=["']\/(?!\/)/.test(source)) failures.push(`${name} uses a raw internal <a>; use next/link for client transitions`);
  if (/window\.location\.(?:href|assign)\s*=\s*["']\//.test(source)) failures.push(`${name} forces an internal full-page reload; use next/navigation`);
}

const publicNav = await readFile(join(web, "components/public-navigation.tsx"), "utf8");
if (!publicNav.includes('from "next/link"')) failures.push("Public navigation must use Next.js Link transitions");
if (!publicNav.includes("aria-current")) failures.push("Public navigation must preserve route-aware aria-current");
for (const [token, label] of [
  ['role="dialog"', "dialog semantics"],
  ['aria-modal="true"', "aria-modal semantics"],
  ['event.key === "Escape"', "Escape-to-close"],
  ['document.body.style.overflow = "hidden"', "background scroll locking"],
  ['triggerRef.current ?? previousActive', "focus restoration"],
  ['event.key !== "Tab"', "keyboard focus trapping"],
]) {
  if (!publicNav.includes(token)) failures.push(`Public navigation must preserve ${label}`);
}
for (const required of [
  "constants/price-rates.ts",
  "data/fetch-data.ts",
  "lib/solana/rpc.ts",
  "lib/solana/solana.ts",
  "lib/api/http.ts",
]) {
  const exists = (await walk(web)).some((file) => file.endsWith(required));
  if (!exists) failures.push(`Missing architecture boundary: ${required}`);
}

if (failures.length) {
  console.error("Architecture guard failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("✓ Architecture guard passed");
