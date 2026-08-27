import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "PowerPay digital-asset, market-data, custody, and transaction-risk disclaimer.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" intro="PowerPay is a transaction interface for Solana and PWRC. Market information and interface estimates should not be treated as financial, investment, legal, or tax advice.">
      <section><h2>Digital-asset risk</h2><p>Digital assets can be volatile and may lose value. Network congestion, software defects, smart-contract failures, wallet compromise, oracle outages, or regulatory changes may affect availability or outcomes.</p></section>
      <section><h2>Market-data sources</h2><p>Pyth and Birdeye data are third-party observations. PowerPay can compare them for freshness and divergence, but no market-data source is guaranteed to be uninterrupted or error-free.</p></section>
      <section><h2>No custody</h2><p>PowerPay is designed so that the connected wallet signs transactions. The web application should never request or store a wallet seed phrase or private key.</p></section>
      <section><h2>Verify before signing</h2><p>Always verify the destination, amount, token mint, network, program, and wallet prompt before approving a transaction. Do not sign a transaction you do not understand.</p></section>
      <section><h2>Tax and reporting</h2><p>You are responsible for determining and meeting any tax, accounting, disclosure, or reporting obligations that apply to your transactions.</p></section>
    </LegalPage>
  );
}
