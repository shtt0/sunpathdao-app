import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { SOLANA_CONSTANTS } from '@/lib/constants';

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
      
      // Solana接続を初期化
      const connection = new Connection(SOLANA_CONSTANTS.RPC_URL);
      console.log("RPC接続URL:", SOLANA_CONSTANTS.RPC_URL);
      
      // 単純な自己送金トランザクションを作成（テスト用）
      const transaction = new Transaction();
      
      // SystemProgramの転送命令を追加
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: walletPublicKey, // 自分自身に送金（テスト用）
          lamports: 10000 // 0.00001 SOL（最小限のテスト額）
        })
      );
      
      // 最新のブロックハッシュを取得して設定
      const { blockhash } = await connection.getLatestBlockhash();
      console.log("使用するブロックハッシュ:", blockhash);
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;
      
      console.log("トランザクション準備完了:", transaction);
      
      // トランザクションに署名して送信
      const signature = await signAndSendTransaction(transaction);
      
      console.log('タスク作成トランザクション署名:', signature);
      
      // 成功メッセージを表示
      toast({
        title: 'テスト転送が完了しました',
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
      {isLoading ? '転送処理中...' : 'テスト転送を実行'}
    </Button>
  );
}