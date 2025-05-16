import { PublicKey, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { SOLANA_CONSTANTS } from './constants';

// Solanaコネクションの初期化
export const connection = new Connection(SOLANA_CONSTANTS.RPC_URL);

// Convert SOL to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

// Create a transaction to send SOL from one wallet to another
export async function createTransferTransaction(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  solAmount: number
): Promise<Transaction> {
  try {
    const lamports = solToLamports(solAmount);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );
    
    // Get the latest blockhash for the transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;
    
    return transaction;
  } catch (error) {
    console.error('Error creating transfer transaction:', error);
    throw new Error('Failed to create transfer transaction');
  }
}

// Check if an account has enough SOL
export async function hasEnoughSol(
  pubkey: PublicKey,
  requiredSol: number
): Promise<boolean> {
  try {
    const balance = await connection.getBalance(pubkey);
    const requiredLamports = solToLamports(requiredSol);
    
    // Include some buffer for transaction fees (0.000005 SOL)
    const feeBuffer = 5000;
    
    return balance >= (requiredLamports + feeBuffer);
  } catch (error) {
    console.error('Error checking balance:', error);
    return false;
  }
}

// Get SOL balance for a public key
export async function getSolBalance(pubkey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(pubkey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return 0;
  }
}

// Confirm a transaction
export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const confirmation = await connection.confirmTransaction(signature);
    return !confirmation.value.err;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
}

// タスク作成用のトランザクションを作成する
export async function createTaskTransaction(
  commissionerPubkey: PublicKey,  // タスク作成者のウォレットアドレス
  taskId: number,               // タスクID（バックエンドで生成されたもの）
  rewardAmount: number,         // 報酬額（SOL）
  expiryTimestamp: number       // 期限（UNIXタイムスタンプ）
): Promise<Transaction> {
  try {
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // 報酬額をlamportsに変換
    const rewardLamports = solToLamports(rewardAmount);
    
    // データバッファの作成 - スプレッド構文を使わずにバッファを連結
    const instructionIndex = new Uint8Array([0]); // 0 = createTask
    const taskIdBytes = new Uint8Array(new Uint32Array([taskId]).buffer);
    
    // Uint64Arrayがない場合は、BigIntを8バイトのバッファに変換する代わりの方法
    const rewardBytes = new Uint8Array(8);
    const view = new DataView(rewardBytes.buffer);
    // DataViewを使って64ビット値を書き込み
    view.setBigUint64(0, BigInt(rewardLamports), true); // trueはリトルエンディアン
    
    const expiryBytes = new Uint8Array(new Uint32Array([expiryTimestamp]).buffer);
    
    // 全てのバッファを一つに連結
    const combinedLength = instructionIndex.length + taskIdBytes.length + rewardBytes.length + expiryBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(instructionIndex, offset);
    offset += instructionIndex.length;
    combinedBuffer.set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    combinedBuffer.set(rewardBytes, offset);
    offset += rewardBytes.length;
    combinedBuffer.set(expiryBytes, offset);
    
    const data = Buffer.from(combinedBuffer);
    
    // インストラクションの作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true }, // 送金元（タスク作成者）
        { pubkey: programId, isSigner: false, isWritable: false },       // プログラム自体
      ],
      programId,
      data,
    });
    
    // トランザクションの作成
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = commissionerPubkey;
    
    return transaction;
  } catch (error) {
    console.error('Error creating task transaction:', error);
    throw new Error('Failed to create task transaction');
  }
}

// タスク承認用のトランザクションを作成する
export async function acceptTaskTransaction(
  driverPubkey: PublicKey,     // タスク実行者のウォレットアドレス
  taskId: number               // 承認するタスクのID
): Promise<Transaction> {
  try {
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // データバッファの作成 - スプレッド構文を使わずにバッファを連結
    const instructionIndex = new Uint8Array([1]); // 1 = acceptTask
    const taskIdBytes = new Uint8Array(new Uint32Array([taskId]).buffer);
    
    // 全てのバッファを一つに連結
    const combinedLength = instructionIndex.length + taskIdBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(instructionIndex, offset);
    offset += instructionIndex.length;
    combinedBuffer.set(taskIdBytes, offset);
    
    const data = Buffer.from(combinedBuffer);
    
    // インストラクションの作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: driverPubkey, isSigner: true, isWritable: false }, // タスク実行者
        { pubkey: programId, isSigner: false, isWritable: false },  // プログラム自体
      ],
      programId,
      data,
    });
    
    // トランザクションの作成
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = driverPubkey;
    
    return transaction;
  } catch (error) {
    console.error('Error creating accept task transaction:', error);
    throw new Error('Failed to create accept task transaction');
  }
}

// タスク拒否用のトランザクションを作成する
export async function rejectTaskTransaction(
  commissionerPubkey: PublicKey, // タスク作成者のウォレットアドレス
  taskId: number,              // 拒否するタスクのID
  submissionId: number         // 拒否する提出物のID
): Promise<Transaction> {
  try {
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // データバッファの作成 - スプレッド構文を使わずにバッファを連結
    const instructionIndex = new Uint8Array([2]); // 2 = rejectTask
    const taskIdBytes = new Uint8Array(new Uint32Array([taskId]).buffer);
    const submissionIdBytes = new Uint8Array(new Uint32Array([submissionId]).buffer);
    
    // 全てのバッファを一つに連結
    const combinedLength = instructionIndex.length + taskIdBytes.length + submissionIdBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(instructionIndex, offset);
    offset += instructionIndex.length;
    combinedBuffer.set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    combinedBuffer.set(submissionIdBytes, offset);
    
    const data = Buffer.from(combinedBuffer);
    
    // インストラクションの作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: commissionerPubkey, isSigner: true, isWritable: false }, // タスク作成者
        { pubkey: programId, isSigner: false, isWritable: false },        // プログラム自体
      ],
      programId,
      data,
    });
    
    // トランザクションの作成
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = commissionerPubkey;
    
    return transaction;
  } catch (error) {
    console.error('Error creating reject task transaction:', error);
    throw new Error('Failed to create reject task transaction');
  }
}

// 資金回収用のトランザクションを作成する
export async function reclaimTaskFundsTransaction(
  commissionerPubkey: PublicKey, // タスク作成者のウォレットアドレス
  taskId: number                // 資金を回収するタスクのID
): Promise<Transaction> {
  try {
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // データバッファの作成
    const data = Buffer.from(
      Uint8Array.of(
        3, // インストラクションインデックス: 3 = reclaimTaskFunds
        ...new Uint8Array(new Uint32Array([taskId]).buffer) // タスクID
      )
    );
    
    // インストラクションの作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true }, // タスク作成者（資金の受取先）
        { pubkey: programId, isSigner: false, isWritable: false },       // プログラム自体
      ],
      programId,
      data,
    });
    
    // トランザクションの作成
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = commissionerPubkey;
    
    return transaction;
  } catch (error) {
    console.error('Error creating reclaim funds transaction:', error);
    throw new Error('Failed to create reclaim funds transaction');
  }
}
