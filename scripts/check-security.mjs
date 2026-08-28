import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const failures = [];

async function text(path) {
  return readFile(join(root, path), "utf8");
}
function requireText(content, needle, label) {
  if (!content.includes(needle)) failures.push(label);
}

const nextConfig = await text("apps/web/next.config.ts");
requireText(nextConfig, "X-Robots-Tag", "next.config.ts must set X-Robots-Tag");
requireText(nextConfig, "noindex, nofollow, noarchive", "X-Robots-Tag must disable indexing/archiving");

const http = await text("apps/web/lib/api/http.ts");
requireText(http, "1 * 1024 * 1024", "API request-body limit must be 1 MiB");
requireText(http, 'headers.set("x-request-id"', "API responses must emit x-request-id");
requireText(http, 'headers.set("Cache-Control", "no-store', "API responses must be no-store");

const swagger = await text("apps/web/lib/api/swagger.ts");
requireText(swagger, "persistAuthorization: false", "Swagger authorization persistence must remain disabled");

const ws = await text("apps/web/lib/websocket/guard.ts");
for (const needle of ["WS_MAX_MESSAGE_BYTES", "WS_MAX_FAILED_AUTH_ATTEMPTS", "WS_MAX_SUBSCRIPTIONS_PER_CONNECTION", "WS_MESSAGES_PER_MINUTE", "WS_POLICY_CLOSE_CODE", "WS_RATE_LIMIT_CLOSE_CODE", "webSocketPolicyClose"]) {
  requireText(ws, needle, `WebSocket guard is missing ${needle}`);
}

const rpc = await text("apps/web/lib/solana/rpc.ts");
requireText(rpc, "RPC_REQUEST_TIMEOUT_MS = 8_000", "Solana RPC timeout must remain 8 seconds");
requireText(rpc, "MAX_RPC_RESPONSE_BYTES = 1 * 1024 * 1024", "Solana RPC response ceiling must remain 1 MiB");

const rates = await text("apps/web/constants/price-rates.ts");
requireText(rates, "POWERPAY_SERVICE_FEE_BPS = 200", "PowerPay service fee must remain pinned at 200 bps");
requireText(rates, "PWRC_TRANSFER_FEE_BPS = 200", "PWRC Token-2022 fee must remain pinned at 200 bps");

const rust = await text("programs/pwrc-sale/src/lib.rs");
requireText(rust, "expected_service_fee_bps", "On-chain buy instruction must bind the reviewed service fee");
requireText(rust, "total_before_network_fee_lamports", "On-chain settlement must charge purchase + service fee atomically");

const apiRoot = join(root, "apps/web/app/api");
async function routeFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await routeFiles(path));
    else if (entry.name === "route.ts") out.push(path);
  }
  return out;
}
for (const file of await routeFiles(apiRoot)) {
  const source = await readFile(file, "utf8");
  const name = relative(root, file);
  if (!source.includes("requestIdFor")) failures.push(`${name} must correlate requests with x-request-id`);
  if (!source.includes("apiJson") && !source.includes("apiEmpty") && !source.includes("errorResponse")) failures.push(`${name} must use hardened API response helpers`);
  if (/export async function POST/.test(source) && !source.includes("readJsonBody")) failures.push(`${name} POST must enforce the 1 MiB JSON body limit`);
}

if (failures.length) {
  console.error("Security validation failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("✓ Security validation passed");
