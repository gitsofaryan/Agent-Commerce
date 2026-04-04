"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export default function UserIdentity() {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [balance, setBalance] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!wallet.publicKey) {
            setBalance(0);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const bal = await connection.getBalance(wallet.publicKey!);
                if (!cancelled) {
                    setBalance(bal / 1e9); // Convert lamports to SOL
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch balance:", err);
                    setBalance(0);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [wallet.publicKey, connection]);

    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    return (
        <div className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs mono" style={{ color: "var(--muted)" }}>
                        Solana Identity
                    </p>
                    {wallet.connected && wallet.publicKey ? (
                        <div>
                            <p className="font-bold mono text-sm">
                                {truncateAddress(wallet.publicKey.toBase58())}
                            </p>
                            <p className="text-xs mono mt-1">
                                Balance:{" "}
                                <span className="font-bold">
                                    {`${balance.toFixed(3)} SOL`}
                                </span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                            Not connected
                        </p>
                    )}
                </div>
                <WalletMultiButton />
            </div>
        </div>
    );
}
