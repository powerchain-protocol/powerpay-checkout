import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PowerPayLogo } from "@/components/powerpay-logo";

export default function NotFound() {
  return (
    <main className="shell centered">
      <section className="panel state-card">
        <PowerPayLogo />
        <div>
          <span className="section-kicker">404</span>
          <h1>Page not found</h1>
          <p className="eyebrow">The PowerPay route you requested does not exist.</p>
        </div>
        <Link className="primary-button" href="/checkout"><ArrowLeft size={17} />Return to checkout</Link>
      </section>
    </main>
  );
}
