"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { NetworkIcon } from "@web3icons/react/dynamic";

export function ReceiveApp(){
  const {publicKey}=useWallet(); const [amount,setAmount]=useState(""); const [url,setUrl]=useState(""); const [copied,setCopied]=useState(false);
  useEffect(()=>{ if(!publicKey){setUrl("");return;} const id=setTimeout(async()=>{const qs=new URLSearchParams({recipient:publicKey.toBase58()});if(Number(amount)>0)qs.set("amount",amount);const r=await fetch(`/api/solana-pay/receive?${qs}`);const d=await r.json();setUrl(d.url??"");},200); return()=>clearTimeout(id);},[publicKey,amount]);
  async function copy(){if(!publicKey)return;await navigator.clipboard.writeText(publicKey.toBase58());setCopied(true);setTimeout(()=>setCopied(false),1200)}
  return <div className="page-grid"><section className="panel form-panel"><h1 style={{fontSize:34}}>Receive</h1><p className="eyebrow">Share your address or a Solana Pay QR code.</p>{publicKey?<><div className="receive-qr">{url&&<QRCodeSVG value={url} level="M" size={320}/>}</div><label className="input-wrap"><span className="field-label">Optional SOL amount</span><input className="text-input" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Leave blank for any amount"/></label></>:<div className="alert">Connect a wallet to generate your receive QR.</div>}</section><aside className="panel balance-card"><div style={{display:"flex",alignItems:"center",gap:10}}><NetworkIcon network="solana" size={38} variant="branded"/><div><strong>Solana address</strong><div className="subtext">Wallet Standard</div></div></div><div className="address-box">{publicKey?.toBase58()??"Not connected"}</div><button className="secondary-button" disabled={!publicKey} onClick={copy}>{copied?<><Check size={17}/>Copied</>:<><Copy size={17}/>Copy address</>}</button></aside></div>
}
