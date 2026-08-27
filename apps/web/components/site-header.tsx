"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, ShoppingBag } from "lucide-react";
import { PowerPayLogo } from "./powerpay-logo";
import { WalletButton } from "./wallet-button";
import { ROUTES } from "@/constants/routes";
import { clientEnv } from "@/env/client";

const navItems = [
  { href: ROUTES.checkout, label: "Buy", Icon: ShoppingBag },
  { href: ROUTES.send, label: "Send", Icon: ArrowUpFromLine },
  { href: ROUTES.receive, label: "Receive", Icon: ArrowDownToLine },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const clusterLabel = clientEnv.solanaCluster === "mainnet-beta" ? "Mainnet" : clientEnv.solanaCluster;

  return (
    <header className="site-header">
      <PowerPayLogo />
      <nav className="header-nav" aria-label="PowerPay">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link className={`header-link ${active ? "active" : ""}`} href={href} key={href} aria-current={active ? "page" : undefined}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="header-actions">
        <div className={`network-badge ${clientEnv.solanaCluster === "mainnet-beta" ? "live" : "test"}`} title={`Solana ${clusterLabel}`}>
          <span className="network-dot" />
          <span>Solana {clusterLabel}</span>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
