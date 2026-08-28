"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import { Transaction } from "@solana/web3.js";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  BatteryCharging,
  CarFront,
  Check,
  CircleDollarSign,
  Droplets,
  ExternalLink,
  Info,
  Leaf,
  ScanLine,
  ShieldCheck,
  Smartphone,
  SunMedium,
  Wallet,
  Wind,
  Zap,
} from "lucide-react";
import { NetworkIcon, TokenIcon, WalletIcon } from "@web3icons/react/dynamic";
import { PwrcCoin } from "./pwrc-coin";
import { MobileCheckoutBar } from "./mobile";
import { useWalletConnectModal } from "./wallet-connect-modal";
import { useMarketPrice } from "@/context/market-price-context";
import { useSolanaNetwork } from "@/context/solana-network-context";
import { useWalletBalances } from "@/context/wallet-balance-context";
import {
  CANONICAL_PWRC_MINT,
  DEFAULT_BUY_SOL,
  POWERPAY_SERVICE_FEE_BPS,
  PWRC_TRANSFER_FEE_PERCENT,
  QUICK_BUY_SOL_AMOUNTS,
} from "@/constants/app";
import { explorerTx } from "@/lib/solana/explorer";
import { POWERPAY_SERVICE_FEE_PERCENT, SOL_NETWORK_FEE_BUFFER_SOL } from "@/constants/price-rates";
import { fetchData } from "@/data/fetch-data";
import { compactAddress, formatNumber, parsePositiveNumber } from "@/lib/format";
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

type PaymentMethod = "solana-pay" | "wallet" | "card";

type Quote = {
  source: "onchain" | "preview";
  enabled: boolean;
  rate: number;
  grossPwrc: number;
  transferFeePwrc: number;
  netPwrc: number;
  transferFeeBasisPoints: number | null;
  transferFeeMaximumPwrc?: number | null;
  powerPayServiceFeeBasisPoints?: number;
  purchaseSol?: number;
  purchaseLamports?: string;
  serviceFeeSol?: number;
  serviceFeeLamports?: string;
  totalBeforeNetworkFeeSol?: number;
  totalBeforeNetworkFeeLamports?: string;
  grossPwrcRaw?: string;
  transferFeePwrcRaw?: string;
  netPwrcRaw?: string;
  solanaNetworkFee?: "wallet-estimated";
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
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return {
    seconds: left,
    label: `${String(Math.floor(left / 60)).padStart(2, "0")} : ${String(left % 60).padStart(2, "0")}`,
  };
}

function marketSourceLabel(source: string | undefined) {
  if (source === "pyth") return "Pyth";
  if (source === "birdeye") return "Birdeye";
  return "Fallback";
}

