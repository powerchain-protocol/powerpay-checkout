"use client";

import { NetworkIcon } from "@web3icons/react/dynamic";
import { formatNumber } from "@/lib/format";

export function MobileCheckoutBar({
  sol,
  pwrc,
  connected,
  disabled,
  busy,
  onPrimary,
}: {
  sol: number;
  pwrc: number;
  connected: boolean;
  disabled: boolean;
  busy: boolean;
  onPrimary: () => void;
}) {
  return (
    <div className="mobile-checkout-bar" role="region" aria-label="Mobile checkout actions">
      <div className="mobile-total">
        <span>{sol || 0} SOL</span>
        <strong>{formatNumber(pwrc, 0)} PWRC</strong>
      </div>
      <button className="primary-button mobile-primary" disabled={disabled || busy} onClick={onPrimary}>
        <NetworkIcon network="solana" size={20} variant="branded" />
        {busy ? "Confirming…" : connected ? "Buy PWRC" : "Connect"}
      </button>
    </div>
  );
}
