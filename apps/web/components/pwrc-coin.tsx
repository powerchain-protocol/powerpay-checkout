import Image from "next/image";
export function PwrcCoin({ large = false }: { large?: boolean }) {
  if (large) return <div className="pwrc-coin-large"><Image src="/assets/brand/powerpay-mark.png" alt="PWRC" width={110} height={110} /></div>;
  return <span className="pwrc-mini"><Image src="/assets/brand/powerpay-mark.png" alt="PWRC" width={28} height={28} /></span>;
}
