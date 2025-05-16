import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { reclaimTaskFundsTransaction } from '@/lib/solana';

interface ReclaimTaskFundsButtonProps {
  taskId: number;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function ReclaimTaskFundsButton({
  taskId,
  onSuccess,
  onError,
  className = ''
}: ReclaimTaskFundsButtonProps) {
  const { walletAddress, signAndSendTransaction } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleReclaimFunds = useCallback(async () => {
    if (!walletAddress) {
      toast({
        title: 'ウォレットが接続されていません',
        description: '資金を回収するには、まずウォレットを接続してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // ウォレットアドレスをPublicKeyに変換
      const walletPublicKey = new PublicKey(walletAddress);
      
      // 資金回収トランザクションを生成
      const transaction = await reclaimTaskFundsTransaction(
        walletPublicKey,
        taskId
      );
      
      // トランザクションに署名して送信
      const signature = await signAndSendTransaction(transaction);
      
      console.log('資金回収トランザクション署名:', signature);
      
      // 成功メッセージを表示
      toast({
        title: '資金回収トランザクションを送信しました',
        description: `トランザクションID: ${signature}`,
      });
      
      // 成功コールバックがある場合は実行
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (error) {
      console.error('資金回収中にエラーが発生しました:', error);
      
      // エラーメッセージを表示
      toast({
        title: '資金回収に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        variant: 'destructive',
      });
      
      // エラーコールバックがある場合は実行
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, taskId, signAndSendTransaction, toast, onSuccess, onError]);

  return (
    <Button
      onClick={handleReclaimFunds}
      disabled={isLoading || !walletAddress}
      variant="outline"
      className={className}
    >
      {isLoading ? '資金回収中...' : '資金を回収'}
    </Button>
  );
}