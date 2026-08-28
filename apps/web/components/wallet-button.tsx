"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, LogOut, RefreshCw, Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { compactAddress, formatNumber } from "@/lib/format";
import { useWalletBalances } from "@/context/wallet-balance-context";
import { useWalletConnectModal } from "./wallet-connect-modal";

export function WalletButton() {
  const { publicKey, connected, disconnect, wallet } = useWallet();
  const balances = useWalletBalances();
  const { setVisible } = useWalletConnectModal();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function copyAddress() {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (!connected || !publicKey) {
    return (
      <button className="wallet-button" onClick={() => setVisible(true)}>
        <Wallet size={17} />
        <span>Connect wallet</span>
      </button>
    );
  }

  return (
    <div className="wallet-control" ref={rootRef}>
      <button
        className="wallet-button connected"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {wallet?.adapter.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="wallet-button-icon" src={wallet.adapter.icon} alt="" />
        ) : <span className="wallet-status-dot" aria-hidden="true" />}
        <span className="wallet-name">{wallet?.adapter.name ?? "Wallet"}</span>
        <span className="wallet-address">{compactAddress(publicKey.toBase58())}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="wallet-popover" role="menu">
          <div className="wallet-popover-head">
            <span>Connected with {wallet?.adapter.name ?? "wallet"}</span>
            <strong>{compactAddress(publicKey.toBase58(), 5, 5)}</strong>
          </div>
          <div className="wallet-popover-balances" aria-label="Wallet balances">
            <div><span>SOL</span><strong>{balances.sol == null ? "—" : formatNumber(balances.sol, 4)}</strong></div>
            <div><span>PWRC</span><strong>{balances.pwrc == null ? "—" : formatNumber(balances.pwrc, 0)}</strong></div>
            <button
              type="button"
              className="wallet-balance-refresh"
              onClick={() => void balances.refresh()}
              disabled={balances.loading}
              aria-label="Refresh wallet balances"
              title={balances.error || "Refresh balances"}
            >
              <RefreshCw size={14} className={balances.loading ? "spin" : undefined} />
            </button>
          </div>
          <button role="menuitem" onClick={() => void copyAddress()}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setVisible(true);
            }}
          >
            <RefreshCw size={16} />
            Change wallet
          </button>
          <button
            role="menuitem"
            className="wallet-popover-danger"
            onClick={() => {
              setOpen(false);
              void disconnect();
            }}
          >
            <LogOut size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
