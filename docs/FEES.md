# PowerPay fee model

PowerPay separates token-level fees, network fees, and application fees so checkout disclosure matches settlement behavior.

## Canonical PWRC mint

```text
PWRCRXXZxbg6FdQZfK3PMD7KP8xfxs9acvifJiG46wc
```

The sale program, quote service, checkout, send flow, tests, and operator tooling are expected to use this Token-2022 mint.

## PWRC Token-2022 transfer fee

Current policy:

```text
200 basis points / 2%
```

The active Token-2022 fee schedule is evaluated for the current epoch. The actual token fee is bounded by the mint's configured maximum-fee cap:

```text
actual fee = min(gross PWRC × 2%, active maximum fee)
net PWRC   = gross PWRC - actual fee
```

PowerPay quotes the exact expected fee and the program uses checked-fee transfer semantics. If the active fee policy changes between quote review and execution, settlement fails rather than silently accepting different terms.

## Solana network fee

The Solana runtime charges the network fee separately to the transaction fee payer. In the normal Buy PWRC flow, the buyer is the fee payer.

This fee:

- is separate from the SOL purchase amount
- is separate from the PWRC 2% Token-2022 fee
- is not paid to the PowerPay treasury
- depends on the final transaction and network conditions

The wallet is the appropriate place to show the final signature-time network cost.

## PowerPay service fee

Current checkout service fee:

```text
0%
```

PowerPay does not currently add a separate application fee to Buy PWRC transactions.

If a future service fee is introduced, it must be modeled and disclosed explicitly. It must not be hidden inside the PWRC/SOL rate or mislabeled as a network fee.

## Checkout disclosure contract

Before signing, the user should be able to distinguish:

- SOL purchase amount
- gross PWRC
- PWRC Token-2022 fee
- net PWRC
- separate Solana network fee

The executable PWRC/SOL rate remains an on-chain sale-config value; SOL/USD market references are display-only.
