"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  CANONICAL_PWRC_MINT,
  DEFAULT_BALANCE_REFRESH_MS,
  SOL_DECIMALS,
} from "@/constants/app";
import { useSolanaNetwork } from "@/context/solana-network-context";

export type WalletBalances = {
  sol: number | null;
  pwrc: number | null;
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
  refresh: () => Promise<void>;
};

const WalletBalanceContext = createContext<WalletBalances | null>(null);
const pwrcMint = new PublicKey(CANONICAL_PWRC_MINT);

export function WalletBalanceProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { cluster } = useSolanaNetwork();
  const [sol, setSol] = useState<number | null>(null);
  const [pwrc, setPwrc] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!connected || !publicKey) {
      setSol(null);
      setPwrc(null);
      setUpdatedAt(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const owner = publicKey;
      const ata = getAssociatedTokenAddressSync(
        pwrcMint,
        owner,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      const [lamportsResult, tokenAccount] = await Promise.all([
        connection.getBalance(owner, "confirmed"),
        connection.getAccountInfo(ata, "confirmed"),
      ]);

      let nextPwrc = 0;
      if (tokenAccount) {
        try {
          const balance = await connection.getTokenAccountBalance(ata, "confirmed");
          const uiAmount = Number(balance.value.uiAmountString ?? "0");
          nextPwrc = Number.isFinite(uiAmount) ? uiAmount : 0;
        } catch {
          nextPwrc = 0;
        }
      }

      setSol(lamportsResult / 10 ** SOL_DECIMALS);
      setPwrc(nextPwrc);
      setUpdatedAt(new Date().toISOString());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to read wallet balances");
    } finally {
      setLoading(false);
    }
  }, [connected, connection, publicKey]);

  useEffect(() => {
    setSol(null);
    setPwrc(null);
    setUpdatedAt(null);
    setError(null);
    void refresh();
  }, [cluster, publicKey?.toBase58(), refresh]);

  useEffect(() => {
    if (!connected || !publicKey) return;
    const run = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = window.setInterval(run, DEFAULT_BALANCE_REFRESH_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [connected, publicKey?.toBase58(), refresh]);

  const value = useMemo<WalletBalances>(
    () => ({ sol, pwrc, loading, error, updatedAt, refresh }),
    [error, loading, pwrc, refresh, sol, updatedAt],
  );

  return <WalletBalanceContext.Provider value={value}>{children}</WalletBalanceContext.Provider>;
}

export function useWalletBalances() {
  const context = useContext(WalletBalanceContext);
  if (!context) throw new Error("useWalletBalances must be used inside WalletBalanceProvider");
  return context;
}
