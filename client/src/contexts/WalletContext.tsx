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

  // Register user in the database
  const registerUser = async (address: string) => {
    try {
      await apiRequest('POST', API_ROUTES.USERS, { walletAddress: address });
      console.log('User registered successfully with address:', address);
    } catch (error) {
      console.error('Error registering user:', error);
    }
  };

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

  // Connect wallet using AppKit
  const connectWallet = async () => {
    try {
      setWalletStatus('connecting');
      
      if (appKit && typeof appKit.open === 'function') {
        console.log('Opening Reown AppKit modal');
        
        try {
          // ウォレット接続を試みる
          await appKit.open();
          
          // デモ環境用のアドレスを生成
          const demoAddress = "Demo" + Date.now().toString().slice(-8);
          
          // ステートを更新
          setWalletAddress(demoAddress);
          setWalletStatus('connected');
          
          // ユーザー登録
          await registerUser(demoAddress);
          
        } catch (error) {
          console.error('AppKit connection error:', error);
          setWalletStatus('disconnected');
        }
      } else {
        console.error('AppKit not available');
        alert('Wallet connection service is unavailable');
        setWalletStatus('disconnected');
      }
    } catch (error) {
      console.error('Connect error:', error);
      setWalletStatus('disconnected');
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    try {
      if (appKit && typeof appKit.close === 'function') {
        appKit.close();
      } else {
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
      if (walletStatus !== 'connected') {
        throw new Error('Wallet not connected');
      }
      
      if (appKit) {
        throw new Error('Transaction signing not yet implemented with AppKit');
      } else {
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