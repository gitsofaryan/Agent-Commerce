import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";

export interface UserIdentity {
  wallet: string;
  verified: boolean;
  balance: number;
  connected: boolean;
}

export function useUserIdentity(): UserIdentity {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (wallet.publicKey) {
      connection
        .getBalance(wallet.publicKey)
        .then((bal) => setBalance(bal / 1e9)) // Convert lamports to SOL
        .catch(() => setBalance(0));
    }
  }, [wallet.publicKey, connection]);

  return {
    wallet: wallet.publicKey?.toBase58() || "",
    verified: !!wallet.publicKey,
    balance,
    connected: wallet.connected,
  };
}
