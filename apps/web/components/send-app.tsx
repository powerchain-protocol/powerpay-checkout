"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedWithFeeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { TokenIcon } from "@web3icons/react/dynamic";
import { ArrowUpRight, Check, Clipboard, Info, ShieldCheck, Wallet } from "lucide-react";
import { PwrcCoin } from "./pwrc-coin";
import { explorerTx } from "@/lib/solana/explorer";
import { compactAddress, decimalToRaw, formatNumber } from "@/lib/format";
import { CANONICAL_PWRC_MINT, PWRC_DECIMALS, PWRC_TRANSFER_FEE_PERCENT } from "@/constants/app";
import { canonicalPwrcMint, quotePwrcTransferFee, type PwrcTransferFeeQuote } from "@/lib/solana/token-fee";

export function SendApp() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [asset, setAsset] = useState<"SOL" | "PWRC">("SOL");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sig, setSig] = useState("");
  const [feeQuote, setFeeQuote] = useState<PwrcTransferFeeQuote | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  useEffect(() => {
    if (asset !== "PWRC" || !amount || Number(amount) <= 0) {
      setFeeQuote(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setFeeLoading(true);
      try {
        const raw = decimalToRaw(amount, PWRC_DECIMALS);
        const next = await quotePwrcTransferFee(connection, canonicalPwrcMint(), raw);
        if (!cancelled) setFeeQuote(next);
      } catch {
        if (!cancelled) setFeeQuote(null);
      } finally {
        if (!cancelled) setFeeLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [amount, asset, connection]);

  const recipientValid = useMemo(() => {
    if (!recipient.trim()) return false;
    try {
      new PublicKey(recipient.trim());
      return true;
    } catch {
      return false;
    }
  }, [recipient]);

  const ready = Boolean(publicKey && recipientValid && Number(amount) > 0 && (asset === "SOL" || feeQuote));

  async function pasteRecipient() {
    try {
      const value = await navigator.clipboard.readText();
      if (value) setRecipient(value.trim());
    } catch {
      setError("Clipboard access was not available. Paste the address manually.");
    }
  }

  async function submit() {
    if (!publicKey || !ready) return;
    setBusy(true);
    setError("");
    setSig("");

    try {
      const to = new PublicKey(recipient.trim());
      const tx = new Transaction();

      if (asset === "SOL") {
        tx.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: to, lamports: decimalToRaw(amount, 9) }));
      } else {
        const mint = canonicalPwrcMint();
        const source = getAssociatedTokenAddressSync(mint, publicKey, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const dest = getAssociatedTokenAddressSync(mint, to, false, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

        if (!(await connection.getAccountInfo(dest))) {
          tx.add(createAssociatedTokenAccountInstruction(publicKey, dest, to, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
        }

        const raw = decimalToRaw(amount, PWRC_DECIMALS);
        const exactFee = await quotePwrcTransferFee(connection, mint, raw);
        tx.add(createTransferCheckedWithFeeInstruction(
          source,
          mint,
          dest,
          publicKey,
          raw,
          PWRC_DECIMALS,
          exactFee.feeRaw,
          [],
          TOKEN_2022_PROGRAM_ID,
        ));
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      setSig(signature);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel form-panel transaction-panel">
        <span className="section-kicker">Wallet transfer</span>
        <h1 className="page-title">Send assets</h1>
        <p className="eyebrow">Send SOL or PWRC from your connected Solana wallet. You review and sign every transaction.</p>

        <div className="asset-segment" role="radiogroup" aria-label="Asset">
          <button type="button" className={asset === "SOL" ? "active" : ""} onClick={() => setAsset("SOL")}>
            <TokenIcon symbol="SOL" size={24} variant="branded" />SOL
          </button>
          <button type="button" className={asset === "PWRC" ? "active" : ""} onClick={() => setAsset("PWRC")}>
            <PwrcCoin />PWRC
          </button>
        </div>

        <div className="form-grid">
          <label className="input-wrap">
            <span className="field-label">Recipient address</span>
            <div className={`input-action-wrap ${recipient && !recipientValid ? "invalid" : ""}`}>
              <input
                className="text-input"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="Solana wallet address"
                autoComplete="off"
              />
              <button type="button" className="input-action" onClick={() => void pasteRecipient()}><Clipboard size={15} />Paste</button>
            </div>
            {recipient && !recipientValid && <span className="field-error">Enter a valid Solana address.</span>}
          </label>

          <label className="input-wrap">
            <span className="field-label">Amount</span>
            <div className="amount-entry-row">
              <span className="amount-entry-asset">{asset === "SOL" ? <TokenIcon symbol="SOL" size={22} variant="branded" /> : <PwrcCoin />}{asset}</span>
              <input className="text-input amount-entry-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
            </div>
          </label>

          {!publicKey ? (
            <button className="primary-button" onClick={() => setVisible(true)}><Wallet size={18} />Connect wallet</button>
          ) : (
            <button className="primary-button" disabled={!ready || busy} onClick={() => void submit()}>
              {busy ? "Confirming…" : <><ArrowUpRight size={18} />Review & send {asset}</>}
            </button>
          )}
        </div>

        {asset === "PWRC" && <div className="alert"><Info size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />PWRC uses the canonical Token-2022 mint and enforces a {PWRC_TRANSFER_FEE_PERCENT}% transfer fee. The expected fee is embedded in the transfer instruction; Solana network fees are separate.</div>}
        {error && <div className="alert danger" role="alert">{error}</div>}
        {sig && <div className="tx-success"><span className="success-icon"><Check size={17} /></span><div><strong>Transfer confirmed</strong><span>{asset} was submitted successfully.</span></div><a href={explorerTx(sig)} target="_blank" rel="noreferrer">View transaction</a></div>}
      </section>

      <aside className="panel balance-card transaction-review">
        <span className="section-kicker">Transfer review</span>
        <div className="transaction-asset-head">
          {asset === "SOL" ? <TokenIcon symbol="SOL" size={38} variant="branded" /> : <PwrcCoin />}
          <div><strong>{asset}</strong><span>Solana</span></div>
        </div>
        <div className="review-list">
          <div><span>From</span><strong>{publicKey ? compactAddress(publicKey.toBase58(), 5, 5) : "Not connected"}</strong></div>
          <div><span>To</span><strong>{recipientValid ? compactAddress(recipient.trim(), 5, 5) : "Not set"}</strong></div>
          <div><span>Amount</span><strong>{Number(amount) > 0 ? `${amount} ${asset}` : "—"}</strong></div>
          {asset === "PWRC" && <div><span>PWRC fee ({PWRC_TRANSFER_FEE_PERCENT}%)</span><strong>{feeLoading ? "Loading…" : feeQuote ? `${formatNumber(Number(feeQuote.feeRaw) / 1e9, 6)} PWRC` : "Unavailable"}</strong></div>}
          {asset === "PWRC" && <div><span>Recipient receives</span><strong>{feeQuote ? `${formatNumber(Number(feeQuote.netRaw) / 1e9, 6)} PWRC` : "—"}</strong></div>}
          {asset === "PWRC" && <div><span>Mint</span><strong title={CANONICAL_PWRC_MINT}>{compactAddress(CANONICAL_PWRC_MINT, 6, 6)}</strong></div>}
          <div><span>Network fee</span><strong>Estimated by wallet</strong></div>
        </div>
        <div className="security-note"><ShieldCheck size={16} />The connected wallet signs every transfer. PowerPay does not custody your assets.</div>
      </aside>
    </div>
  );
}
