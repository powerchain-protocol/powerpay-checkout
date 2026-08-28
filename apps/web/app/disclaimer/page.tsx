import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CANONICAL_PWRC_MINT } from "@/constants/app";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "PowerPay digital-asset, market-data, custody, and transaction-risk disclaimer.",
};

export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" intro="PowerPay is a transaction interface for Solana and PWRC. Market information and interface estimates should not be treated as financial, investment, legal, or tax advice.">
      <section><h2>Digital-asset risk</h2><p>Digital assets can be volatile and may lose value. Network congestion, software defects, smart-contract failures, wallet compromise, oracle outages, or regulatory changes may affect availability or outcomes.</p></section>
      <section><h2>Market-data sources</h2><p>Pyth and Birdeye data are third-party observations. PowerPay can compare them for freshness and divergence, but no market-data source is guaranteed to be uninterrupted or error-free. Market observations do not set the executable on-chain PWRC sale rate.</p></section>
      <section><h2>Canonical PWRC asset</h2><p>The PowerPay application is configured for PWRC mint <code>{CANONICAL_PWRC_MINT}</code> on Solana Token-2022. Verify this mint in your wallet prompt before signing. The program requires the active PWRC Token-2022 transfer-fee basis-point setting to remain 2%; the actual fee may be subject to the mint&apos;s on-chain maximum-fee cap.</p></section>
      <section><h2>No custody</h2><p>PowerPay is designed so that the connected wallet signs transactions. The web application should never request or store a wallet seed phrase or private key.</p></section>
      <section><h2>Verify before signing</h2><p>Always verify the destination, base SOL purchase amount, 2% PowerPay service fee, PWRC mint, Token-2022 fee, selected network, network-specific program, total-before-network fee, and wallet prompt before approving a transaction. Devnet uses test assets; Mainnet Beta uses real assets. Solana network fees are separate from both the PowerPay service fee and the PWRC Token-2022 fee. Do not sign a transaction you do not understand.</p></section>
      <section><h2>Tax and reporting</h2><p>You are responsible for determining and meeting any tax, accounting, disclosure, or reporting obligations that apply to your transactions.</p></section>
    </LegalPage>
  );
}
