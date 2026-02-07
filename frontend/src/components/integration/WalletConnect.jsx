import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletMultiButton,
    WalletDisconnectButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * WalletConnect Component
 * 
 * Safe, Free, Devnet-Only Wallet Connection.
 * Wraps the application or specific section in Solana Context Providers.
 * 
 * Security:
 * - Uses standard @solana/wallet-adapter (Audited, Safe).
 * -Strictly connects to 'devnet' (No real money used).
 */
export const WalletConnect = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    // We enforce Devnet for zero-cost operation.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <div className="wallet-header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                        <WalletMultiButton />
                        {/* <WalletDisconnectButton /> Optional */}
                    </div>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
