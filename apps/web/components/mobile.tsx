"use client";

import { NetworkIcon } from "@web3icons/react/dynamic";
import { ExternalLink, Wallet } from "lucide-react";
import { formatNumber } from "@/lib/format";

type MobileCheckoutBarProps = {
  method: "solana-pay" | "wallet";
  sol: number;
  pwrc: number;
  usd: number;
  connected: boolean;
  disabled: boolean;
  busy: boolean;
  solanaPayUrl?: string;
  expired?: boolean;
  onWalletBuy: () => void;
  onConnect: () => void;
};

export function MobileCheckoutBar({
  method,
  sol,
  pwrc,
  usd,
  connected,
  disabled,
  busy,
  solanaPayUrl,
  expired,
  onWalletBuy,
  onConnect,
}: MobileCheckoutBarProps) {
  const canOpenSolanaPay = Boolean(solanaPayUrl && !expired);

  function primaryAction() {
    if (method === "wallet") {
      if (connected) onWalletBuy();
      else onConnect();
      return;
    }
    if (canOpenSolanaPay && solanaPayUrl) {
      window.location.href = solanaPayUrl;
      return;
    }
    return;
  }

  return (
    <div className="mobile-checkout-bar" role="region" aria-label="Checkout summary and action">
      <div className="mobile-total">
        <div className="mobile-total-topline">
          <span>{formatNumber(sol || 0, 4)} SOL</span>
          {usd > 0 && <span>≈ ${formatNumber(usd, 2)}</span>}
        </div>
        <strong>{formatNumber(pwrc, 0)} PWRC</strong>
      </div>
      <button
        className="primary-button mobile-primary"
        disabled={busy || (method === "wallet" && connected && disabled) || (method === "solana-pay" && !canOpenSolanaPay)}
        onClick={primaryAction}
      >
        {method === "wallet" ? (
          <>
            <Wallet size={18} />
            {busy ? "Confirming…" : connected ? "Buy PWRC" : "Connect wallet"}
          </>
        ) : canOpenSolanaPay ? (
          <>
            <NetworkIcon network="solana" size={20} variant="branded" />
            Open Solana Pay
            <ExternalLink size={15} />
          </>
        ) : (
          <>
            <NetworkIcon network="solana" size={20} variant="branded" />
            Waiting for quote
          </>
        )}
      </button>
    </div>
  );
}
