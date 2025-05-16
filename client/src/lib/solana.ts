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
    return balance >= solToLamports(requiredSol);
  } catch (error) {
    console.error('Error checking balance:', error);
    return false;
  }
}

// Get the SOL balance of an account
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
  rewardAmount: number,         // 報酬額（lamports）- 注: すでにlamports単位であることに注意
  expiryTimestamp: number       // 期限（秒数）
): Promise<Transaction> {
  try {
    console.log(`Creating task transaction with details:
      Commissioner: ${commissionerPubkey.toString()}
      Task ID: ${taskId}
      Reward: ${rewardAmount} lamports
      Expiry duration: ${expiryTimestamp} seconds`);
    
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // Anchorフォーマットに合わせたデータバッファの作成
    // 8バイトのディスクリミネーター (メソッド識別子)
    const METHOD_DISCRIMINATOR = new Uint8Array([121, 223, 53, 53, 150, 214, 191, 179]); // "create_task" のsha256ハッシュの先頭8バイト
    console.log('Method Discriminator:', Array.from(METHOD_DISCRIMINATOR));
    
    // タスクIDを符号なし64ビット整数として格納 (8バイト)
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true); // trueはリトルエンディアン
    console.log('Task ID bytes:', Array.from(taskIdBytes));
    
    // 報酬額のバイト列作成 (8バイト)
    const rewardBytes = new Uint8Array(8);
    const rewardView = new DataView(rewardBytes.buffer);
    rewardView.setBigUint64(0, BigInt(rewardAmount), true); // リトルエンディアン
    console.log('Reward bytes:', Array.from(rewardBytes));
    
    // 期限（秒数） (8バイト)
    const expiryBytes = new Uint8Array(8);
    const expiryView = new DataView(expiryBytes.buffer);
    expiryView.setBigUint64(0, BigInt(expiryTimestamp), true); // リトルエンディアン
    console.log('Expiry bytes:', Array.from(expiryBytes));
    
    // Anchorのシリアライズフォーマットに従って全てのバッファを一つに連結
    const combinedLength = METHOD_DISCRIMINATOR.length + taskIdBytes.length + rewardBytes.length + expiryBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(METHOD_DISCRIMINATOR, offset);
    offset += METHOD_DISCRIMINATOR.length;
    combinedBuffer.set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    combinedBuffer.set(rewardBytes, offset);
    offset += rewardBytes.length;
    combinedBuffer.set(expiryBytes, offset);
    
    console.log('Combined buffer length:', combinedBuffer.length);
    
    // ブラウザ環境ではBufferが直接利用できないのでUint8Arrayをそのまま使用
    const data = combinedBuffer;
    
    // Anchorプログラムが要求するアカウント構造に合わせたインストラクション作成
    console.log('Creating transaction instruction');
    
    // タスクアカウントのPDAを派生させる（タスクIDをシードとして使用）
    // ブラウザ互換: TextEncoderを使用してUint8Arrayに変換
    const taskSeed = new TextEncoder().encode("task");
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeed, taskIdBytes],
      programId
    );
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    
    // 設定アカウントのPDAを派生
    const configSeed = new TextEncoder().encode("config");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeed],
      programId
    );
    console.log('Config Account PDA:', configPubkey.toString());
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },    // タスクアカウント
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true },    // 委託者（署名者）
        { pubkey: configPubkey, isSigner: false, isWritable: false },        // 設定アカウント
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // システムプログラム
      ],
      programId,
      data,
    });
    
    // トランザクションの作成
    console.log('Creating transaction');
    const transaction = new Transaction();
    transaction.add(instruction);
    
    try {
      // 最新のブロックハッシュを取得して設定
      console.log('Getting latest blockhash');
      const { blockhash } = await connection.getLatestBlockhash();
      console.log('Blockhash:', blockhash);
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = commissionerPubkey;
      
      console.log('Transaction created successfully');
      return transaction;
    } catch (blockHashError) {
      console.error('Error getting blockhash:', blockHashError);
      throw blockHashError;
    }
  } catch (error) {
    console.error('Error creating task transaction:', error);
    // スタックトレースを含むより詳細なエラーメッセージ
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
      throw new Error(`Failed to create task transaction: ${error.message}`);
    }
    throw error;
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
    
    // Anchorフォーマットに合わせたデータバッファの作成
    // 8バイトのディスクリミネーター (メソッド識別子)
    const METHOD_DISCRIMINATOR = new Uint8Array([13, 169, 94, 33, 114, 151, 103, 162]); // "accept_task" のsha256ハッシュの先頭8バイト
    console.log('Method Discriminator:', Array.from(METHOD_DISCRIMINATOR));
    
    // タスクIDを符号なし64ビット整数として格納 (8バイト)
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true); // trueはリトルエンディアン
    console.log('Task ID bytes:', Array.from(taskIdBytes));
    
    // Anchorのシリアライズフォーマットに従って全てのバッファを一つに連結
    const combinedLength = METHOD_DISCRIMINATOR.length + taskIdBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(METHOD_DISCRIMINATOR, offset);
    offset += METHOD_DISCRIMINATOR.length;
    combinedBuffer.set(taskIdBytes, offset);
    
    // ブラウザ環境ではBufferが直接利用できないのでUint8Arrayをそのまま使用
    const data = combinedBuffer;
    
    // Anchorプログラムが要求するアカウント構造に合わせたインストラクション作成
    
    // タスクアカウントのPDAを派生させる
    const taskSeed = new TextEncoder().encode("task");
    const taskIdBytesForPDA = new Uint8Array(8);
    const taskIdViewForPDA = new DataView(taskIdBytesForPDA.buffer);
    taskIdViewForPDA.setBigUint64(0, BigInt(taskId), true);
    
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeed, taskIdBytesForPDA],
      programId
    );
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    
    // 設定アカウントのPDAを派生
    const configSeed = new TextEncoder().encode("config");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeed],
      programId
    );
    
    // 管理アクションカウンターのPDAを派生
    const adminActionSeed = new TextEncoder().encode("admin_action");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminActionSeed],
      programId
    );
    
    // タスク作成者のウォレットを特定 (実際の実装ではデータベースやプログラムからフェッチする必要があります)
    // ここでは仮にdriverPubkeyを使用し、実際の使用時に適切なアドレスに置き換えます
    const consignerWalletPubkey = driverPubkey; // 実際にはタスク作成者の公開鍵
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },         // タスクアカウント
        { pubkey: driverPubkey, isSigner: true, isWritable: true },               // 実行者（署名者）
        { pubkey: driverPubkey, isSigner: false, isWritable: true },              // 受取人アカウント
        { pubkey: configPubkey, isSigner: false, isWritable: false },             // 設定アカウント
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },  // 管理アクションカウンター
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // システムプログラム
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
    console.error('Error creating acceptTask transaction:', error);
    throw new Error('Failed to create acceptTask transaction');
  }
}