export function CheckoutApp() {
  const [amount, setAmount] = useState(DEFAULT_BUY_SOL);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLamports, setPaymentLamports] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("solana-pay");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [signature, setSignature] = useState("");
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletConnectModal();
  const { solUsd, loading: marketLoading, error: marketError } = useMarketPrice();
  const { cluster, label: networkLabel, production, programId } = useSolanaNetwork();
  const walletBalances = useWalletBalances();

  const sol = parsePositiveNumber(amount);
  const countdown = useCountdown(expiresAt);
  const expired = Boolean(expiresAt && Date.now() >= expiresAt);
  const solUsdPrice = solUsd?.priceUsd ?? 0;
  const purchaseUsd = solUsdPrice > 0 ? sol * solUsdPrice : 0;
  const serviceFeeSol = quote?.serviceFeeSol ?? (sol * POWERPAY_SERVICE_FEE_BPS / 10_000);
  const totalBeforeNetworkFeeSol = quote?.totalBeforeNetworkFeeSol ?? (sol + serviceFeeSol);
  const usdTotal = solUsdPrice > 0 ? totalBeforeNetworkFeeSol * solUsdPrice : 0;
  const marketSource = marketSourceLabel(solUsd?.source);

  useEffect(() => {
    setSignature("");
    setQrUrl("");
    setExpiresAt(null);
    setPaymentReference("");
    setPaymentLamports("");
    setError("");
  }, [cluster]);

  const refresh = useCallback(async () => {
    if (!programId || !sol) {
      setQuote(null);
      setQrUrl("");
      setExpiresAt(null);
      setPaymentReference("");
      setPaymentLamports("");
      return;
    }

    setRefreshing(true);
    setError("");
    try {
      const [quoteResult, payResult] = await Promise.allSettled([
        fetchData<Quote>(`/api/quote?sol=${encodeURIComponent(amount)}&cluster=${encodeURIComponent(cluster)}`),
        fetchData<{ url?: string; expiresAt?: number; reference?: string; lamports?: string }>(
          `/api/solana-pay/url?sol=${encodeURIComponent(amount)}&cluster=${encodeURIComponent(cluster)}`,
        ),
      ]);

      if (quoteResult.status === "rejected") throw quoteResult.reason;
      setQuote(quoteResult.value);

      if (payResult.status === "fulfilled" && payResult.value.url) {
        setQrUrl(payResult.value.url);
        setExpiresAt(payResult.value.expiresAt ?? null);
        setPaymentReference(payResult.value.reference ?? "");
        setPaymentLamports(payResult.value.lamports ?? "");
      } else {
        setQrUrl("");
        setExpiresAt(null);
        setPaymentReference("");
        setPaymentLamports("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh checkout");
    } finally {
      setRefreshing(false);
    }
  }, [amount, cluster, programId, sol]);

  useEffect(() => {
    const id = window.setTimeout(() => void refresh(), 240);
    return () => window.clearTimeout(id);
  }, [refresh]);

  const amountIssue = useMemo(() => {
    if (!programId) return `PowerPay sale program is not configured for ${networkLabel}.`;
    if (!sol) return "Enter a SOL amount to continue.";
    if (!quote || quote.source !== "onchain") return "Waiting for the live on-chain sale configuration.";
    if (!quote.enabled) return "The PWRC sale is not currently enabled.";
    if (sol < quote.minSol) return `Minimum purchase is ${formatNumber(quote.minSol, 4)} SOL.`;
    if (sol > quote.maxSol) return `Maximum purchase is ${formatNumber(quote.maxSol, 4)} SOL.`;
    return "";
  }, [networkLabel, programId, quote, sol]);

  const insufficientWalletSol = Boolean(
    publicKey && walletBalances.sol != null && sol > 0 && walletBalances.sol <= totalBeforeNetworkFeeSol + SOL_NETWORK_FEE_BUFFER_SOL,
  );
  const canBuy = Boolean(
    publicKey
    && !amountIssue
    && !insufficientWalletSol
    && quote?.source === "onchain"
    && quote.enabled,
  );
  const qrReady = Boolean(qrUrl && !expired && !amountIssue);

  useEffect(() => {
    if (!paymentReference || !paymentLamports || signature) return;
    let stopped = false;

    const poll = async () => {
      try {
        const data = await fetchData<{ confirmed?: boolean; signature?: string }>(
          `/api/solana-pay/status?reference=${encodeURIComponent(paymentReference)}&lamports=${encodeURIComponent(paymentLamports)}&cluster=${encodeURIComponent(cluster)}`,
          { timeoutMs: 8_000 },
        );
        if (!stopped && data.confirmed && data.signature) setSignature(data.signature);
      } catch {
        // QR polling is best-effort. On-chain verification remains authoritative.
      }
    };

    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [cluster, paymentReference, paymentLamports, signature]);

  const paymentReady = paymentMethod === "wallet" ? canBuy : paymentMethod === "solana-pay" ? qrReady : false;
  const currentStep = signature ? 2 : paymentReady ? 1 : 0;
  const progressPercent = signature ? 100 : paymentReady ? 66 : 33;

  async function buyWithWallet() {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (!canBuy) return;

    setBusy(true);
    setError("");
    setSignature("");
    try {
      const data = await fetchData<{ transaction: string }>("/api/transactions/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: publicKey.toBase58(), sol: amount, cluster }),
      });

      const tx = Transaction.from(Buffer.from(data.transaction, "base64"));
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, "confirmed");
      setSignature(sig);
      await walletBalances.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  function openSolanaPay() {
    if (!qrReady || !qrUrl) return;
    window.location.href = qrUrl;
  }

  function selectAmount(nextAmount: string) {
    setSignature("");
    setAmount(nextAmount);
  }

  const paymentFee = `${POWERPAY_SERVICE_FEE_PERCENT}% service fee + ${PWRC_TRANSFER_FEE_PERCENT}% PWRC token fee`;
  const marketHealthy = Boolean(solUsd && !solUsd.stale && solUsd.source !== "fallback");
  const marketAge = solUsd ? formatAge(Math.max(0, (Date.now() - new Date(solUsd.updatedAt).getTime()) / 1000)) : "loading";
  const saleLive = Boolean(quote?.source === "onchain" && quote.enabled);

  return (
    <>
      <section className="checkout-context" aria-label="Checkout status">
        <div>
          <span className={`context-dot ${saleLive ? "live" : "preview"}`} />
          <strong>{saleLive ? "PWRC sale live" : "PWRC preview mode"}</strong>
          <span>Token-2022 · Solana {networkLabel}</span>
        </div>
        <div className="checkout-context-right">
          <span>Market reference</span>
          <strong>{marketLoading ? "Loading…" : solUsdPrice > 0 ? `$${formatNumber(solUsdPrice, 2)} / SOL` : "Unavailable"}</strong>
          <StatusPill ok={marketHealthy}>{marketHealthy ? `${marketSource} fresh` : "Reference only"}</StatusPill>
        </div>
      </section>

      <div className={`network-mode-banner ${production ? "mainnet" : "devnet"}`} role="status">
        <span className="network-dot" />
        <div>
          <strong>{!programId ? `${networkLabel} · Program not configured` : production ? "Mainnet Beta · Live funds" : "Devnet · Test mode"}</strong>
          <span>{!programId ? "Configure the cluster-specific PowerPay program id before Buy PWRC can execute." : production ? "Purchases use real SOL and PWRC. Review every wallet prompt before signing." : "Use this mode to validate checkout and Solana Pay flows without production settlement."}</span>
        </div>
      </div>

      <div className="checkout-grid">
        <section className="panel main-panel" id="buy">
          <div className="panel-heading-row">
            <div>
              <span className="section-kicker">Token checkout</span>
              <h1>Buy <span className="green">PWRC</span></h1>
              <p className="eyebrow">Pay in SOL. Receive PWRC directly to your wallet in the same atomic transaction.</p>
            </div>
            <span className="token-standard-badge"><ShieldCheck size={14} />Token-2022</span>
          </div>

          <div className="stepper" aria-label="Checkout progress">
            {["Select", "Pay", "Complete"].map((name, i) => (
              <div className={`step ${i <= currentStep ? "active" : ""}`} key={name} aria-current={i === currentStep ? "step" : undefined}>
                <div className="step-top">
                  <span className="step-dot">{signature && i < 2 ? <Check size={14} /> : i + 1}</span>
                  {i < 2 && <span className="step-line" />}
                </div>
                <span>{name}</span>
              </div>
            ))}
          </div>

          <div className="purchase-hero">
            <div className="token-visual-wrap">
              <PwrcCoin large />
              <span className="token-network-mark" title="Solana"><NetworkIcon network="solana" size={20} variant="branded" /></span>
            </div>

            <div className="purchase-form">
              <div className="amount-title-row">
                <span className="field-label">You pay</span>
                {quote?.source === "onchain" && (
                  <span className="limit-copy">Limits {formatNumber(quote.minSol, 4)}–{formatNumber(quote.maxSol, 4)} SOL</span>
                )}
              </div>
              <div className={`amount-box ${amountIssue && sol ? "has-warning" : ""}`}>
                <div className="asset-id"><TokenIcon symbol="SOL" size={32} variant="branded" /> SOL</div>
                <div className="amount-control">
                  <input
                    className="amount-input"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={(event) => {
                      setSignature("");
                      setAmount(event.target.value.replace(/[^0-9.]/g, ""));
                    }}
                    aria-label="SOL amount"
                    aria-describedby="sol-amount-reference"
                  />
                  <div className="subtext amount-reference" id="sol-amount-reference">
                    {marketLoading ? "Loading SOL/USD…" : purchaseUsd > 0 ? `≈ $${formatNumber(purchaseUsd, 2)} USD` : "USD reference unavailable"}
                  </div>
                </div>
              </div>

              <div className="quick-amounts" aria-label="Quick SOL amounts">
                {QUICK_BUY_SOL_AMOUNTS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={`quick-amount ${amount === value ? "active" : ""}`}
                    onClick={() => selectAmount(value)}
                  >
                    {Number(value)} SOL
                  </button>
                ))}
              </div>

              <div className="receive-label-row">
                <span className="field-label">You receive</span>
                <span className="quote-refresh-state">{refreshing ? "Refreshing quote…" : quote?.source === "onchain" ? "Live sale quote" : "Preview quote"}</span>
              </div>
              <div className="amount-box receive-box">
                <div className="asset-id"><PwrcCoin /> PWRC</div>
                <div className="amount-result">
                  <strong>{refreshing && !quote ? "—" : formatNumber(quote?.netPwrc ?? 0, 3)} <span>PWRC</span></strong>
                  <small>{quote && quote.transferFeePwrc > 0 ? `Gross ${formatNumber(quote.grossPwrc, 3)} · 2% token fee ${formatNumber(quote.transferFeePwrc, 3)}` : "Amount delivered to wallet"}</small>
                </div>
              </div>

              <div className="rate-row">
                <div className="rate-state">
                  <span className="status-dot" />
                  <div>
                    <strong>{quote?.source === "onchain" ? "On-chain sale rate" : "Preview rate"}</strong>
                    <span>Settlement uses program state, not market pricing.</span>
                  </div>
                </div>
                <div className="rate-value">
                  <strong>1 SOL = {formatNumber(quote?.rate ?? 0, 0)} PWRC</strong>
                  <span>{paymentFee}</span>
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
                <div className="market-note"><Info size={13} /> Pyth/Birdeye divergence: {solUsd.deviationBps} bps. Display data never overrides the on-chain PWRC sale rate.</div>
              )}
              {amountIssue && sol > 0 && <div className="inline-warning"><Info size={15} />{amountIssue}</div>}
            </div>
          </div>

          <div className="assurance-grid" aria-label="Purchase protections">
            <div><CircleDollarSign size={18} /><span><strong>Deterministic rate</strong>On-chain sale configuration</span></div>
            <div><Wallet size={18} /><span><strong>Wallet signed</strong>No custodial account required</span></div>
            <div><Zap size={18} /><span><strong>Atomic delivery</strong>SOL payment + PWRC transfer</span></div>
          </div>

          <hr className="divider" />

          <div className="section-heading-inline">
            <div>
              <div className="section-title">Choose payment method</div>
              <p>Use Solana Pay to scan/open the payment request, or approve directly with a connected wallet.</p>
            </div>
          </div>

          <div className="payment-list" role="radiogroup" aria-label="Payment method">
            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === "solana-pay"}
              className={`payment-option ${paymentMethod === "solana-pay" ? "active" : ""}`}
              onClick={() => setPaymentMethod("solana-pay")}
            >
              <span className="radio" />
              <NetworkIcon network="solana" size={38} variant="branded" />
              <div className="payment-copy"><strong>Solana Pay</strong><span>Scan on desktop · open directly on mobile</span></div>
              <span className="recommended">Recommended</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={paymentMethod === "wallet"}
              className={`payment-option ${paymentMethod === "wallet" ? "active" : ""}`}
              onClick={() => setPaymentMethod("wallet")}
            >
              <span className="radio" />
              <Wallet size={29} />
              <div className="payment-copy"><strong>Connected wallet</strong><span>Approve the transaction in your browser wallet</span></div>
              <div className="wallet-icons" aria-label="Supported Wallet Standard wallets">
                <WalletIcon name="phantom" size={27} variant="branded" />
                <WalletIcon name="solflare" size={27} variant="branded" />
                <WalletIcon name="backpack" size={27} variant="branded" />
              </div>
            </button>

            <button type="button" role="radio" aria-checked={false} className="payment-option disabled" disabled onClick={() => setPaymentMethod("card")}>
              <span className="radio" />
              <div className="stripe-wordmark">stripe</div>
              <div className="payment-copy"><strong>Card payment</strong><span>Visa, Mastercard · adapter not enabled</span></div>
              <span className="recommended stripe-badge">Coming later</span>
            </button>
          </div>

          <div className={`method-detail ${paymentMethod === "wallet" ? "wallet-method" : ""}`}>
            {paymentMethod === "solana-pay" ? (
              <>
                <span className="method-icon"><ScanLine size={20} /></span>
                <div><strong>Solana Pay request ready</strong><span>{qrReady ? "Scan the QR at right or open the request in a compatible Solana wallet." : "A live payment request appears once the amount and sale configuration are valid."}</span></div>
              </>
            ) : (
              <>
                <span className="method-icon"><Wallet size={20} /></span>
                <div><strong>{publicKey ? "Wallet connected" : "Connect a Solana wallet"}</strong><span>{publicKey ? `${compactAddress(publicKey.toBase58(), 5, 5)} · ${walletBalances.sol == null ? "reading balance…" : `${formatNumber(walletBalances.sol, 4)} SOL available`}` : "Phantom, Solflare, Backpack, and other Wallet Standard wallets are supported."}</span></div>
              </>
            )}
          </div>

          {paymentMethod === "wallet" && insufficientWalletSol ? (
            <div className="inline-warning" role="alert"><Info size={15} />Insufficient SOL for the purchase amount + PowerPay service fee. The wallet must also retain enough SOL for the Solana network fee and any account rent.</div>
          ) : null}

          <div className="actions">
            <button className="secondary-button" onClick={() => setVisible(true)}>
              <Wallet size={18} />
              {publicKey ? compactAddress(publicKey.toBase58()) : "Connect wallet"}
            </button>
            {paymentMethod === "solana-pay" ? (
              <button className="primary-button" disabled={!qrReady} onClick={openSolanaPay}>
                <NetworkIcon network="solana" size={22} variant="branded" />
                Open Solana Pay
                <ExternalLink size={16} />
              </button>
            ) : (
              <button className="primary-button" disabled={busy || !canBuy} onClick={() => void buyWithWallet()}>
                {busy ? "Confirming…" : <><NetworkIcon network="solana" size={22} variant="branded" />Buy PWRC<ArrowRight size={17} /></>}
              </button>
            )}
          </div>

          {!quote?.enabled && <div className="alert">Preview mode: deploy and initialize <code>programs/pwrc-sale</code>, fund its PWRC vault, then enable the sale. Purchase actions fail closed until the on-chain configuration is live.</div>}
          {error && <div className="alert danger" role="alert">{error}</div>}
          {signature && (
            <div className="tx-success" role="status">
              <span className="success-icon"><Check size={17} /></span>
              <div><strong>Purchase confirmed</strong><span>Your PWRC settlement is confirmed on Solana {networkLabel}.</span></div>
              <a href={explorerTx(signature, cluster)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={13} /></a>
            </div>
          )}
          <div className="security-note"><ShieldCheck size={16} /> Buyer signs the transaction. PowerPay never receives or stores wallet private keys.</div>
        </section>

        <aside className="panel side-panel" id="scan">
          <div className="scan-header">
            <div>
              <span className="section-kicker">Solana Pay</span>
              <h2>Scan To Pay</h2>
              <p className="eyebrow">A wallet-verifiable payment request for this exact checkout.</p>
            </div>
            <div className="solana-icon-box"><NetworkIcon network="solana" size={30} variant="branded" /></div>
          </div>

          <div className="side-progress-card" aria-label={`Checkout progress: step ${currentStep + 1} of 3`}>
            <div className="side-progress-copy">
              <span>Checkout progress</span>
              <strong>{signature ? "Complete" : currentStep === 1 ? "Ready to pay" : "Review purchase"}</strong>
            </div>
            <span className="side-progress-count">{currentStep + 1}/3</span>
            <div className="side-progress-track" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div>
            <div className="side-progress-meta" aria-hidden="true">
              {["Review", "Pay", "Done"].map((label, index) => (
                <span key={label} className={index <= currentStep ? "active" : ""}>{label}</span>
              ))}
            </div>
          </div>

          <div className={`qr-shell ${qrReady ? "ready" : "inactive"}`}>
            {qrReady ? (
              <QRCodeSVG value={qrUrl} level="H" includeMargin={false} size={272} aria-label="Solana Pay purchase QR code" />
            ) : (
              <div className="qr-empty">
                <ScanLine size={30} />
                <strong>{expired ? "Payment request expired" : "Waiting for a live payment request"}</strong>
                <span>{expired ? "Refresh the QR before scanning." : "Enter a valid amount and ensure the on-chain PWRC sale is enabled."}</span>
              </div>
            )}
            {qrReady && <span className="qr-logo"><img src="/assets/brand/powerpay-mark.png" alt="" /></span>}
          </div>

          <div className="mobile-open-pay">
            <Smartphone size={18} />
            <div><strong>On this device?</strong><span>Open the request directly in a compatible Solana wallet.</span></div>
            <button className="secondary-button compact" disabled={!qrReady} onClick={openSolanaPay}>Open</button>
          </div>

          <div className="checkout-marketing-card">
            <span className="marketing-icon"><Leaf size={19} /></span>
            <div className="marketing-copy">
              <span>PowerChain utility</span>
              <strong>PWRC connects digital payments with renewable infrastructure.</strong>
              <div><span>Solar</span><span>Storage</span><span>Local Energy</span></div>
            </div>
          </div>

          <div className="detail-list purchase-details">
            <div className="detail-row"><span>Purchase amount</span><strong className="green">{formatNumber(sol || 0, 4)} SOL</strong></div>
            <div className="detail-row"><span>Service fee ({POWERPAY_SERVICE_FEE_PERCENT}%)</span><strong>{formatNumber(serviceFeeSol, 4)} SOL</strong></div>
            <div className="detail-row emphasis"><span>Before network fee</span><strong>{formatNumber(totalBeforeNetworkFeeSol, 4)} SOL</strong></div>
            <div className="detail-row"><span>USD reference</span><strong>{usdTotal > 0 ? `$${formatNumber(usdTotal, 2)}` : "—"}</strong></div>
            <div className="detail-row"><span>Network</span><strong className="inline-asset"><NetworkIcon network="solana" size={18} variant="branded" /> {networkLabel}</strong></div>
            <div className="detail-row"><span>Delivery</span><strong>PWRC Token-2022</strong></div>
            <div className="detail-row"><span>PWRC mint</span><strong title={CANONICAL_PWRC_MINT}>{compactAddress(CANONICAL_PWRC_MINT, 6, 6)}</strong></div>
            {paymentReference && <div className="detail-row"><span>Reference</span><strong>{compactAddress(paymentReference, 4, 4)}</strong></div>}
          </div>

          <div className="instructions">
            {["Open your Solana wallet", "Scan or open the payment request", "Review purchase + service fee", "Approve and receive PWRC atomically"].map((text, i) => (
              <div className="instruction" key={text}><span className="number">{i + 1}</span>{text}</div>
            ))}
          </div>

          <div className="timer">
            <div><span className="subtext">Payment request</span><strong className="timer-label">{expired ? "Expired" : "Expires in"}</strong></div>
            {expired ? <button className="secondary-button compact" onClick={() => void refresh()}>Refresh QR</button> : <strong>{countdown.label}</strong>}
          </div>

          <div className="summary" id="summary">
            <div className="summary-heading"><h3>Order Summary</h3><span>{quote?.source === "onchain" ? "On-chain quote" : "Preview"}</span></div>
            <div className="detail-list">
              <div className="detail-row"><span>Purchase</span><strong>{formatNumber(sol || 0, 4)} SOL</strong></div>
              <div className="detail-row"><span>PowerPay service fee ({POWERPAY_SERVICE_FEE_PERCENT}%)</span><strong>{formatNumber(serviceFeeSol, 4)} SOL</strong></div>
              <div className="detail-row"><span>Solana network fee</span><strong>Estimated by wallet</strong></div>
              <div className="fee-divider" aria-hidden="true" />
              <div className="detail-row"><span>Gross PWRC</span><strong>{formatNumber(quote?.grossPwrc ?? 0, 3)} PWRC</strong></div>
              <div className="detail-row"><span>PWRC Token-2022 fee ({PWRC_TRANSFER_FEE_PERCENT}%)</span><strong>−{formatNumber(quote?.transferFeePwrc ?? 0, 3)} PWRC</strong></div>
              <div className="detail-row emphasis"><span>Wallet receives</span><strong>{formatNumber(quote?.netPwrc ?? 0, 3)} PWRC</strong></div>
              {publicKey ? <div className="detail-row"><span>Wallet SOL</span><strong>{walletBalances.sol == null ? "Reading…" : `${formatNumber(walletBalances.sol, 4)} SOL`}</strong></div> : null}
            </div>
            <div className="total-row">
              <div><strong>Total before network fee</strong><span>{usdTotal > 0 ? `≈ $${formatNumber(usdTotal, 2)} USD` : "USD reference unavailable"}</span></div>
              <strong>{formatNumber(totalBeforeNetworkFeeSol, 4)} SOL</strong>
            </div>
            <div className="summary-protection"><ShieldCheck size={16} /><span>Fee transparency: {POWERPAY_SERVICE_FEE_PERCENT}% service fee is charged in SOL on top of the purchase. PWRC independently applies its {PWRC_TRANSFER_FEE_PERCENT}% Token-2022 transfer fee. Solana network fees are separate.</span></div>
          </div>
        </aside>
      </div>

      <section className="panel trust-strip">
        <div className="trust-item"><span className="icon-circle"><NetworkIcon network="solana" size={24} variant="branded" /></span><div><strong>Built on Solana</strong><span>Fast · scalable · low fees</span></div></div>
        <div className="trust-item"><span className="icon-circle"><ShieldCheck size={21} /></span><div><strong>Wallet controlled</strong><span>You approve every transaction</span></div></div>
        <div className="trust-item"><span className="icon-circle"><Zap size={21} /></span><div><strong>Atomic settlement</strong><span>SOL + PWRC in one transaction</span></div></div>
        <div className="trust-item"><span className="icon-circle"><Leaf size={21} /></span><div><strong>Renewable focus</strong><span>PowerChain energy ecosystem</span></div></div>
      </section>

      <section className="panel renewables">
        <div className="section-head">
          <div><span className="section-kicker">PowerChain ecosystem</span><h3>Powering a Renewable Future</h3><p>PWRC is designed for PowerChain&apos;s renewable infrastructure, energy, settlement, and machine-economy surfaces.</p></div>
          <span className="green product-link">Renewable infrastructure</span>
        </div>
        <div className="product-grid">
          {renewableProducts.map(([Icon, name, tag]) => (
            <div className="product-card" key={name}>
              <div className="product-art"><Icon size={42} /></div>
              <div className="product-body"><strong>{name}</strong><span>{tag}</span></div>
            </div>
          ))}
        </div>
      </section>

      <MobileCheckoutBar
        method={paymentMethod === "wallet" ? "wallet" : "solana-pay"}
        sol={totalBeforeNetworkFeeSol}
        pwrc={quote?.netPwrc ?? 0}
        usd={usdTotal}
        connected={Boolean(publicKey)}
        disabled={!canBuy}
        busy={busy}
        networkLabel={networkLabel}
        production={production}
        solanaPayUrl={qrUrl}
        expired={expired}
        onWalletBuy={() => void buyWithWallet()}
        onConnect={() => setVisible(true)}
      />
    </>
  );
}
