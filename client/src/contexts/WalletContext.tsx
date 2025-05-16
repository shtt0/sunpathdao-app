import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletStatus } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';
import { API_ROUTES } from '@/lib/constants';
// Import AppKit with type any to avoid TypeScript errors with current version
// In production, we would properly type this based on the AppKit API
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

  // Connect wallet using AppKit (supports Email & Social Login) only
  const connectWallet = async () => {
    try {
      setWalletStatus('connecting');
      
      // Use AppKit if available
      if (appKit && typeof appKit.open === 'function') {
        console.log('Opening Reown AppKit modal for wallet connection');
        
        try {
          // ウォレット接続をリクエスト
          const response = await appKit.open();
          
          // 接続成功した場合（ユーザーが承認した場合）
          if (response) {
            console.log('AppKit connection successful');
            const generatedAddr = "Demo" + Date.now().toString().slice(-8);
            setWalletAddress(generatedAddr);
            setWalletStatus('connected');
            await registerUser(generatedAddr);
          } else {
            // ユーザーがキャンセルした場合
            console.log('AppKit connection was canceled by user');
            setWalletStatus('disconnected');
          }
        } catch (appKitError) {
          // エラー発生時
          console.error('AppKit connection error:', appKitError);
          setWalletStatus('disconnected');
          alert('Failed to connect wallet. Please try again.');
        }
        
        return;
      }
      
      // AppKitが利用できない場合
      console.error('AppKit not available for wallet connection');
      alert('Wallet connection service is unavailable. Please try again later.');
      setWalletStatus('disconnected');
    } catch (error) {
      console.error('Connect error:', error);
      setWalletStatus('disconnected');
      
      // エラーメッセージを表示
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
      // Check if wallet is connected
      if (walletStatus !== 'connected') {
        throw new Error('Wallet not connected');
      }
      
      // Use AppKit to sign and send transaction if available
      if (appKit) {
        // AppKit doesn't directly expose signAndSendTransaction in our current setup
        // This will need to be implemented based on AppKit's API
        throw new Error('Transaction signing not yet implemented with AppKit');
      } else {
        // If no signing method is available
        throw new Error('No wallet available for signing');
      }
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
