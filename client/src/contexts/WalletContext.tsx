import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletStatus } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';
import { API_ROUTES } from '@/lib/constants';
import { createAppKit, useAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';

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
  // Reown AppKitへのアクセスを取得 (App.tsxですでに初期化されています)
  const appKit = useAppKit();

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

  // Connect wallet using AppKit (supports Email & Social Login) or fallback to Phantom
  const connectWallet = async () => {
    try {
      setWalletStatus('connecting');
      
      // Try to use AppKit if available
      if (appKit && typeof appKit.open === 'function') {
        console.log('Opening Reown AppKit modal for wallet connection');
        
        try {
          // Open AppKit modal - this is the correct method based on docs
          await appKit.open();
          
          // If we have an onConnect callback, address will be available there
          // For now, we'll use Phantom as fallback
          const phantom = (window as any).phantom?.solana;
          
          if (phantom?.isPhantom) {
            console.log('Attempting to connect to Phantom wallet');
            const { publicKey } = await phantom.connect();
            
            if (publicKey) {
              const address = publicKey.toString();
              console.log('Connected to wallet:', address);
              setWalletAddress(address);
              setWalletStatus('connected');
              
              // Register or update user in the database
              await registerUser(address);
              return;
            }
          }
        } catch (appKitError) {
          console.error('AppKit connection error:', appKitError);
          // Continue to fallback method
        }
      }
      
      // Fallback to Phantom wallet
      const phantom = (window as any).phantom?.solana;
      
      if (!phantom?.isPhantom) {
        console.error('Phantom wallet extension not detected');
        alert('Wallet connection failed. Please install Phantom wallet from https://phantom.app/download');
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
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    try {
      // Try to disconnect using AppKit first - using close() instead of disconnect() since that's what's available
      if (appKit && typeof appKit.close === 'function') {
        appKit.close();
      } else {
        // Fallback to phantom disconnect for backward compatibility
        const phantom = (window as any).phantom?.solana;
        if (phantom?.isPhantom) {
          phantom.disconnect();
        }
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
      // AppKit はWalletConnectプロトコルを使用するため、標準インターフェースを使用
      // 現在はPhantomウォレットへのフォールバックを行う
      const phantom = (window as any).phantom?.solana;
      
      if (!phantom?.isPhantom) {
        throw new Error('Wallet not available');
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
