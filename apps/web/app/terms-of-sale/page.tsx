import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Sale",
  description: "PowerPay terms governing PWRC purchases with SOL.",
};

export default function TermsOfSalePage() {
  return (
    <LegalPage title="Terms of Sale" intro="These terms describe the PowerPay checkout flow for acquiring PWRC with SOL. They should be reviewed together with the deployment-specific legal and compliance documentation.">
      <section><h2>1. Transaction mechanics</h2><p>PowerPay prepares a Solana transaction for your wallet to review and sign. A purchase is complete only after the relevant transaction is accepted by the Solana network and the PWRC delivery instruction succeeds.</p></section>
      <section><h2>2. Pricing and quotes</h2><p>The executable PWRC amount is determined by the configured on-chain sale program. Pyth and Birdeye SOL/USD data shown in the interface are reference market data for display and reconciliation; they do not override the authoritative on-chain sale configuration.</p></section>
      <section><h2>3. Fees</h2><p>Your wallet may charge or estimate Solana network fees. PWRC may also apply Token-2022 transfer-fee behavior configured at the mint level. PowerPay displays the gross amount, transfer fee, and expected wallet receipt when the required mint data is available.</p></section>
      <section><h2>4. Finality and refunds</h2><p>Blockchain transactions are generally irreversible once confirmed. A failed or rejected transaction does not constitute a completed purchase. Any refund process, if offered for a specific sale, must follow the separate policy published for that deployment.</p></section>
      <section><h2>5. Eligibility</h2><p>You are responsible for ensuring that your use of PowerPay and acquisition of PWRC is lawful in your jurisdiction and compatible with any restrictions applicable to you.</p></section>
      <section><h2>6. Availability</h2><p>The sale may be paused, limited, or unavailable because of program configuration, inventory, network conditions, compliance controls, maintenance, or upstream service failures.</p></section>
    </LegalPage>
  );
}
