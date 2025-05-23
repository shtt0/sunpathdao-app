import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { acceptTaskTransaction } from '@/lib/solana';

interface AcceptTaskButtonProps {
  taskId: number;
  recipientWalletAddress: string; // 受取人のウォレットアドレスを追加
  onSuccess?: (transactionId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function AcceptTaskButton({
  taskId,
  recipientWalletAddress,
  onSuccess,
  onError,
  className = ''
}: AcceptTaskButtonProps) {
  const { walletAddress, signAndSendTransaction } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptTask = useCallback(async () => {
    if (!walletAddress) {
      toast({
        title: 'ウォレットが接続されていません',
        description: 'タスクを承認するには、まずウォレットを接続してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // ウォレットアドレスをPublicKeyに変換
      const consignerPublicKey = new PublicKey(walletAddress);
      const recipientPublicKey = new PublicKey(recipientWalletAddress);
      
      // タスク承認トランザクションを生成
      const transaction = await acceptTaskTransaction(
        consignerPublicKey,
        recipientPublicKey,
        taskId
      );
      
      // トランザクションに署名して送信
      const signature = await signAndSendTransaction(transaction);
      
      console.log('タスク承認トランザクション署名:', signature);
      
      // 成功メッセージを表示
      toast({
        title: 'タスク承認トランザクションを送信しました',
        description: `トランザクションID: ${signature}`,
      });
      
      // 成功コールバックがある場合は実行
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (error) {
      console.error('タスク承認中にエラーが発生しました:', error);
      
      // エラーメッセージを表示
      toast({
        title: 'タスク承認に失敗しました',
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
      onClick={handleAcceptTask}
      disabled={isLoading || !walletAddress}
      variant="secondary"
      className={className}
    >
      {isLoading ? 'タスク承認中...' : 'タスクを承認'}
    </Button>
  );
}