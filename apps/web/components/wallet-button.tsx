"use client";
import { Wallet } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { compactAddress } from "@/lib/format";

export function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  if (connected && publicKey) {
    return <button className="wallet-button connected" onClick={() => disconnect()} title="Disconnect wallet"><Wallet size={17}/>{compactAddress(publicKey.toBase58())}</button>;
  }
  return <button className="wallet-button" onClick={() => setVisible(true)}><Wallet size={17}/>Connect wallet</button>;
}
