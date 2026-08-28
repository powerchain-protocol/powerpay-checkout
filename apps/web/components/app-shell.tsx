import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <SiteHeader />
      <main id="main-content" className="app-main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
