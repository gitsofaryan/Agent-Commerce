"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { ReactNode, useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const networkName =
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === "testnet"
      ? "testnet"
      : process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
        ? "mainnet-beta"
        : "devnet";

  const network =
    networkName === "testnet"
      ? WalletAdapterNetwork.Testnet
      : networkName === "mainnet-beta"
        ? WalletAdapterNetwork.Mainnet
        : WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect localStorageKey="agent-commerce-wallet">
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export { useConnection, useWallet };
