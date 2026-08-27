export function compactAddress(value?: string | null, front = 4, back = 4) {
  if (!value) return "Not connected";
  if (value.length <= front + back + 3) return value;
  return `${value.slice(0, front)}…${value.slice(-back)}`;
}

export function formatNumber(value: number, maximumFractionDigits = 6) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

export function parsePositiveNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function decimalToRaw(value: string, decimals: number) {
  const input = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(input)) throw new Error("Invalid decimal amount");
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) throw new Error(`Amount supports at most ${decimals} decimal places`);
  const scale = 10n ** BigInt(decimals);
  const frac = (fraction.slice(0, decimals) + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * scale + BigInt(frac || "0");
}
