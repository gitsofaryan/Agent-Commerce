"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const LAST_WALLET_KEY = "agent-commerce:last-wallet";

export default function WalletConnect() {
  const { connected, publicKey } = useWallet();
  const [lastWallet, setLastWallet] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const storedWallet = window.localStorage.getItem(LAST_WALLET_KEY);
    if (storedWallet) setLastWallet(storedWallet);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toBase58();
      window.localStorage.setItem(LAST_WALLET_KEY, walletAddress);
      setLastWallet(walletAddress);
    }
  }, [connected, publicKey]);

  if (!hydrated) {
    return <div className="neo-btn" style={{ padding: 0, background: "var(--brand)" }} />;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="neo-btn" style={{ padding: 0, background: "var(--brand)" }}>
        <WalletMultiButton />
      </div>
    </div>
  );
}
