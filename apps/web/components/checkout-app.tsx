"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { Transaction } from "@solana/web3.js";
import { QRCodeSVG } from "qrcode.react";
import { BatteryCharging, CarFront, Check, Droplets, Leaf, ShieldCheck, SunMedium, Wind, Zap } from "lucide-react";
import { NetworkIcon, TokenIcon, WalletIcon } from "@web3icons/react/dynamic";
import { PwrcCoin } from "./pwrc-coin";
import { MobileCheckoutBar } from "./mobile";
import { useMarketPrice } from "@/context/market-price-context";
import { explorerTx } from "@/lib/solana/explorer";
import { formatNumber, parsePositiveNumber, compactAddress } from "@/lib/format";
import { formatAge } from "@/utils/util";
import { StatusPill } from "@/utils/helpers";

Buffer.from("powerpay");

const renewableProducts = [
  [SunMedium, "Solar Energy", "Clean · Efficient"],
  [Wind, "Wind Energy", "Sustainable · Reliable"],
  [BatteryCharging, "Energy Storage", "Store · Optimize"],
  [Droplets, "Hydro Power", "Renewable · Powerful"],
  [CarFront, "EV Charging", "Green · Connected"],
] as const;

type Quote = {
  source: "onchain" | "preview";
  enabled: boolean;
  rate: number;
  grossPwrc: number;
  transferFeePwrc: number;
  netPwrc: number;
  transferFeeBasisPoints: number | null;
  minSol: number;
  maxSol: number;
  mint?: string;
  treasury?: string;
  warning?: string;
};

function useCountdown(expiresAt: number | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(expiresAt ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 0);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return `${String(Math.floor(left / 60)).padStart(2, "0")} : ${String(left % 60).padStart(2, "0")}`;
}

function marketSourceLabel(source: string | undefined) {
  if (source === "pyth") return "Pyth";
  if (source === "birdeye") return "Birdeye";
  return "Fallback";
}

