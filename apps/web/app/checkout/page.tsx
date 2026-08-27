import { SiteHeader } from "@/components/site-header";
import { CheckoutApp } from "@/components/checkout-app";
import { Footer } from "@/components/footer";
import { MarketPriceProvider } from "@/context/market-price-context";

export default function CheckoutPage() {
  return (
    <main className="shell">
      <SiteHeader />
      <MarketPriceProvider><CheckoutApp /></MarketPriceProvider>
      <Footer />
    </main>
  );
}
