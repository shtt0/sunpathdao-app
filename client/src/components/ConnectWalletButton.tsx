import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { formatWalletAddress } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ConnectWalletButton() {
  const { walletStatus, walletAddress, connectWallet, disconnectWallet } = useWallet();
  
  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // User can check console for detailed error
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
          <DropdownMenuItem onClick={disconnectWallet}>
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
  
  // If wallet is disconnected, show connect button
  return (
    <Button onClick={handleConnect} className="flex items-center gap-2">
      <span className="material-icons text-sm">account_balance_wallet</span>
      Connect Wallet
    </Button>
  );
}
