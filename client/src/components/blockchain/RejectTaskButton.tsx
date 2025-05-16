import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { rejectTaskTransaction } from '@/lib/solana';

interface RejectTaskButtonProps {
  taskId: number;
  submissionId: number;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function RejectTaskButton({
  taskId,
  submissionId,
  onSuccess,
  onError,
  className = ''
}: RejectTaskButtonProps) {
  const { walletAddress, signAndSendTransaction } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRejectTask = useCallback(async () => {
    if (!walletAddress) {
      toast({
        title: 'ウォレットが接続されていません',
        description: 'タスクを拒否するには、まずウォレットを接続してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // ウォレットアドレスをPublicKeyに変換
      const walletPublicKey = new PublicKey(walletAddress);
      
      // タスク拒否トランザクションを生成
      // IDLを確認したところ、submissionIdパラメータは不要
      const transaction = await rejectTaskTransaction(
        walletPublicKey,
        taskId
      );
      
      // トランザクションに署名して送信
      const signature = await signAndSendTransaction(transaction);
      
      console.log('タスク拒否トランザクション署名:', signature);
      
      // 成功メッセージを表示
      toast({
        title: 'タスク拒否トランザクションを送信しました',
        description: `トランザクションID: ${signature}`,
      });
      
      // 成功コールバックがある場合は実行
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (error) {
      console.error('タスク拒否中にエラーが発生しました:', error);
      
      // エラーメッセージを表示
      toast({
        title: 'タスク拒否に失敗しました',
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
  }, [walletAddress, taskId, submissionId, signAndSendTransaction, toast, onSuccess, onError]);

  return (
    <Button
      onClick={handleRejectTask}
      disabled={isLoading || !walletAddress}
      variant="destructive"
      className={className}
    >
      {isLoading ? 'タスク拒否中...' : 'タスクを拒否'}
    </Button>
  );
}