"use client";

import { useEffect } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { PowerPayLogo } from "@/components/powerpay-logo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="shell centered">
      <section className="panel state-card" role="alert">
        <PowerPayLogo />
        <span className="state-icon danger"><CircleAlert size={26} /></span>
        <div>
          <span className="section-kicker">Nothing was submitted</span>
          <h1>PowerPay could not load</h1>
          <p className="eyebrow">Your wallet has not been charged and no transaction was created. Retry the application safely.</p>
        </div>
        <button className="primary-button" onClick={reset}><RefreshCw size={17} />Try again</button>
      </section>
    </main>
  );
}
