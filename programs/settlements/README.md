# PowerPay Settlements

Pure Rust settlement math shared by the on-chain PowerPay programs. It deliberately contains no private keys, RPC logic, or mutable configuration.

Canonical invariants:

- purchase amount is denominated in lamports;
- PowerPay service fee is **200 bps (2%)** of the purchase amount, rounded up to the nearest lamport;
- Solana network fees are charged separately by the runtime to the transaction fee payer;
- PWRC Token-2022 separately enforces its own **200 bps (2%)** transfer fee;
- PWRC output is quoted from the base purchase amount, not from the service fee.
