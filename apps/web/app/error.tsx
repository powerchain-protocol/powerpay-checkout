"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="shell centered">
      <CircleAlert size={34} />
      <h1>PowerPay could not load</h1>
      <p className="eyebrow">No transaction was submitted. You can safely retry the page.</p>
      <button className="primary-button" onClick={reset}>Try again</button>
    </main>
  );
}
