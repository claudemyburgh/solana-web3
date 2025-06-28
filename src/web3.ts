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

        async connectWallet() {
            if (!window.solana) {
                this.output =
                    'No wallet found. Install Phantom or another Solana wallet.'
                return
            }

            try {
                const response = await window.solana.connect()
                const publicKey = response.publicKey

                this.walletAddress = publicKey.toBase58()
                this.walletConnected = true
                this.output = 'Fetching balance...'
                await this.getBalance()
            } catch (err) {
                console.error('Connection failed:', err)
                this.output = 'Failed to connect wallet.'
            }
        },

        async getBalance() {
            const connection = new Connection(
                clusterApiUrl('devnet'),
                'confirmed'
            )
            try {
                const pubKey = new PublicKey(this.walletAddress)
                const balance = await connection.getBalance(pubKey)
                this.balance = (balance / LAMPORTS_PER_SOL).toFixed(4)
                this.output = ''
            } catch (err) {
                console.error('Fetch balance failed:', err)
                this.output = 'Failed to fetch balance.'
            }
        },

        async sendSol() {
            const recipient = prompt('Enter recipient wallet address:')
            if (!recipient) return

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

                const signedTx =
                    await window.solana!.signAndSendTransaction(transaction)
                this.output = `Transaction sent: ${signedTx.signature}`
            } catch (err) {
                console.error('Send failed:', err)
                this.output = 'Failed to send transaction.'
            }
        },
    }
}

// Mount Alpine
document.addEventListener('alpine:init', () => {
    window.Alpine.store('phantomWallet', phantomWallet)
})
