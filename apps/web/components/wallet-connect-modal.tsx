"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { NetworkIcon, WalletIcon } from "@web3icons/react/dynamic";
import {
  Check,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { CANONICAL_PWRC_MINT } from "@/constants/app";
import { useSolanaNetwork } from "@/context/solana-network-context";
import { NetworkSwitcher } from "./network-switcher";
import { compactAddress } from "@/lib/format";

type WalletConnectModalContextValue = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

const WalletConnectModalContext = createContext<WalletConnectModalContextValue | null>(null);

const preferredWallets = ["Phantom", "Solflare", "Backpack"] as const;

function web3WalletName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("phantom")) return "phantom";
  if (normalized.includes("solflare")) return "solflare";
  if (normalized.includes("backpack")) return "backpack";
  return null;
}

function readyLabel(state: WalletReadyState) {
  if (state === WalletReadyState.Installed) return "Installed";
  if (state === WalletReadyState.Loadable) return "Available";
  if (state === WalletReadyState.NotDetected) return "Not detected";
  return "Unavailable";
}

function walletRank(name: string) {
  const index = preferredWallets.findIndex((walletName) => name.toLowerCase().includes(walletName.toLowerCase()));
  return index === -1 ? preferredWallets.length : index;
}

function WalletBrand({ name, icon }: { name: string; icon?: string }) {
  const web3Name = web3WalletName(name);

  if (web3Name) {
    return (
      <span className="wallet-modal-brand" aria-hidden="true">
        <WalletIcon name={web3Name} size={32} variant="branded" />
      </span>
    );
  }

  if (icon) {
    return (
      <span className="wallet-modal-brand" aria-hidden="true">
        {/* Wallet Adapter supplies a wallet-owned icon URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" />
      </span>
    );
  }

  return (
    <span className="wallet-modal-brand wallet-modal-brand-fallback" aria-hidden="true">
      <Wallet size={20} />
    </span>
  );
}

function WalletConnectModal({ onClose }: { onClose: () => void }) {
  const {
    wallets,
    wallet,
    publicKey,
    connected,
    connecting,
    disconnecting,
    connect,
    disconnect,
    select,
  } = useWallet();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { label: clusterLabel, programId } = useSolanaNetwork();
  const [pendingWallet, setPendingWallet] = useState<WalletName | null>(null);
  const [error, setError] = useState("");

  const availableWallets = useMemo(
    () =>
      [...wallets]
        .filter(({ readyState }) => readyState !== WalletReadyState.Unsupported)
        .sort((a, b) => {
          const readyA = a.readyState === WalletReadyState.Installed || a.readyState === WalletReadyState.Loadable ? 0 : 1;
          const readyB = b.readyState === WalletReadyState.Installed || b.readyState === WalletReadyState.Loadable ? 0 : 1;
          return readyA - readyB || walletRank(a.adapter.name) - walletRank(b.adapter.name) || a.adapter.name.localeCompare(b.adapter.name);
        }),
    [wallets],
  );

  const detectedWallets = availableWallets.filter(
    ({ readyState }) => readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable,
  );

  const chooseWallet = useCallback(
    async (name: WalletName) => {
      setError("");
      try {
        if (connected && wallet?.adapter.name === name) {
          onClose();
          return;
        }

        if (connected) await disconnect();
        setPendingWallet(name);
        select(name);
      } catch (caught) {
        setPendingWallet(null);
        setError(caught instanceof Error ? caught.message : "Unable to switch wallets.");
      }
    },
    [connected, disconnect, onClose, select, wallet?.adapter.name],
  );

  useEffect(() => {
    if (!pendingWallet || wallet?.adapter.name !== pendingWallet) return;
    if (connected) {
      setPendingWallet(null);
      onClose();
      return;
    }
    if (connecting || disconnecting) return;

    let cancelled = false;
    void connect()
      .then(() => {
        if (!cancelled) {
          setPendingWallet(null);
          onClose();
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setPendingWallet(null);
          setError(caught instanceof Error ? caught.message : "Wallet connection was rejected.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connect, connected, connecting, disconnecting, onClose, pendingWallet, wallet?.adapter.name]);

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose]);

  return (
    <div className="wallet-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-busy={connecting || disconnecting}
        aria-labelledby="wallet-modal-title"
        aria-describedby="wallet-modal-description"
      >
        <div className="wallet-modal-header">
          <div className="wallet-modal-heading">
            <span className="wallet-modal-network-icon" aria-hidden="true">
              <NetworkIcon network="solana" size={28} variant="branded" />
            </span>
            <div>
              <span className="section-kicker">PowerPay · Solana</span>
              <h2 id="wallet-modal-title">Connect wallet</h2>
            </div>
          </div>
          <button className="wallet-modal-close" type="button" onClick={onClose} aria-label="Close wallet dialog">
            <X size={18} />
          </button>
        </div>

        <p id="wallet-modal-description" className="wallet-modal-description">
          Connect a Solana wallet to buy, send, and receive PWRC. PowerPay never asks for your recovery phrase or private key.
        </p>

        <NetworkSwitcher inline />

        <div className="wallet-modal-context" aria-label="Connection context">
          <div>
            <span className="wallet-modal-context-icon"><NetworkIcon network="solana" size={19} variant="branded" /></span>
            <span><small>Network</small><strong>Solana {clusterLabel}</strong></span>
          </div>
          <div>
            <span className="wallet-modal-context-icon pwrc-context-mark">P</span>
            <span><small>PWRC mint</small><strong>{compactAddress(CANONICAL_PWRC_MINT, 5, 5)}</strong></span>
          </div>
          <div>
            <span className="wallet-modal-context-icon">#</span>
            <span><small>Sale program</small><strong>{programId ? compactAddress(programId, 5, 5) : "Not configured"}</strong></span>
          </div>
        </div>

        <div className="wallet-modal-section-head">
          <div>
            <strong>Available wallets</strong>
            <span>{detectedWallets.length ? `${detectedWallets.length} detected in this browser` : "Wallet Standard discovery"}</span>
          </div>
          <span className="wallet-standard-badge"><ShieldCheck size={13} /> Wallet Standard</span>
        </div>

        <div className="wallet-modal-list" role="list">
          {detectedWallets.length ? (
            detectedWallets.map(({ adapter, readyState }) => {
              const isCurrent = connected && wallet?.adapter.name === adapter.name;
              const isPending = pendingWallet === adapter.name || (connecting && wallet?.adapter.name === adapter.name);
              return (
                <button
                  key={adapter.name}
                  type="button"
                  role="listitem"
                  className={`wallet-modal-option ${isCurrent ? "connected" : ""}`}
                  onClick={() => void chooseWallet(adapter.name)}
                  disabled={disconnecting || (connecting && !isPending)}
                >
                  <WalletBrand name={adapter.name} icon={adapter.icon} />
                  <span className="wallet-modal-option-copy">
                    <strong>{adapter.name}</strong>
                    <span>{isCurrent ? compactAddress(publicKey?.toBase58() ?? "") : readyLabel(readyState)}</span>
                  </span>
                  <span className="wallet-modal-option-state">
                    {isCurrent ? <><Check size={14} /> Connected</> : isPending ? <><LoaderCircle className="spin" size={16} /> Connecting</> : <ChevronRight size={17} />}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="wallet-modal-empty">
              <span><Smartphone size={23} /></span>
              <div>
                <strong>No compatible wallet detected</strong>
                <p>Install or unlock a Wallet Standard-compatible Solana wallet, then reopen this dialog.</p>
              </div>
              <button type="button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Refresh</button>
            </div>
          )}
        </div>

        <div className="wallet-modal-popular" aria-label="Common supported wallets">
          <span>Common wallets</span>
          <div>
            {preferredWallets.map((name) => (
              <span className="wallet-modal-popular-item" key={name}>
                <WalletIcon name={name.toLowerCase()} size={20} variant="branded" />
                {name}
              </span>
            ))}
          </div>
        </div>

        {error ? (
          <div className="wallet-modal-error" role="alert">
            <CircleAlert size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="wallet-modal-security">
          <LockKeyhole size={17} />
          <div>
            <strong>Non-custodial connection</strong>
            <span>Transactions remain wallet-reviewed and wallet-signed. Connecting does not authorize a payment.</span>
          </div>
        </div>

        <a
          className="wallet-modal-help"
          href="https://solana.com/ecosystem/explore?categories=wallet"
          target="_blank"
          rel="noreferrer"
        >
          Explore Solana wallets <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

export function WalletConnectModalProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ visible, setVisible }), [visible]);

  return (
    <WalletConnectModalContext.Provider value={value}>
      {children}
      {visible ? <WalletConnectModal onClose={close} /> : null}
    </WalletConnectModalContext.Provider>
  );
}

export function useWalletConnectModal() {
  const context = useContext(WalletConnectModalContext);
  if (!context) throw new Error("useWalletConnectModal must be used inside WalletConnectModalProvider");
  return context;
}
