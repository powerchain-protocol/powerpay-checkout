"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, ChevronDown, CircleAlert, Network, ShieldCheck } from "lucide-react";
import { useSolanaNetwork } from "@/context/solana-network-context";
import { useSystemHealth } from "@/context/system-health-context";
import type { SolanaCluster } from "@/constants/network";

type NetworkSwitcherProps = {
  compact?: boolean;
  inline?: boolean;
};

export function NetworkSwitcher({ compact = false, inline = false }: NetworkSwitcherProps) {
  const {
    cluster,
    setCluster,
    label,
    shortLabel,
    badge,
    production,
    mainnetEnabled,
  } = useSolanaNetwork();
  const { connected, disconnect } = useWallet();
  const health = useSystemHealth();
  const [open, setOpen] = useState(false);
  const [confirmMainnet, setConfirmMainnet] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function closeMenu(restoreFocus = false) {
      setOpen(false);
      setConfirmMainnet(false);
      if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeMenu(true);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function apply(next: SolanaCluster) {
    if (next === cluster) {
      setOpen(false);
      setConfirmMainnet(false);
      return;
    }

    if (next === "mainnet-beta" && !mainnetEnabled) return;
    if (next === "mainnet-beta" && !confirmMainnet) {
      setConfirmMainnet(true);
      return;
    }

    if (connected) await disconnect();
    setCluster(next);
    setOpen(false);
    setConfirmMainnet(false);
  }

  if (inline) {
    return (
      <div className="network-inline-switcher" aria-label="Solana network">
        <button
          type="button"
          className={cluster === "devnet" ? "active" : ""}
          onClick={() => void apply("devnet")}
        >
          <span className="network-dot" />
          <span><strong>Devnet</strong><small>Test assets</small></span>
          {cluster === "devnet" ? <Check size={14} /> : null}
        </button>
        <button
          type="button"
          className={cluster === "mainnet-beta" ? "active live" : "live"}
          disabled={!mainnetEnabled}
          onClick={() => void apply("mainnet-beta")}
        >
          <span className="network-dot" />
          <span><strong>Mainnet Beta</strong><small>{mainnetEnabled ? "Real assets" : "Disabled"}</small></span>
          {cluster === "mainnet-beta" ? <Check size={14} /> : null}
        </button>
        {confirmMainnet ? (
          <div className="network-inline-warning" role="alert">
            <CircleAlert size={15} />
            <span>Mainnet uses real SOL and PWRC.</span>
            <button type="button" onClick={() => void apply("mainnet-beta")}>Switch to Mainnet</button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="network-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`network-switcher-trigger ${production ? "live" : "test"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={health.loading}
        onClick={() => {
          setOpen((value) => !value);
          setConfirmMainnet(false);
        }}
        title={`Solana ${label}`}
      >
        <span className="network-dot" />
        <span className="network-switcher-copy">
          <small>{badge}</small>
          <strong>{compact ? shortLabel : label}</strong>
        </span>
        <ChevronDown size={14} />
      </button>

      {open ? (
        <div className="network-popover" role="menu" aria-label="Choose Solana network">
          <div className="network-popover-head">
            <span className="network-popover-icon"><Network size={16} /></span>
            <div>
              <strong>Solana network</strong>
              <span>Changing network disconnects the active wallet.</span>
            </div>
          </div>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={cluster === "devnet"}
            className={`network-option ${cluster === "devnet" ? "active" : ""}`}
            onClick={() => void apply("devnet")}
          >
            <span className="network-option-status test"><span /></span>
            <span className="network-option-copy"><strong>Devnet</strong><small>Testing · no production value</small></span>
            {cluster === "devnet" ? <Check size={16} /> : null}
          </button>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={cluster === "mainnet-beta"}
            className={`network-option ${cluster === "mainnet-beta" ? "active" : ""}`}
            disabled={!mainnetEnabled}
            onClick={() => void apply("mainnet-beta")}
          >
            <span className="network-option-status live"><span /></span>
            <span className="network-option-copy"><strong>Mainnet Beta</strong><small>{mainnetEnabled ? "Production · real assets" : "Disabled by configuration"}</small></span>
            {cluster === "mainnet-beta" ? <Check size={16} /> : null}
          </button>

          {confirmMainnet ? (
            <div className="network-mainnet-confirm" role="alert">
              <CircleAlert size={16} />
              <div>
                <strong>Switch to production?</strong>
                <span>Mainnet transactions use real SOL and PWRC and incur Solana network fees.</span>
              </div>
              <button type="button" onClick={() => void apply("mainnet-beta")}>Confirm Mainnet</button>
            </div>
          ) : null}

          <div className="network-rpc-state" role="status" aria-live="polite" aria-busy={health.loading}>
            <span className={`network-option-status ${health.error ? "error" : health.status === "operational" ? "live" : "test"}`}><span /></span>
            <div>
              <strong>{health.loading ? "Checking RPC…" : health.error ? "RPC unavailable" : `RPC ready${health.rpcLatencyMs != null ? ` · ${health.rpcLatencyMs} ms` : ""}`}</strong>
              <small>{health.error ?? health.settlementAuthorityMessage ?? "The selected RPC transports reads; it does not change on-chain settlement authority."}</small>
            </div>
          </div>
          <div className="network-popover-foot"><ShieldCheck size={13} /> RPC endpoints are selected from reviewed environment configuration. Settlement authority remains the deployed program + SaleConfig.</div>
        </div>
      ) : null}
    </div>
  );
}
