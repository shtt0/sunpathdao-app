import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletStatus } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';
import { API_ROUTES } from '@/lib/constants';

interface WalletContextType {
  walletStatus: WalletStatus;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signAndSendTransaction: (transaction: any) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('disconnected');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Check if Phantom wallet exists
        const phantom = (window as any).phantom?.solana;
        
        if (!phantom?.isPhantom) {
          return;
        }
        
        // Check if wallet is already connected
        const { publicKey } = await phantom.connect({ onlyIfTrusted: true });
        
        if (publicKey) {
          setWalletAddress(publicKey.toString());
          setWalletStatus('connected');
          
          // Register or update user in the database
          await registerUser(publicKey.toString());
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    };
    
    checkWalletConnection();
  }, []);

  // Register user in the database
  const registerUser = async (address: string) => {
    try {
      await apiRequest('POST', API_ROUTES.USERS, { walletAddress: address });
    } catch (error) {
      console.error('Error registering user:', error);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setWalletStatus('connecting');
      
      // Check if Phantom wallet exists
      const phantom = (window as any).phantom?.solana;
      
      if (!phantom?.isPhantom) {
        console.error('Phantom wallet extension not detected');
        // Use alert to notify user since we don't have access to toast here
        alert('Phantom wallet extension is not installed. Please install it from https://phantom.app/download');
        setWalletStatus('disconnected');
        return;
      }
      
      console.log('Attempting to connect to Phantom wallet');
      
      // Connect to wallet
      const { publicKey } = await phantom.connect();
      
      if (publicKey) {
        const address = publicKey.toString();
        console.log('Connected to wallet:', address);
        setWalletAddress(address);
        setWalletStatus('connected');
        
        // Register or update user in the database
        await registerUser(address);
      } else {
        console.error('No public key returned from wallet');
        setWalletStatus('disconnected');
      }
    } catch (error) {
      console.error('Connect error:', error);
      setWalletStatus('disconnected');
      
      // Show a more user-friendly error message
      if (error instanceof Error) {
        alert(`Failed to connect wallet: ${error.message}`);
      } else {
        alert('Failed to connect wallet. Please try again.');
      }
      
      throw error;
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    try {
      const phantom = (window as any).phantom?.solana;
      
      if (phantom?.isPhantom) {
        phantom.disconnect();
      }
      
      setWalletAddress(null);
      setWalletStatus('disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Sign and send transaction
  const signAndSendTransaction = async (transaction: any): Promise<string> => {
    try {
      const phantom = (window as any).phantom?.solana;
      
      if (!phantom?.isPhantom) {
        throw new Error('Phantom wallet not installed');
      }
      
      if (walletStatus !== 'connected') {
        throw new Error('Wallet not connected');
      }
      
      // Sign the transaction
      const { signature } = await phantom.signAndSendTransaction(transaction);
      
      return signature;
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  };

  const value = {
    walletStatus,
    walletAddress,
    connectWallet,
    disconnectWallet,
    signAndSendTransaction,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
