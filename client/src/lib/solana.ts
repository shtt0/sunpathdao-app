import { PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Solana mainnet or devnet endpoint
const SOLANA_NETWORK = 'devnet'; // Default to devnet for development
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

export const connection = new Connection(SOLANA_RPC_URL);

// Convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

// Create a transaction to send SOL from one wallet to another
export async function createTransferTransaction(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  solAmount: number
): Promise<Transaction> {
  try {
    const lamports = solToLamports(solAmount);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );
    
    // Get the latest blockhash for the transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;
    
    return transaction;
  } catch (error) {
    console.error('Error creating transfer transaction:', error);
    throw new Error('Failed to create transfer transaction');
  }
}

// Check if an account has enough SOL
export async function hasEnoughSol(
  pubkey: PublicKey,
  requiredSol: number
): Promise<boolean> {
  try {
    const balance = await connection.getBalance(pubkey);
    const requiredLamports = solToLamports(requiredSol);
    
    // Include some buffer for transaction fees (0.000005 SOL)
    const feeBuffer = 5000;
    
    return balance >= (requiredLamports + feeBuffer);
  } catch (error) {
    console.error('Error checking balance:', error);
    return false;
  }
}

// Get SOL balance for a public key
export async function getSolBalance(pubkey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(pubkey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

// Confirm a transaction
export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const confirmation = await connection.confirmTransaction(signature);
    return !confirmation.value.err;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
}
