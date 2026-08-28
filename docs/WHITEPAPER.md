# PowerPay 1.0.0 — Technical Whitepaper

**Solana-native PWRC Checkout & Settlement**

> Canonical PWRC Token-2022 mint: `PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc`

PowerPay is a Solana-native checkout and settlement application for acquiring PWRC with SOL. It combines browser-wallet checkout, Solana Pay Scan To Pay, cluster-aware send/receive flows, reference market data, and an Anchor program that enforces executable sale terms on-chain.

The architecture follows one rule: presentation, RPC transport, wallet discovery, and market-data providers can improve user experience, but they cannot redefine settlement. The deployed PowerPay program, SaleConfig PDA, canonical PWRC mint, buyer wallet signature, and Solana runtime remain authoritative.

## 1. Executive summary

PowerPay 1.0.0 provides:

- Buy PWRC with SOL through a connected Solana wallet.
- Solana Pay Scan To Pay with expiring transaction-request QR codes.
- Wallet Standard discovery and a PowerPay-owned connection modal.
- Devnet and Mainnet Beta execution modes with explicit TEST/LIVE states.
- SOL and PWRC send/receive flows.
- Token-2022 fee validation requiring the active PWRC transfer fee to equal 200 bps / 2%.
- Pyth primary and Birdeye corroborating SOL/USD reference data.
- Quote-bound purchase settlement and replay-resistant PurchaseReceipt PDAs.
- Cluster-aware health, balance, RPC, security, and accessibility controls.

## 2. Product thesis

A checkout should be simple for the buyer and exact for the protocol. PowerPay keeps wallet authorization, executable pricing, fee policy, treasury routing, token identity, and settlement evidence explicit.

Core principles:

1. **Settlement authority stays on-chain.** SaleConfig and the deployed program govern executable terms.
2. **Wallet connection is not spending authorization.** Every transfer requires explicit user signature.
3. **Network selection is an execution boundary.** Devnet and Mainnet Beta are resolved through reviewed configuration.
4. **Fees are separated.** PowerPay service fee, PWRC Token-2022 transfer fee, and Solana network fee are distinct.
5. **Reference data is non-authoritative.** Pyth and Birdeye can update USD display but cannot rewrite the PWRC sale rate.
6. **Mainnet fails closed.** Production checkout does not invent executable preview terms if live sale state is unavailable.

## 3. Architecture

```text
Checkout UI
   ↓
Wallet Standard / Solana Pay
   ↓
PowerPay API boundary
   ├─ quote
   ├─ transaction construction
   ├─ status / receipt verification
   └─ runtime health
   ↓
Reviewed Devnet / Mainnet Beta RPC mapping
   ↓
PowerPay Anchor program
   ├─ SaleConfig PDA
   ├─ buy_pwrc
   └─ PurchaseReceipt PDA
   ↓
PWRC Token-2022
```

Pyth and Birdeye sit beside this path as reference-data providers. They are deliberately outside the settlement authority chain.

## 4. Checkout and settlement

The buyer reviews:

- purchase SOL amount;
- 2% PowerPay service fee in SOL;
- executable PWRC-per-SOL rate;
- gross PWRC output;
- 2% PWRC Token-2022 transfer-fee effect;
- minimum net PWRC;
- separate Solana network fee.

The program validates the sale state, canonical mint, Token-2022 configuration, active fee basis points, rate, buyer minimum, inventory, and replay-resistant reference before moving value.

## 5. Fee architecture

| Fee | Canonical policy | Treatment |
| --- | --- | --- |
| PowerPay service fee | **2% / 200 bps of purchase SOL** | Transferred atomically to the configured treasury. |
| PWRC Token-2022 transfer fee | **2% / 200 bps** | Applied by Token-2022 to the PWRC transfer, subject to mint extension/max-fee semantics. |
| Solana network fee | Variable | Paid separately by the transaction fee payer. |

Let `P` be the purchase amount in SOL.

```text
service_fee_sol = P × 0.02
gross_pwrc = P × on_chain_pwrc_per_sol_rate
net_pwrc = Token2022Transfer(gross_pwrc, active_fee_policy)
```

The Solana network fee is separate from all three values above.

## 6. PWRC Token-2022 integration

PowerPay pins the canonical PWRC mint instead of accepting a caller-supplied mint.

Required invariants:

- canonical mint address only;
- Token-2022 ownership;
- 9 decimals;
- TransferFeeConfig extension present;
- active transfer fee = 200 bps / 2%;
- buyer destination uses the canonical PWRC associated token account;
- sale vault is bounded by program configuration.

## 7. Wallet and Solana Pay

