# PowerPay build notes

## Validation performed in this workspace

- Added responsive `components/mobile.tsx` and wired it into the checkout.
- Added server-only Pyth + Birdeye SOL/USD market-data adapters and `/api/market/sol-usd`.
- Added market price React context, freshness/deviation indicators, and display-only USD valuation.
- Split public and server environment handling under `apps/web/env/`.
- Added shared constants, utilities/helpers, typed API errors, and route error/loading boundaries.
- Added Terms of Sale, Cookie Notice, and Disclaimer routes.
- Updated README and architecture/price-data documentation.
- Parsed every `.ts` / `.tsx` source file with the TypeScript compiler API: no syntax errors found.

## Environment limitation

A complete dependency installation and Next.js/Anchor build could not be executed in this container because DNS resolution to `registry.npmjs.org` fails (`EAI_AGAIN`). The container has Node 22 and a global TypeScript compiler, but project packages are not installed.

Run these release checks in a network-enabled environment:

```bash
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install
pnpm typecheck
pnpm build
anchor build
anchor test
```

For live market-data verification, configure server-side `PYTH_API_KEY` and `BIRDEYE_API_KEY`, then inspect:

```bash
curl http://localhost:3000/api/market/sol-usd
```

For staging/production, also set `POWERPAY_REQUIRE_ONCHAIN_QUOTE=true`, use a private RPC, configure a public HTTPS `NEXT_PUBLIC_APP_URL`, and verify the deployed sale program, mint, treasury, inventory, transfer-fee behavior, and legal/compliance configuration before enabling sales.
