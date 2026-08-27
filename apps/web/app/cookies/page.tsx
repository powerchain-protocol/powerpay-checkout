import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CookiesContent } from "@/components/legal/cookies";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description: "How PowerPay uses cookies, browser storage, and wallet-related preferences.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Notice" intro="This notice explains how the PowerPay web application uses cookies, local storage, and related browser technologies.">
      <CookiesContent />
    </LegalPage>
  );
}
