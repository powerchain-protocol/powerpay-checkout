"use client";
import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { NetworkIcon, TokenIcon } from "@web3icons/react/dynamic";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { PwrcCoin } from "./pwrc-coin";
import { explorerTx } from "@/lib/solana/explorer";
import { decimalToRaw } from "@/lib/format";

export function SendApp() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [asset,setAsset]=useState<"SOL"|"PWRC">("SOL"); const [recipient,setRecipient]=useState(""); const [amount,setAmount]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [sig,setSig]=useState("");
  const [pwrcMint,setPwrcMint]=useState(process.env.NEXT_PUBLIC_PWRC_MINT ?? "");
  useEffect(()=>{ if(pwrcMint) return; fetch("/api/quote?sol=0.01",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.mint)setPwrcMint(d.mint)}).catch(()=>{}); },[pwrcMint]);
  const ready = useMemo(()=>Boolean(publicKey && recipient && Number(amount)>0 && (asset==="SOL" || pwrcMint)),[publicKey,recipient,amount,asset,pwrcMint]);
  async function submit(){
    if(!publicKey) return; setBusy(true);setError("");setSig("");
    try{
      const to=new PublicKey(recipient.trim()); const tx=new Transaction();
      if(asset==="SOL") tx.add(SystemProgram.transfer({fromPubkey:publicKey,toPubkey:to,lamports:decimalToRaw(amount,9)}));
      else {
        if(!pwrcMint) throw new Error("NEXT_PUBLIC_PWRC_MINT is not configured");
        const mint=new PublicKey(pwrcMint); const source=getAssociatedTokenAddressSync(mint,publicKey,false,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID); const dest=getAssociatedTokenAddressSync(mint,to,false,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
        if(!(await connection.getAccountInfo(dest))) tx.add(createAssociatedTokenAccountInstruction(publicKey,dest,to,mint,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID));
        const raw=decimalToRaw(amount,9); tx.add(createTransferCheckedInstruction(source,mint,dest,publicKey,raw,9,[],TOKEN_2022_PROGRAM_ID));
      }
      const signature=await sendTransaction(tx,connection); await connection.confirmTransaction(signature,"confirmed"); setSig(signature);
    }catch(e){setError(e instanceof Error?e.message:"Transaction failed");}finally{setBusy(false);}
  }
  return <div className="page-grid"><section className="panel form-panel"><h1 style={{fontSize:34}}>Send</h1><p className="eyebrow">Send SOL or PWRC from your connected wallet.</p><div className="form-grid"><label className="input-wrap"><span className="field-label">Asset</span><select className="select-input" value={asset} onChange={e=>setAsset(e.target.value as "SOL"|"PWRC")}><option>SOL</option><option>PWRC</option></select></label><label className="input-wrap"><span className="field-label">Recipient</span><input className="text-input" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Solana wallet address"/></label><label className="input-wrap"><span className="field-label">Amount</span><input className="text-input" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></label><button className="primary-button" disabled={!ready||busy} onClick={submit}>{busy?"Confirming…":<><ArrowUpRight size={18}/>Send {asset}</>}</button></div>{asset==="PWRC"&&<div className="alert">PWRC is Token-2022. Any transfer fee configured on the mint is enforced automatically by the token program.</div>}{error&&<div className="alert danger">{error}</div>}{sig&&<div className="tx-success">Confirmed. <a href={explorerTx(sig)} target="_blank" rel="noreferrer">View on Solscan</a></div>}</section><aside className="panel balance-card"><div style={{display:"flex",alignItems:"center",gap:10}}>{asset==="SOL"?<TokenIcon symbol="SOL" size={38} variant="branded"/>:<PwrcCoin/>}<div><strong>{asset}</strong><div className="subtext">Solana</div></div></div><div className="security-note"><ShieldCheck size={16}/>The connected wallet signs every transfer.</div>{!publicKey&&<div className="alert">Connect a wallet from the header to send assets.</div>}</aside></div>;
}
