import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PowerPayLogo } from "@/components/powerpay-logo";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-shell">
      <header className="legal-header">
        <PowerPayLogo />
        <Link className="header-link" href="/checkout"><ArrowLeft size={16}/>Checkout</Link>
      </header>
      <article className="panel legal-card">
        <div className="legal-kicker">PowerPay · PowerChain</div>
        <h1>{title}</h1>
        <p className="legal-intro">{intro}</p>
        <div className="legal-content">{children}</div>
        <p className="legal-updated">Last updated: August 27, 2026</p>
      </article>
    </main>
  );
}
