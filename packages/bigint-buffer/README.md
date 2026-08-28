# bigint-buffer compatibility package

Private, pure-JavaScript compatibility implementation used only while legacy Solana Web3.js v1 dependencies still request the abandoned `bigint-buffer` package.

The upstream package has a published high-severity `toBigIntLE()` memory-safety advisory and no official patched release. This workspace implementation does **not** reuse the vulnerable native binding: it validates Buffer inputs, rejects invalid widths, rejects values that do not fit the requested output width, and has no install/native build scripts.

Exports preserved for compatibility:

- `toBigIntLE(buf)`
- `toBigIntBE(buf)`
- `toBufferLE(num, width)`
- `toBufferBE(num, width)`

This is a temporary compatibility boundary. The strategic fix is to remove legacy `@solana/web3.js` v1 consumers in favor of `@solana/kit` and modern generated clients, then delete this package and override.
