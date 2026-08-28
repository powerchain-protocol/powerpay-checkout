import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const webRoot = join(root, "apps/web");
const issues = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", ".next", "dist", "target"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

for (const file of await walk(webRoot)) {
  const extension = extname(file);
  if (![".tsx", ".jsx", ".css"].includes(extension)) continue;
  const text = await readFile(file, "utf8");
  const name = relative(root, file);

  if (extension !== ".css") {
    for (const match of text.matchAll(/href\s*=\s*["']#["']/g)) {
      issues.push(`${name}:${lineAt(text, match.index ?? 0)} dead href="#"`);
    }

    for (const match of text.matchAll(/<img\b[^>]*>/gsi)) {
      if (!/\balt\s*=/.test(match[0])) {
        issues.push(`${name}:${lineAt(text, match.index ?? 0)} <img> is missing alt`);
      }
    }

    for (const match of text.matchAll(/<a\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gsi)) {
      const tag = match[0];
      const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
      if (!/\b(noopener|noreferrer)\b/i.test(rel)) {
        issues.push(`${name}:${lineAt(text, match.index ?? 0)} target="_blank" is missing rel="noopener" or rel="noreferrer"`);
      }
    }
  } else {
    for (const match of text.matchAll(/([^{}]+)\{([^{}]*outline\s*:\s*(?:none|0)\s*;[^{}]*)\}/gsi)) {
      const selector = match[1].trim();
      const body = match[2];
      if (/focus-visible/.test(selector) && !/(box-shadow|outline-offset|border-color)/.test(body)) {
        issues.push(`${name}:${lineAt(text, match.index ?? 0)} focus-visible removes outline without a visible replacement`);
      }
    }
  }
}

if (issues.length) {
  console.error("Accessibility regression check failed:\n" + issues.map((issue) => `- ${issue}`).join("\n"));
  process.exit(1);
}

console.log("✓ Accessibility regression check passed");
