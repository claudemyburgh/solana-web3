import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from '@solana/web3.js'

declare global {
    interface Window {
        solana?: {
            isPhantom?: boolean
            connect(): Promise<{ publicKey: PublicKey }>
            disconnect(): void
            signAndSendTransaction(
                transaction: any
            ): Promise<{ signature: string }>
            publicKey: PublicKey
        }
    }
}

export const phantomWallet = () => {
    return {
        walletConnected: false,
        walletAddress: '',
        balance: '0',
        output: '',
        isLoading: false,

        async init() {
            // Try to auto-connect if wallet was previously connected and approved.
            // Phantom specific: `connect({ onlyIfTrusted: true })`
            if (window.solana && window.solana.isPhantom) {
                this.isLoading = true;
                this.output = "Checking wallet status...";
                try {
                    // Attempt to connect silently
                    const resp = await window.solana.connect({ onlyIfTrusted: true });
                    // If connect doesn't throw, it means it's connected or reconnected.
                    // Phantom might not return publicKey here, so we check window.solana.publicKey
                    if (window.solana.publicKey) {
                        this.walletAddress = window.solana.publicKey.toBase58();
                        this.walletConnected = true;
                        this.output = 'Wallet auto-reconnected. Fetching balance...';
                        await this.getBalance(); // Also sets isLoading to false in its finally block
                    } else {
                        // This case should ideally not happen if onlyIfTrusted succeeds without error
                        // and publicKey is not set, but as a fallback:
                        this.output = 'Please connect your wallet.';
                        this.isLoading = false;
                    }
                } catch (error) {
                    // This error is expected if the wallet is not connected or not trusted
                    console.info('Silent connection failed:', error);
                    this.output = 'Please connect your wallet.';
                    this.walletConnected = false;
                    this.walletAddress = '';
                    this.balance = '0';
                    this.isLoading = false;
                }
            } else {
                this.output = 'Phantom Wallet not available. Please install it.';
                this.isLoading = false;
            }
        },

        async connectWallet() {
            if (!window.solana || !window.solana.isPhantom) {
                this.output =
                    'No wallet found. Install Phantom or another Solana wallet.'
                return
            }
            this.isLoading = true;
            this.output = 'Connecting to wallet...';
            try {
                const response = await window.solana.connect()
                const publicKey = response.publicKey

                this.walletAddress = publicKey.toBase58()
                this.walletConnected = true
                this.output = 'Wallet connected. Fetching balance...'
                await this.getBalance() // getBalance will set isLoading to false
            } catch (err) {
                console.error('Connection failed:', err)
                this.output = 'Failed to connect wallet.'
                this.isLoading = false; // Explicitly set here in case getBalance is not called
            }
        },

        async getBalance() {
            if (!this.walletAddress) {
                this.output = "Wallet not connected. Cannot fetch balance.";
                return;
            }
            this.isLoading = true;
            this.output = 'Refreshing balance...';
            const connection = new Connection(
                clusterApiUrl('devnet'),
                'confirmed'
            )
            try {
                const pubKey = new PublicKey(this.walletAddress)
                const balance = await connection.getBalance(pubKey)
                this.balance = (balance / LAMPORTS_PER_SOL).toFixed(4)
                this.output = 'Balance updated.'
            } catch (err) {
                console.error('Fetch balance failed:', err)
                this.output = 'Failed to fetch balance.'
            } finally {
                this.isLoading = false;
            }
        },

        async sendSol() {
            const recipient = prompt('Enter recipient wallet address:')
            if (!recipient) return

            if (!this.walletAddress) {
                this.output = "Wallet not connected. Cannot send SOL.";
                return;
            }
            this.isLoading = true;
            this.output = 'Preparing transaction...';

            const connection = new Connection(
                clusterApiUrl('devnet'),
                'confirmed'
            )
            const pubKey = new PublicKey(this.walletAddress)

            try {
                const transaction = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: pubKey,
                        toPubkey: new PublicKey(recipient),
                        lamports: LAMPORTS_PER_SOL * 0.001, // 0.001 SOL
                    })
                )

                const { blockhash } = await connection.getLatestBlockhash()
                transaction.recentBlockhash = blockhash
                transaction.feePayer = pubKey

                this.output = 'Please approve the transaction in your wallet...';
                const signedTx =
                    await window.solana!.signAndSendTransaction(transaction)
                this.output = `Transaction sent: ${signedTx.signature}`
            } catch (err) {
                console.error('Send failed:', err)
                this.output = 'Failed to send transaction.'
            } finally {
                this.isLoading = false;
            }
        },

        async disconnectWallet() {
            if (window.solana && typeof window.solana.disconnect === 'function') {
                try {
                    await window.solana.disconnect();
                } catch (err) {
                    console.error('Error during disconnect:', err);
                    // Even if disconnect throws, we proceed to clear state locally
                }
            }
            this.walletConnected = false;
            this.walletAddress = '';
            this.balance = '0';
            this.output = 'Wallet disconnected.';
            this.isLoading = false; // Ensure loader is hidden
        }
    }
}

// Mount Alpine
document.addEventListener('alpine:init', () => {
    window.Alpine.store('phantomWallet', phantomWallet)
})
