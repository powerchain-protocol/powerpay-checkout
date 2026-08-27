import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 PowerChain. PowerPay.</span>
      <div className="footer-links">
        <Link href={ROUTES.termsOfSale}>Terms of sale</Link>
        <Link href={ROUTES.cookies}>Cookies</Link>
        <Link href={ROUTES.disclaimer}>Disclaimer</Link>
      </div>
    </footer>
  );
}
