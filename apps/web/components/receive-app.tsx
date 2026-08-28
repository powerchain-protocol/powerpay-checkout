"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Link2, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { NetworkIcon } from "@web3icons/react/dynamic";
import { compactAddress } from "@/lib/format";
import { useWalletConnectModal } from "./wallet-connect-modal";
import { useSolanaNetwork } from "@/context/solana-network-context";

export function ReceiveApp() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletConnectModal();
  const { cluster, label: networkLabel, production } = useSolanaNetwork();
  const [amount, setAmount] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setUrl("");
      return;
    }

    const id = window.setTimeout(async () => {
      const qs = new URLSearchParams({ recipient: publicKey.toBase58(), cluster });
      if (Number(amount) > 0) qs.set("amount", amount);
      const response = await fetch(`/api/solana-pay/receive?${qs}`);
      const data = await response.json();
      setUrl(data.url ?? "");
    }, 200);

    return () => window.clearTimeout(id);
  }, [amount, cluster, publicKey]);

  async function copyAddress() {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1300);
  }

  return (
    <div className="page-grid">
      <section className="panel form-panel transaction-panel">
        <div className={`transaction-network-state ${production ? "mainnet" : "devnet"}`}><span className="network-dot" /><strong>{networkLabel}</strong><span>{production ? "Real SOL" : "Test SOL"}</span></div>
        <span className="section-kicker">Solana Pay</span>
        <h1 className="page-title">Receive SOL</h1>
        <p className="eyebrow">Share your wallet address or a Solana Pay QR. Add an optional amount for a pre-filled request.</p>

        {publicKey ? (
          <>
            <div className="receive-qr polished-qr">
              {url ? <QRCodeSVG value={url} level="H" size={320} /> : <div className="qr-empty"><Smartphone size={28} /><strong>Generating request…</strong></div>}
              <span className="receive-qr-network"><NetworkIcon network="solana" size={22} variant="branded" /></span>
            </div>

            <label className="input-wrap">
              <span className="field-label">Optional SOL amount</span>
              <div className="amount-entry-row">
                <span className="amount-entry-asset"><NetworkIcon network="solana" size={22} variant="branded" />SOL</span>
                <input className="text-input amount-entry-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="Any amount" />
              </div>
            </label>

            <div className="actions receive-actions">
              <button className="secondary-button" onClick={() => void copyAddress()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Address copied" : "Copy address"}</button>
              <button className="primary-button" disabled={!url} onClick={() => void copyLink()}>{linkCopied ? <Check size={17} /> : <Link2 size={17} />}{linkCopied ? "Link copied" : "Copy Solana Pay link"}</button>
            </div>
          </>
        ) : (
          <div className="connect-empty-state">
            <span><Wallet size={24} /></span>
            <strong>Connect a wallet to receive</strong>
            <p>Your public Solana address is used to generate the QR and payment request.</p>
            <button className="primary-button" onClick={() => setVisible(true)}><Wallet size={18} />Connect wallet</button>
          </div>
        )}
      </section>

      <aside className="panel balance-card transaction-review">
        <span className="section-kicker">Receive details</span>
        <div className="transaction-asset-head">
          <NetworkIcon network="solana" size={38} variant="branded" />
          <div><strong>Solana address</strong><span>{networkLabel} · Wallet Standard</span></div>
        </div>
        <div className="address-box">{publicKey?.toBase58() ?? "Not connected"}</div>
        <div className="review-list">
          <div><span>Address</span><strong>{publicKey ? compactAddress(publicKey.toBase58(), 5, 5) : "—"}</strong></div>
          <div><span>Requested amount</span><strong>{Number(amount) > 0 ? `${amount} SOL` : "Any amount"}</strong></div>
          <div><span>Protocol</span><strong>Solana Pay</strong></div>
        </div>
        <div className="security-note"><ShieldCheck size={16} />Only your public address is shared. Never share a seed phrase or private key.</div>
      </aside>
    </div>
  );
}
