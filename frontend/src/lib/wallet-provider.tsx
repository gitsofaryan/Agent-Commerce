"use client";

import React, {
    FC,
    ReactNode,
    createContext,
    useContext,
    useMemo,
} from "react";
import {
    ConnectionProvider,
    WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import {
    WalletModalProvider,
    WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

interface WalletContextType {
    isConnected: boolean;
}

const WalletContext = createContext<WalletContextType>({
    isConnected: false,
});

export const useWalletContext = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWalletContext must be used within WalletProvider");
    }
    return context;
};

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const network = "devnet";
    const endpoint = useMemo(() => clusterApiUrl(network as any), [network]);

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
            <SolanaWalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletContext.Provider value={{ isConnected: true }}>
                        {children}
                    </WalletContext.Provider>
                </WalletModalProvider>
            </SolanaWalletProvider>
        </ConnectionProvider>
    );
};

export { WalletMultiButton };
