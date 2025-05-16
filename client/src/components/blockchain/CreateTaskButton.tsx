import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { createTaskTransaction } from '@/lib/solana';

interface CreateTaskButtonProps {
  taskId: number;
  rewardAmount: number;
  expiryTimestamp: number;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export default function CreateTaskButton({
  taskId,
  rewardAmount,
  expiryTimestamp,
  onSuccess,
  onError,
  className = ''
}: CreateTaskButtonProps) {
  const { walletAddress, signAndSendTransaction } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateTask = useCallback(async () => {
    if (!walletAddress) {
      toast({
        title: 'ウォレットが接続されていません',
        description: 'タスクを作成するには、まずウォレットを接続してください。',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // ウォレットアドレスをPublicKeyに変換
      const walletPublicKey = new PublicKey(walletAddress);
      
      // タスク作成トランザクションを生成
      console.log(`タスク作成トランザクション準備開始:
        タスクID: ${taskId}
        報酬: ${rewardAmount} lamports
        期限: ${expiryTimestamp} (秒単位のタイムスタンプ)
      `);
      
      // 期限を秒単位の期間に変換
      const now = Math.floor(Date.now() / 1000);
      const durationSeconds = Math.floor(new Date(expiryTimestamp).getTime() / 1000) - now;
      
      console.log(`現在のタイムスタンプ: ${now}`);
      console.log(`期限までの残り秒数: ${durationSeconds}`);
      
      // タスク作成トランザクションを生成
      const transaction = await createTaskTransaction(
        walletPublicKey,
        taskId,
        rewardAmount,
        durationSeconds
      );
      
      // トランザクションに署名して送信
      const signature = await signAndSendTransaction(transaction);
      
      console.log('タスク作成トランザクション署名:', signature);
      
      // 成功メッセージを表示
      toast({
        title: 'タスク作成トランザクションを送信しました',
        description: `トランザクションID: ${signature}`,
      });
      
      // 成功コールバックがある場合は実行
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (error) {
      console.error('タスク作成中にエラーが発生しました:', error);
      
      // エラーメッセージを表示
      toast({
        title: 'タスク作成に失敗しました',
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
  }, [walletAddress, taskId, rewardAmount, expiryTimestamp, signAndSendTransaction, toast, onSuccess, onError]);

  return (
    <Button
      onClick={handleCreateTask}
      disabled={isLoading || !walletAddress}
      className={className}
    >
      {isLoading ? 'タスク作成中...' : 'タスクを作成'}
    </Button>
  );
}