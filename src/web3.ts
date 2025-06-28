import {
    clusterApiUrl,
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    // SystemProgram, // Not using sendSol for now to keep it simple
    // Transaction,
} from '@solana/web3.js';

// Define the Phantom Provider interface
interface PhantomProvider {
    publicKey: PublicKey | null;
    isConnected: boolean;
    isPhantom: boolean;
    connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
    disconnect: () => Promise<void>;
    signAndSendTransaction: (transaction: any, options?: any) => Promise<{ signature: string }>;
    // Add other methods if needed, e.g., signTransaction, signMessage
}

// Access the Phantom provider from window
const getPhantomProvider = (): PhantomProvider | null => {
    if ('solana' in window) {
        const provider = (window as any).solana;
        if (provider.isPhantom) {
            return provider as PhantomProvider;
        }
    }
    // For a better UX, you might want to redirect users to install Phantom here
    // window.open('https://phantom.app/', '_blank');
    return null;
};


export const createPhantomWalletStore = () => {
    return {
        publicKey: null as string | null,
        isConnected: false,
        balance: '0',
        isLoading: false,
        message: '',
        messageType: 'info', // 'info', 'success', 'error'

        _provider: getPhantomProvider(),

        async _updateBalance() {
            if (!this.publicKey || !this._provider) return;
            this.isLoading = true;
            this.message = 'Fetching balance...';
            this.messageType = 'info';
            try {
                const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
                const lamports = await connection.getBalance(new PublicKey(this.publicKey));
                this.balance = (lamports / LAMPORTS_PER_SOL).toFixed(4);
                this.message = 'Balance updated.';
                this.messageType = 'success';
            } catch (error) {
                console.error('Error fetching balance:', error);
                this.balance = '0';
                this.message = 'Failed to fetch balance.';
                this.messageType = 'error';
            } finally {
                this.isLoading = false;
            }
        },

        async init() {
            this.isLoading = true;
            this.message = 'Initializing wallet...';
            this.messageType = 'info';

            if (!this._provider) {
                this.message = 'Phantom Wallet not found. Please install it.';
                this.messageType = 'error';
                this.isLoading = false;
                return;
            }

            // Try to connect if already trusted (e.g., on page refresh)
            try {
                const resp = await this._provider.connect({ onlyIfTrusted: true });
                this.publicKey = resp.publicKey.toBase58();
                this.isConnected = true;
                this.message = 'Wallet connected.';
                this.messageType = 'success';
                await this._updateBalance();
            } catch (error) {
                // This error is expected if not already trusted or if the user chose not to connect previously
                this.message = 'Please connect your wallet.';
                this.messageType = 'info';
                this.isConnected = false;
                this.publicKey = null;
            } finally {
                this.isLoading = false;
            }
        },

        async connectWallet() {
            if (!this._provider) {
                this.message = 'Phantom Wallet not found. Please install it to connect.';
                this.messageType = 'error';
                return;
            }
            this.isLoading = true;
            this.message = 'Connecting to Phantom... Please approve in the wallet.';
            this.messageType = 'info';
            try {
                const resp = await this._provider.connect();
                this.publicKey = resp.publicKey.toBase58();
                this.isConnected = true;
                this.message = 'Wallet connected successfully!';
                this.messageType = 'success';
                await this._updateBalance();
            } catch (error: any) {
                console.error('Error connecting wallet:', error);
                this.publicKey = null;
                this.isConnected = false;
                this.message = `Failed to connect: ${error.message || 'User rejected request.'}`;
                this.messageType = 'error';
            } finally {
                this.isLoading = false;
            }
        },

        async disconnectWallet() {
            if (!this._provider || !this.isConnected) return;
            this.isLoading = true;
            this.message = 'Disconnecting...';
            this.messageType = 'info';
            try {
                await this._provider.disconnect();
            } catch (error) {
                console.error('Error disconnecting wallet:', error);
                // Even if provider disconnect fails, reset state locally
            } finally {
                this.publicKey = null;
                this.isConnected = false;
                this.balance = '0';
                this.message = 'Wallet disconnected.';
                this.messageType = 'info';
                this.isLoading = false;
            }
        },

        async fetchBalance() {
            if (!this.isConnected || !this.publicKey) {
                this.message = 'Connect wallet to refresh balance.';
                this.messageType = 'error';
                return;
            }
            await this._updateBalance();
        }
    };
};

// Register the store with Alpine
document.addEventListener('alpine:init', () => {
    Alpine.store('wallet', createPhantomWalletStore());
});
