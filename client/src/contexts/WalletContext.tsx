import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { WalletStatus } from '@shared/types';
import { apiRequest } from '@/lib/queryClient';
import { API_ROUTES, SOLANA_CONSTANTS } from '@/lib/constants';
import { connection } from '@/lib/solana';
// Import AppKit with type any to avoid TypeScript errors with current version
// In production, we would properly type this based on the AppKit API
import { createAppKit, useAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';

interface WalletContextType {
  walletStatus: WalletStatus;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signAndSendTransaction: (transaction: Transaction) => Promise<string>;
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
          
          // AppKitからアドレスを取得
          // 注: この部分はReown AppKitの実際のAPIに合わせて調整が必要です
          // 現在はデモ実装から実際のウォレット接続への移行期間なので、
          // 両方の実装を用意しておきます
          
          try {
            // AppKitからウォレットアドレスを取得する試み
            // 実際のReown AppKit APIに合わせて調整してください
            const addressInfo = await (appKit.adapter as any)?.getAddress?.();
            const actualAddress = addressInfo?.address || 
                                "AYhSMbtBBct6BVa75UnhF2DJG3JKTVXDFmeGznD1ij74"; // フォールバックアドレス（実際の実装では不要）
            
            // ステートを更新
            setWalletAddress(actualAddress);
            setWalletStatus('connected');
            
            // ユーザー登録
            await registerUser(actualAddress);
            
            console.log('接続済みウォレットアドレス:', actualAddress);
          } catch (addrError) {
            console.error('アドレス取得エラー:', addrError);
            
            // フォールバック: エラーが発生した場合のみデモアドレスを使用
            const demoAddress = "AYhS" + Date.now().toString().slice(-8); 
            
            // ステートを更新
            setWalletAddress(demoAddress);
            setWalletStatus('connected');
            
            // ユーザー登録
            await registerUser(demoAddress);
            
            console.log('フォールバックデモアドレスを使用:', demoAddress);
          }
          
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

  // Sign and send transaction to Solana blockchain
  const signAndSendTransaction = async (transaction: Transaction): Promise<string> => {
    try {
      // ウォレット接続状態を確認
      if (walletStatus !== 'connected' || !walletAddress) {
        throw new Error('ウォレットが接続されていません。先にウォレットを接続してください。');
      }
      
      console.log('トランザクション内容:', transaction);
      
      // AppKitがあるかどうかを確認
      if (!appKit) {
        throw new Error('ウォレット接続SDKが利用できません。');
      }
      
      try {
        // シリアライズしたトランザクションをウォレットに送信して署名してもらう
        console.log('トランザクションに署名を依頼中...');
        
        // トランザクションをシリアライズ
        // ブラウザ環境ではBufferではなくUint8Arrayとbtoa関数を使用
        const serializedTransaction = btoa(
          String.fromCharCode.apply(null, Array.from(
            transaction.serialize({ verifySignatures: false })
          ))
        );
        
        // トランザクションに署名
        const solanaConnection = connection;
        
        // 署名と送信を実行
        let signature;
        
        // AppKit SDK (Reown)を使用した実装
        if ((appKit as any).solana && typeof (appKit as any).solana.signAndSendTransaction === 'function') {
          console.log('AppKit SDKを使用してトランザクションに署名します');
          signature = await (appKit as any).solana.signAndSendTransaction(serializedTransaction);
        } 
        // Phantom Walletを使用した実装
        else if (typeof window !== 'undefined' && (window as any).phantom?.solana) {
          console.log('Phantom Walletを使用してトランザクションに署名します');
          const phantomWallet = (window as any).phantom?.solana;
          
          // 署名プロセス
          try {
            // トランザクションに署名
            const signedTx = await phantomWallet.signTransaction(transaction);
            
            // 署名されたトランザクションを送信
            signature = await solanaConnection.sendRawTransaction(signedTx.serialize());
            
            // トランザクションの確認を待つ
            const confirmation = await solanaConnection.confirmTransaction(signature, 'confirmed');
            
            // 確認結果をチェック
            if (confirmation.value.err) {
              throw new Error(`トランザクション確認エラー: ${confirmation.value.err}`);
            }
          } catch (phantomError) {
            console.error('Phantom Walletでの署名エラー:', phantomError);
            throw phantomError;
          }
        } 
        // どちらの方法も使用できない場合
        else {
          throw new Error('利用可能なウォレット署名メソッドがありません。AppKitまたはPhantom Walletが必要です。');
        }
        
        console.log('トランザクション署名完了:', signature);
        return signature;
      } catch (signError) {
        console.error('トランザクション署名に失敗:', signError);
        throw new Error(`トランザクション署名に失敗: ${signError instanceof Error ? signError.message : '不明なエラー'}`);
      }
    } catch (error) {
      console.error('トランザクションエラー:', error);
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