Wallet Standard is used for wallet discovery. The PowerPay modal distinguishes connection from authorization and implements keyboard focus trapping, Escape-to-close, focus restoration, and background scroll locking.

Solana Pay Scan To Pay uses a cluster-bound transaction request and unique purchase reference. Settlement is confirmed from the program-owned PurchaseReceipt PDA rather than by treating an arbitrary transaction containing a reference as proof of payment.

## 8. Network and RPC model

PowerPay supports exactly:

- `devnet` — testing and integration;
- `mainnet-beta` — real production settlement.

Public requests cannot inject arbitrary RPC URLs or executable program IDs. Server code maps the selected cluster to reviewed configuration.

RPC checks use:

- 8-second timeout;
- defensive JSON parsing;
- explicit checking/ok/error states;
- latency reporting;
- response-size limits;
- messaging that a read RPC cannot change settlement authority.

## 9. Price and market-data layer

Pyth is the primary SOL/USD reference source. Birdeye can corroborate or provide fallback display data where configured.

This layer may expose:

- reference SOL/USD value;
- provider/source identity;
- freshness timestamp;
- stale state;
- cross-source divergence in basis points.

It must never change the executable PWRC-per-SOL rate stored in SaleConfig.

## 10. Program and receipt model

### SaleConfig PDA

Controls:

- authority;
- SOL treasury;
- PWRC mint;
- gross PWRC-per-SOL rate;
- min/max purchase limits;
- enabled/paused state;
- sale inventory/vault boundary.

### PurchaseReceipt PDA

Each purchase reference derives a deterministic program-owned receipt. The receipt provides settlement evidence such as buyer, reference, purchase lamports, service fee, gross/net PWRC, transfer-fee basis points, and settlement slot. Creating the receipt with `init` prevents the same reference from settling twice.

## 11. Security and privacy controls

PowerPay applies:

- 1 MiB request-body ceiling;
- sanitized or generated `x-request-id` correlation;
- `Cache-Control: no-store` and `Pragma: no-cache`;
- typed API errors;
- 8-second RPC timeouts and defensive JSON handling;
- `X-Robots-Tag: noindex, nofollow, noarchive` on protected application surfaces;
- `X-Content-Type-Options: nosniff`;
- restrictive referrer and permissions policies;
- Swagger authorization persistence disabled by default;
- WebSocket policy guards for size, authentication failures, subscriptions, rate limits, and close codes;
- static accessibility, security, architecture, and dependency regression checks.

The dependency policy treats new build scripts and vulnerable transitive chains as supply-chain boundaries. Lockfile regeneration, audit checks, and reviewed build-script approvals are release requirements.

## 12. Operational readiness

`/api/system/health` can verify:

- selected RPC reachability and latency;
- deployed program presence/executability;
- initialized SaleConfig;
- canonical PWRC mint ownership;
- active 2% Token-2022 fee policy;
- sale enabled/paused state;
- sale-vault inventory availability.

Health is informational. It does not bypass transaction or program invariants.

## 13. Developer and deployment model

Representative stack:

- Next.js 16;
- React 19;
- TypeScript 5.9;
- pnpm 11;
- Wallet Standard;
- `@solana/web3.js`, `@solana/pay`, `@solana/kit`;
- Anchor 1.1.x / Rust;
- Token-2022;
- Pyth + Birdeye.

Release gates include frozen-lockfile installation, doctor/static checks, TypeScript typecheck, Next.js build, Anchor build/test, Devnet end-to-end settlement, and controlled Mainnet verification after approval.

## 14. Risks and disclaimer

Public blockchains, wallets, RPC providers, smart contracts, digital assets, oracles, and third-party services can fail or change. Mainnet transactions can be irreversible. PWRC utility, liquidity, pricing, transferability, and legal treatment can change, and no appreciation or return is guaranteed.

This whitepaper is technical documentation only. It is not financial, investment, tax, accounting, or legal advice; it is not a prospectus or an offer to sell securities. Users should review the applicable Terms of Sale and independent professional advice before transacting.

## 15. Roadmap

Priority areas include independent program review, stronger invariant testing, merchant checkout intents, richer receipts, historical market-data provenance, Mainnet treasury observability, deployment attestations, compact mobile review, and renewable-energy storefront integrations.

## 16. Conclusion

PowerPay 1.0.0 connects familiar checkout UX to explicit Solana settlement. The buyer controls the wallet signature; the selected Solana cluster controls execution; the sale program controls executable terms and treasury routing; Token-2022 controls the PWRC transfer-fee behavior; and PurchaseReceipt PDAs provide deterministic settlement evidence.

That separation lets the product evolve without granting presentation, RPC, or market-data layers the ability to rewrite settlement.