// タスク拒否用のトランザクションを作成する
export async function rejectTaskTransaction(
  commissionerPubkey: PublicKey, // タスク作成者のウォレットアドレス
  taskId: number,                // 拒否するタスクのID
  submissionId: number           // 拒否する提出物のID
): Promise<Transaction> {
  try {
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // Anchorフォーマットに合わせたデータバッファの作成
    // 8バイトのディスクリミネーター (メソッド識別子)
    const METHOD_DISCRIMINATOR = new Uint8Array([102, 29, 22, 156, 33, 145, 230, 89]); // "reject_task" のsha256ハッシュの先頭8バイト
    console.log('Method Discriminator:', Array.from(METHOD_DISCRIMINATOR));
    
    // タスクIDを符号なし64ビット整数として格納 (8バイト)
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true); // trueはリトルエンディアン
    console.log('Task ID bytes:', Array.from(taskIdBytes));
    
    // サブミッションIDを符号なし64ビット整数として格納 (8バイト)
    const submissionIdBytes = new Uint8Array(8);
    const submissionIdView = new DataView(submissionIdBytes.buffer);
    submissionIdView.setBigUint64(0, BigInt(submissionId), true); // リトルエンディアン
    console.log('Submission ID bytes:', Array.from(submissionIdBytes));
    
    // Anchorのシリアライズフォーマットに従って全てのバッファを一つに連結
    const combinedLength = METHOD_DISCRIMINATOR.length + taskIdBytes.length + submissionIdBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(METHOD_DISCRIMINATOR, offset);
    offset += METHOD_DISCRIMINATOR.length;
    combinedBuffer.set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    combinedBuffer.set(submissionIdBytes, offset);
    
    // ブラウザ環境ではBufferが直接利用できないのでUint8Arrayをそのまま使用
    const data = combinedBuffer;
    
    // インストラクションの作成 - Anchorプログラムに合わせたフォーマット
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true }, // タスク作成者
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // システムプログラム
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
    console.error('Error creating rejectTask transaction:', error);
    throw new Error('Failed to create rejectTask transaction');
  }
}

// 期限切れタスクの資金回収用のトランザクションを作成する
export async function reclaimTaskFundsTransaction(
  commissionerPubkey: PublicKey, // タスク作成者のウォレットアドレス
  taskId: number                // 資金を回収するタスクのID
): Promise<Transaction> {
  try {
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // Anchorフォーマットに合わせたデータバッファの作成
    // 8バイトのディスクリミネーター (メソッド識別子)
    const METHOD_DISCRIMINATOR = new Uint8Array([45, 173, 66, 44, 98, 117, 162, 170]); // "reclaim_task_funds" のsha256ハッシュの先頭8バイト
    console.log('Method Discriminator:', Array.from(METHOD_DISCRIMINATOR));
    
    // タスクIDを符号なし64ビット整数として格納 (8バイト)
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true); // trueはリトルエンディアン
    console.log('Task ID bytes:', Array.from(taskIdBytes));
    
    // Anchorのシリアライズフォーマットに従って全てのバッファを一つに連結
    const combinedLength = METHOD_DISCRIMINATOR.length + taskIdBytes.length;
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    combinedBuffer.set(METHOD_DISCRIMINATOR, offset);
    offset += METHOD_DISCRIMINATOR.length;
    combinedBuffer.set(taskIdBytes, offset);
    
    // ブラウザ環境ではBufferが直接利用できないのでUint8Arrayをそのまま使用
    const data = combinedBuffer;
    
    // インストラクションの作成 - フォーマットをAnchorプログラムに合わせる
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true }, // タスク作成者
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // システムプログラム
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
    console.error('Error creating reclaimTaskFunds transaction:', error);
    throw new Error('Failed to create reclaimTaskFunds transaction');
  }
}