export function CheckoutApp() {
  const [amount, setAmount] = useState("0.50");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLamports, setPaymentLamports] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { solUsd, loading: marketLoading, error: marketError } = useMarketPrice();

  const sol = parsePositiveNumber(amount);
  const timer = useCountdown(expiresAt);
  const expired = Boolean(expiresAt && Date.now() >= expiresAt);
  const solUsdPrice = solUsd?.priceUsd ?? 0;
  const marketSource = marketSourceLabel(solUsd?.source);

  const refresh = useCallback(async () => {
    if (!sol) return;
    setError("");
    try {
      const [quoteResponse, payResponse] = await Promise.all([
        fetch(`/api/quote?sol=${encodeURIComponent(amount)}`, { cache: "no-store" }),
        fetch(`/api/solana-pay/url?sol=${encodeURIComponent(amount)}`, { cache: "no-store" }),
      ]);
      const q = await quoteResponse.json();
      const pay = await payResponse.json();
      if (!quoteResponse.ok || q.error) setError(q.error || "Quote unavailable");
      else setQuote(q);

      if (payResponse.ok && pay.url) {
        setQrUrl(pay.url);
        setExpiresAt(pay.expiresAt);
        setPaymentReference(pay.reference ?? "");
        setPaymentLamports(pay.lamports ?? "");
      } else {
        setQrUrl("");
        setExpiresAt(null);
        setPaymentReference("");
        setPaymentLamports("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh checkout");
    }
  }, [amount, sol]);

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(id);
  }, [refresh]);

  const canBuy = Boolean(publicKey && quote?.source === "onchain" && quote.enabled && sol >= quote.minSol && sol <= quote.maxSol);

  useEffect(() => {
    if (!paymentReference || !paymentLamports || signature) return;
    let stopped = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/solana-pay/status?reference=${encodeURIComponent(paymentReference)}&lamports=${encodeURIComponent(paymentLamports)}`, { cache: "no-store" });
        const data = await response.json();
        if (!stopped && data.confirmed && data.signature) setSignature(data.signature);
      } catch {
        // Polling remains best-effort; the wallet flow is still authoritative.
      }
    };
    void poll();
    const id = setInterval(() => void poll(), 2500);
    return () => { stopped = true; clearInterval(id); };
  }, [paymentReference, paymentLamports, signature]);

  const currentStep = signature ? 2 : busy ? 1 : 0;

  async function buyWithWallet() {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    setBusy(true);
    setError("");
    setSignature("");
    try {
      const res = await fetch("/api/transactions/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: publicKey.toBase58(), sol: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to build purchase");
      const tx = Transaction.from(Buffer.from(data.transaction, "base64"));
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, "confirmed");
      setSignature(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  const paymentFee = quote?.transferFeeBasisPoints
    ? `${quote.transferFeeBasisPoints / 100}% Token-2022 transfer fee`
    : "Token-2022 fee read from mint";
  const marketHealthy = Boolean(solUsd && !solUsd.stale && solUsd.source !== "fallback");
  const marketAge = solUsd ? formatAge(Math.max(0, (Date.now() - new Date(solUsd.updatedAt).getTime()) / 1000)) : "loading";

  return (
    <>
      <div className="checkout-grid">
        <section className="panel main-panel" id="buy">
          <div className="stepper">
            {["Select", "Pay", "Complete"].map((name, i) => (
              <div className={`step ${i <= currentStep ? "active" : ""}`} key={name}>
                <div className="step-top"><span className="step-dot">{i + 1}</span>{i < 2 && <span className="step-line" />}</div>
                <span>{name}</span>
              </div>
            ))}
          </div>

          <div className="purchase-hero">
            <PwrcCoin large />
            <div>
              <h1>Buy <span className="green">PWRC</span></h1>
              <p className="eyebrow">PowerChain Token-2022 on Solana</p>
              <div className="amount-stack">
                <span className="field-label">You pay</span>
                <div className="amount-box">
                  <div className="asset-id"><TokenIcon symbol="SOL" size={32} variant="branded" /> SOL</div>
                  <div>
                    <input
                      className="amount-input"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => { setSignature(""); setAmount(event.target.value.replace(/[^0-9.]/g, "")); }}
                      aria-label="SOL amount"
                    />
                    <div className="subtext" style={{ textAlign: "right" }}>
                      {marketLoading ? "Loading SOL/USD…" : solUsdPrice > 0 ? `≈ $${formatNumber(sol * solUsdPrice, 2)} USD · ${marketSource}` : "USD reference unavailable"}
                    </div>
                  </div>
                </div>

                <span className="field-label">You receive</span>
                <div className="amount-box">
                  <div className="asset-id"><PwrcCoin /> PWRC</div>
                  <div className="amount-result">
                    <strong>{formatNumber(quote?.netPwrc ?? 0, 3)} <span style={{ fontSize: 12 }}>PWRC</span></strong>
                    <small>{quote && quote.transferFeePwrc > 0 ? `Gross ${formatNumber(quote.grossPwrc, 3)} · fee ${formatNumber(quote.transferFeePwrc, 3)}` : "Net amount"}</small>
                  </div>
                </div>

                <div className="rate-row">
                  <div><span className="status-dot" />{quote?.source === "onchain" ? "On-chain sale rate" : "Preview rate"}</div>
                  <div style={{ textAlign: "right" }}>
                    <strong>1 SOL = {formatNumber(quote?.rate ?? 0, 0)} PWRC</strong>
                    <div className="subtext">
                      {paymentFee}{solUsdPrice > 0 && quote?.rate ? ` · ≈ $${(solUsdPrice / quote.rate).toFixed(8)}/PWRC reference` : ""}
                    </div>
                  </div>
                </div>

                <div className="market-row" aria-live="polite">
                  <div>
                    <strong>SOL/USD market reference</strong>
                    <span>{marketError ? marketError : `${marketSource} · ${marketAge}`}</span>
                  </div>
                  <div className="market-row-right">
                    <strong>{solUsdPrice > 0 ? `$${formatNumber(solUsdPrice, 2)}` : "—"}</strong>
                    <StatusPill ok={marketHealthy}>{marketHealthy ? "Fresh" : "Reference only"}</StatusPill>
                  </div>
                </div>
                {solUsd?.deviationBps != null && (
                  <div className="market-note">Pyth/Birdeye divergence: {solUsd.deviationBps} bps. Market data is display-only and never overrides the on-chain sale rate.</div>
                )}
              </div>
            </div>
          </div>

          <hr className="divider" />
          <div className="section-title">Choose payment method</div>
          <div className="payment-list">
            <div className="payment-option active"><span className="radio" /><NetworkIcon network="solana" size={38} variant="branded" /><div className="payment-copy"><strong>Solana Pay</strong><span>Scan to pay · atomic PWRC delivery</span></div><span className="recommended">Recommended</span></div>
            <div className="payment-option"><span className="radio" /><NetworkIcon network="solana" size={38} variant="branded" /><div className="payment-copy"><strong>Solana Wallet</strong><span>Connect and approve in browser</span></div><div className="wallet-icons"><WalletIcon name="phantom" size={27} variant="branded" /><WalletIcon name="solflare" size={27} variant="branded" /><WalletIcon name="backpack" size={27} variant="branded" /></div></div>
            <div className="payment-option" aria-disabled="true"><span className="radio" /><div className="stripe-wordmark">stripe</div><div className="payment-copy"><strong>Card payment</strong><span>Visa, Mastercard · Stripe adapter not enabled</span></div><span className="recommended stripe-badge">Optional</span></div>
          </div>

          <div className="actions">
            <button className="secondary-button" onClick={() => setVisible(true)}>{publicKey ? compactAddress(publicKey.toBase58()) : "Connect wallet"}</button>
            <button className="primary-button" disabled={busy || !canBuy} onClick={buyWithWallet}>{busy ? "Confirming…" : <><NetworkIcon network="solana" size={22} variant="branded" />Buy PWRC</>}</button>
          </div>

          {!quote?.enabled && <div className="alert">Preview mode: deploy and initialize <code>programs/pwrc-sale</code>, fund its PWRC vault, then enable the sale. Purchase actions fail closed until the on-chain config is live.</div>}
          {error && <div className="alert danger">{error}</div>}
          {signature && <div className="tx-success"><Check size={16} style={{ display: "inline", marginRight: 6 }} />Purchase confirmed. <a href={explorerTx(signature)} target="_blank" rel="noreferrer">View on Solscan</a></div>}
          <div className="security-note"><ShieldCheck size={16} color="#0a8f3d" /> Buyer signs the transaction. PowerPay never receives a wallet private key.</div>
        </section>

        <aside className="panel side-panel" id="scan">
          <div className="scan-header"><div><h2>Scan To Pay</h2><p className="eyebrow">Pay securely with Solana Pay</p></div><div className="solana-icon-box"><NetworkIcon network="solana" size={30} variant="branded" /></div></div>
          <div className="qr-shell">
            {qrUrl && !expired
              ? <QRCodeSVG value={qrUrl} level="H" includeMargin={false} size={296} />
              : <div className="qr-empty">{expired ? "This QR expired. Refresh it before scanning." : "Scan To Pay becomes available when the on-chain sale is enabled."}</div>}
            <span className="qr-logo"><img src="/assets/brand/powerpay-mark.png" alt="" /></span>
          </div>
          <div className="detail-list">
            <div className="detail-row"><span>Amount</span><strong className="green">{sol || 0} SOL</strong></div>
            <div className="detail-row"><span>USD reference</span><strong>{solUsdPrice > 0 ? `$${formatNumber(sol * solUsdPrice, 2)}` : "—"}</strong></div>
            <div className="detail-row"><span>Network</span><strong className="inline-asset"><NetworkIcon network="solana" size={18} variant="branded" /> Solana</strong></div>
            <div className="detail-row"><span>Delivery</span><strong>PWRC Token-2022</strong></div>
            {paymentReference && <div className="detail-row"><span>Reference</span><strong>{compactAddress(paymentReference, 4, 4)}</strong></div>}
          </div>
          <div className="instructions">{["Open your Solana wallet", "Scan the QR code", "Review and approve", "Receive PWRC atomically"].map((text, i) => <div className="instruction" key={text}><span className="number">{i + 1}</span>{text}</div>)}</div>
          <div className="timer"><span className="subtext">Payment request expires in</span>{expired ? <button className="secondary-button compact" onClick={() => void refresh()}>Refresh QR</button> : <strong>{timer}</strong>}</div>
          <div className="summary" id="summary">
            <h3>Order Summary</h3>
            <div className="detail-list">
              <div className="detail-row"><span>You pay</span><strong>{sol || 0} SOL</strong></div>
              <div className="detail-row"><span>Gross PWRC</span><strong>{formatNumber(quote?.grossPwrc ?? 0, 3)}</strong></div>
              <div className="detail-row"><span>Token fee</span><strong>{formatNumber(quote?.transferFeePwrc ?? 0, 3)} PWRC</strong></div>
              <div className="detail-row"><span>Wallet receives</span><strong>{formatNumber(quote?.netPwrc ?? 0, 3)} PWRC</strong></div>
              <div className="detail-row"><span>Network fee</span><strong>Estimated by wallet</strong></div>
            </div>
            <div className="total-row"><strong>Total</strong><strong>{sol || 0} SOL</strong></div>
          </div>
        </aside>
      </div>

      <section className="panel trust-strip">
        <div className="trust-item"><span className="icon-circle"><NetworkIcon network="solana" size={24} variant="branded" /></span><div><strong>Built on Solana</strong><span>Fast · scalable · low fees</span></div></div>
        <div className="trust-item"><span className="icon-circle"><ShieldCheck size={21} /></span><div><strong>Secure & trusted</strong><span>Wallet-signed settlement</span></div></div>
        <div className="trust-item"><span className="icon-circle"><Zap size={21} /></span><div><strong>Atomic settlement</strong><span>SOL and PWRC in one transaction</span></div></div>
        <div className="trust-item"><span className="icon-circle"><Leaf size={21} /></span><div><strong>Renewable focus</strong><span>PowerChain energy ecosystem</span></div></div>
      </section>

      <section className="panel renewables">
        <div className="section-head"><div><h3>Powering a Renewable Future</h3><p>PowerPay connects digital payments with PowerChain renewable infrastructure.</p></div><span className="green product-link">Explore products →</span></div>
        <div className="product-grid">{renewableProducts.map(([Icon, name, tag]) => <div className="product-card" key={name}><div className="product-art"><Icon size={42} /></div><div className="product-body"><strong>{name}</strong><span>{tag}</span></div></div>)}</div>
      </section>

      <MobileCheckoutBar
        sol={sol}
        pwrc={quote?.netPwrc ?? 0}
        connected={Boolean(publicKey)}
        disabled={Boolean(publicKey) && !canBuy}
        busy={busy}
        onPrimary={() => publicKey ? void buyWithWallet() : setVisible(true)}
      />
    </>
  );
}
