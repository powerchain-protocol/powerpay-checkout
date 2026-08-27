import Image from "next/image";
import Link from "next/link";

export function PowerPayLogo() {
  return (
    <Link href="/checkout" className="brand" aria-label="PowerPay home">
      <Image src="/assets/brand/powerpay-mark.png" alt="" width={52} height={52} priority />
      <div>
        <div className="brand-word">Power<span>Pay</span></div>
        <div className="brand-sub">Powered by Solana</div>
      </div>
    </Link>
  );
}
