import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { formatWalletAddress } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAppKit } from '@reown/appkit/react';

export default function ConnectWalletButton() {
  const { walletStatus, walletAddress, connectWallet, disconnectWallet } = useWallet();
  const { toast } = useToast();
  const [isAirdropLoading, setIsAirdropLoading] = useState(false);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && !!(window as any).phantom?.solana;
  });
  
  // Reown AppKit初期化
  useAppKit();
  
  // Reown AppKitのウェブコンポーネントのロードをチェック
  useEffect(() => {
    // カスタム要素が定義されているかチェック
    const isAppKitButtonDefined = !!customElements.get('appkit-button');
    console.log('AppKit Web Components available:', isAppKitButtonDefined);
  }, []);
  
  const handleConnect = async () => {
    try {
      // Check if Phantom is installed first
      if (!isPhantomInstalled) {
        toast({
          title: 'Wallet Not Found',
          description: 'Phantom wallet extension is not installed. Would you like to install it?',
          variant: 'destructive',
          action: (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('https://phantom.app/download', '_blank')}
            >
              Install
            </Button>
          ),
        });
        return;
      }
      
      await connectWallet();
      
      toast({
        title: 'Wallet Connected',
        description: `Successfully connected to wallet: ${formatWalletAddress(walletAddress || '')}`,
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      toast({
        title: 'Connection Failed',
        description: error instanceof Error 
          ? error.message 
          : 'Could not connect to wallet. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: 'Wallet Disconnected',
      description: 'Your wallet has been disconnected',
    });
  };
  
  // Devnet SOLを取得するための関数（開発用）
  const requestDevnetSol = async () => {
    if (!walletAddress) return;
    
    setIsAirdropLoading(true);
    try {
      const publicKey = new PublicKey(walletAddress);
      const connection = new Connection('https://api.devnet.solana.com');
      
      // 2 SOLをリクエスト
      const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      
      // トランザクションの確認を待つ
      const confirmation = await connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        throw new Error('Airdropの確認に失敗しました');
      }
      
      toast({
        title: "Devnet SOL受け取り成功",
        description: "2 Devnet SOLがウォレットに追加されました",
      });
      
      // 現在の残高を確認して表示
      const balance = await connection.getBalance(publicKey);
      console.log(`現在の残高: ${balance / LAMPORTS_PER_SOL} SOL`);
      
    } catch (error) {
      console.error('Airdropエラー:', error);
      toast({
        title: "Devnet SOL取得エラー",
        description: error instanceof Error ? error.message : "Devnet SOLの取得中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsAirdropLoading(false);
    }
  };
  
  // If wallet is connected, show address with dropdown to disconnect
  if (walletStatus === 'connected' && walletAddress) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <span className="material-icons text-sm">account_balance_wallet</span>
            {formatWalletAddress(walletAddress)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={requestDevnetSol}
            disabled={isAirdropLoading}
            className="cursor-pointer"
          >
            {isAirdropLoading ? (
              <>
                <span className="material-icons text-sm animate-spin mr-2">sync</span>
                リクエスト中...
              </>
            ) : (
              <>
                <span className="material-icons text-sm mr-2">payments</span>
                Devnet SOLをリクエスト
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect}>
            <span className="material-icons text-sm mr-2">logout</span>
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // If wallet is connecting, show loading state
  if (walletStatus === 'connecting') {
    return (
      <Button disabled className="flex items-center gap-2 bg-[#309898]">
        <span className="material-icons text-sm animate-spin">sync</span>
        Connecting...
      </Button>
    );
  }
  
  // ウォレット未接続時はシンプルなログインボタンのみ表示
  return (
    <div className="flex flex-col items-center">
      {/* シンプルなサインアップ/サインインボタン */}
      <Button onClick={handleConnect} className="flex items-center gap-2 w-full bg-[#309898] hover:bg-[#2a8585]">
        <span className="material-icons text-sm">account_balance_wallet</span>
        Sign up / Sign in
      </Button>
    </div>
  );
}
