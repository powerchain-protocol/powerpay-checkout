import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, LockKeyhole } from "lucide-react";
import { PowerPayLogo } from "./powerpay-logo";
import { WalletButton } from "./wallet-button";

export function SiteHeader() {
  return (
    <header className="site-header">
      <PowerPayLogo />
      <div className="header-actions">
        <Link className="header-link" href="/send"><ArrowUpFromLine size={17}/><span className="optional">Send</span></Link>
        <Link className="header-link" href="/receive"><ArrowDownToLine size={17}/><span className="optional">Receive</span></Link>
        <div className="secure-label"><LockKeyhole size={16}/>Secure checkout</div>
        <WalletButton />
      </div>
    </header>
  );
}
