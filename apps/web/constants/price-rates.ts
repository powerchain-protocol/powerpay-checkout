export const BASIS_POINTS_DENOMINATOR = 10_000;

/** Canonical PowerPay service fee applied to the SOL purchase amount. */
export const POWERPAY_SERVICE_FEE_BPS = 200;
export const POWERPAY_SERVICE_FEE_PERCENT = POWERPAY_SERVICE_FEE_BPS / 100;

/** Canonical PWRC Token-2022 transfer-fee policy. */
export const PWRC_TRANSFER_FEE_BPS = 200;
export const PWRC_TRANSFER_FEE_PERCENT = PWRC_TRANSFER_FEE_BPS / 100;

export const PRICE_SOURCE_PRIORITY = ["pyth", "birdeye", "fallback"] as const;
export const PRICE_PAIR = "SOL/USD" as const;
export const SOL_NETWORK_FEE_BUFFER_SOL = 0.00002;

export function basisPointsAmount(amount: number, basisPoints: number) {
  return amount * (basisPoints / BASIS_POINTS_DENOMINATOR);
}

export function serviceFeeSol(purchaseSol: number) {
  return basisPointsAmount(purchaseSol, POWERPAY_SERVICE_FEE_BPS);
}

export function totalBeforeNetworkFeeSol(purchaseSol: number) {
  return purchaseSol + serviceFeeSol(purchaseSol);
}
