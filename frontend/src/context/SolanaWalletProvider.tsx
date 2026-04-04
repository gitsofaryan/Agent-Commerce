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
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";

const DISCONNECTED_PORT_ERROR = /disconnected port object/i;

function isDisconnectedPortError(errorLike: unknown) {
  if (typeof errorLike === "string") {
    return DISCONNECTED_PORT_ERROR.test(errorLike);
  }

  if (errorLike instanceof Error) {
    return DISCONNECTED_PORT_ERROR.test(errorLike.message) ||
      DISCONNECTED_PORT_ERROR.test(errorLike.stack ?? "");
  }

  if (typeof errorLike === "object" && errorLike && "message" in errorLike) {
    const maybeMessage = (errorLike as { message?: unknown }).message;
    return typeof maybeMessage === "string" && DISCONNECTED_PORT_ERROR.test(maybeMessage);
  }

  return false;
}

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

  const onWalletError = useCallback((error: Error) => {
    if (isDisconnectedPortError(error)) {
      console.warn("Ignored disconnected wallet extension port error.");
      return;
    }

    console.error("Wallet adapter error:", error);
  }, []);

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const extensionSource = event.filename?.startsWith("chrome-extension://");
      if (extensionSource && isDisconnectedPortError(event.message)) {
        event.preventDefault();
        console.warn("Suppressed external wallet extension port disconnect error.");
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isDisconnectedPortError(event.reason)) {
        event.preventDefault();
        console.warn("Suppressed wallet extension disconnected port rejection.");
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={onWalletError}
        localStorageKey="agent-commerce-wallet"
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export { useConnection, useWallet };
