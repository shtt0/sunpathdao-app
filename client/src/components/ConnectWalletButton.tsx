import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { formatWalletAddress } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppKit } from '@reown/appkit/react';

export default function ConnectWalletButton() {
  const { walletStatus, walletAddress, connectWallet, disconnectWallet } = useWallet();
  const { toast } = useToast();
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
          <DropdownMenuItem onClick={handleDisconnect}>
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // If wallet is connecting, show loading state
  if (walletStatus === 'connecting') {
    return (
      <Button disabled className="flex items-center gap-2">
        <span className="material-icons text-sm animate-spin">sync</span>
        Connecting...
      </Button>
    );
  }
  
  // ウォレット未接続時はシンプルなログインボタンのみ表示
  return (
    <div className="flex flex-col items-center">
      {/* シンプルなウォレット接続ボタン */}
      <Button onClick={handleConnect} className="flex items-center gap-2 w-full bg-[#309898] hover:bg-[#2a8585]">
        <span className="material-icons text-sm">account_balance_wallet</span>
        Phantom Walletで接続
      </Button>
    </div>
  );
}
