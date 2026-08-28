import { AppShell } from "@/components/app-shell";
import { CheckoutApp } from "@/components/checkout-app";
import { MarketPriceProvider } from "@/context/market-price-context";

export default function CheckoutPage() {
  return (
    <AppShell>
      <MarketPriceProvider><CheckoutApp /></MarketPriceProvider>
    </AppShell>
  );
}
