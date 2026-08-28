"use client";

import { PowerPayLogo } from "./powerpay-logo";
import { WalletButton } from "./wallet-button";
import { NetworkSwitcher } from "./network-switcher";
import { SystemStatus } from "./system-status";
import { PublicNavigation } from "./public-navigation";

export function SiteHeader() {
  return (
    <header className="site-header">
      <PowerPayLogo />
      <PublicNavigation />
      <div className="header-actions">
        <SystemStatus />
        <NetworkSwitcher />
        <WalletButton />
      </div>
    </header>
  );
}
