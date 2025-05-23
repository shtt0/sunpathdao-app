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
  durationSeconds: number       // 期限（秒数）
): Promise<Transaction> {
  try {
    console.log(`Creating task transaction with details:
      Commissioner: ${commissionerPubkey.toString()}
      Task ID: ${taskId}
      Reward: ${rewardAmount} lamports
      Duration: ${durationSeconds} seconds`);
    
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // Anchorのシリアライズ形式に合わせたデータバッファの作成
    // 8バイトのメソッド識別子(ディスクリミネーター)
    // "create_task" という文字列から生成されるAnchorの標準ディスクリミネーター
    const methodDiscriminator = new Uint8Array([162, 118, 124, 113, 114, 191, 113, 191]);
    
    // 引数をバイト配列に変換
    // taskId (u64)
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true); // リトルエンディアン
    
    // rewardAmount (u64)
    const rewardBytes = new Uint8Array(8);
    const rewardView = new DataView(rewardBytes.buffer);
    rewardView.setBigUint64(0, BigInt(rewardAmount), true);
    
    // durationSeconds (i64)
    const durationBytes = new Uint8Array(8);
    const durationView = new DataView(durationBytes.buffer);
    durationView.setBigInt64(0, BigInt(durationSeconds), true);
    
    // 全てのバッファを連結
    const dataBuffer = new Uint8Array(
      methodDiscriminator.length + taskIdBytes.length + rewardBytes.length + durationBytes.length
    );
    
    let offset = 0;
    dataBuffer.set(methodDiscriminator, offset);
    offset += methodDiscriminator.length;
    dataBuffer.set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    dataBuffer.set(rewardBytes, offset);
    offset += rewardBytes.length;
    dataBuffer.set(durationBytes, offset);
    
    console.log('Data buffer created:', dataBuffer.length);
    
    // タスクアカウントのPDAを生成 (シードは "task" + taskId のバイナリ表現)
    const taskSeedPrefix = new TextEncoder().encode("task");
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, new Uint8Array(new TextEncoder().encode(taskId.toString()))],
      programId
    );
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    
    // 設定アカウントのPDAを生成
    const configSeedPrefix = new TextEncoder().encode("config");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    console.log('Config Account PDA:', configPubkey.toString());
    
    // Anchor IDLに基づいたアカウント構造でインストラクションを作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },    // タスクアカウント (PDA)
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true },    // 委託者 (署名者)
        { pubkey: configPubkey, isSigner: false, isWritable: false },        // プログラム設定
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // システムプログラム
      ],
      programId,
      data: dataBuffer
    });
    
    // トランザクションにインストラクションを追加
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    console.log('Using blockhash:', blockhash);
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = commissionerPubkey;
    
    console.log('Transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating task transaction:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to create task transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// タスク承認用のトランザクションを作成する
export async function acceptTaskTransaction(
  consignerPubkey: PublicKey,   // タスク作成者のウォレットアドレス（署名者）
  recipientPubkey: PublicKey,   // 受取人のウォレットアドレス
  taskId: number                // 承認するタスクのID
): Promise<Transaction> {
  try {
    console.log(`Creating accept task transaction:
      Consigner: ${consignerPubkey.toString()}
      Recipient: ${recipientPubkey.toString()}
      Task ID: ${taskId}`);
    
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // Anchorのシリアライズ形式に合わせたデータバッファの作成
    // 8バイトのメソッド識別子(ディスクリミネーター)
    // "accept_task" の正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([222, 196, 79, 165, 120, 30, 38, 120]);
    
    // 引数1: recipient (PublicKey) - 32バイト
    const recipientBytes = new Uint8Array(recipientPubkey.toBytes());
    
    // 全てのバッファを連結
    const dataBuffer = new Uint8Array(
      methodDiscriminator.length + recipientBytes.length
    );
    
    let offset = 0;
    dataBuffer.set(methodDiscriminator, offset);
    offset += methodDiscriminator.length;
    dataBuffer.set(recipientBytes, offset);
    
    console.log('Data buffer created:', dataBuffer.length);
    
    // タスクアカウントのPDAを生成
    const taskSeedPrefix = new TextEncoder().encode("task");
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, taskIdBytes],
      programId
    );
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    
    // 設定アカウントのPDAを生成
    const configSeedPrefix = new TextEncoder().encode("config");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    console.log('Config Account PDA:', configPubkey.toString());
    
    // 管理アクションカウンターのPDAを生成
    const adminActionSeedPrefix = new TextEncoder().encode("admin_action");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminActionSeedPrefix],
      programId
    );
    console.log('Admin Action Counter PDA:', adminActionCounterPubkey.toString());
    
    // IDLに基づいたアカウント構造でインストラクションを作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },         // taskAccount
        { pubkey: consignerPubkey, isSigner: true, isWritable: true },            // consignerWallet
        { pubkey: recipientPubkey, isSigner: false, isWritable: true },           // recipientAccount
        { pubkey: configPubkey, isSigner: false, isWritable: false },             // config
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },  // adminActionCounter
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // systemProgram
      ],
      programId,
      data: dataBuffer
    });
    
    // トランザクションにインストラクションを追加
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    console.log('Using blockhash:', blockhash);
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = consignerPubkey;
    
    console.log('Accept task transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating acceptTask transaction:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to create acceptTask transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// タスク拒否用のトランザクションを作成する
export async function rejectTaskTransaction(
  consignerPubkey: PublicKey,   // タスク作成者のウォレットアドレス（署名者）
  taskId: number                // 拒否するタスクのID
): Promise<Transaction> {
  try {
    console.log(`Creating reject task transaction:
      Consigner: ${consignerPubkey.toString()}
      Task ID: ${taskId}`);
    
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // Anchorのシリアライズ形式に合わせたデータバッファの作成
    // 8バイトのメソッド識別子(ディスクリミネーター)
    // "reject_task" の正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([152, 59, 207, 37, 222, 254, 28, 106]);
    
    // IDLを確認すると引数は不要（空の配列）
    const dataBuffer = methodDiscriminator;
    
    console.log('Data buffer created:', dataBuffer.length);
    
    // タスクアカウントのPDAを生成
    const taskSeedPrefix = new TextEncoder().encode("task");
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, taskIdBytes],
      programId
    );
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    
    // 設定アカウントのPDAを生成
    const configSeedPrefix = new TextEncoder().encode("config");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    console.log('Config Account PDA:', configPubkey.toString());
    
    // 管理アクションカウンターのPDAを生成
    const adminActionSeedPrefix = new TextEncoder().encode("admin_action");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminActionSeedPrefix],
      programId
    );
    console.log('Admin Action Counter PDA:', adminActionCounterPubkey.toString());
    
    // IDLに基づいたアカウント構造でインストラクションを作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },         // taskAccount
        { pubkey: consignerPubkey, isSigner: true, isWritable: true },            // consignerWallet
        { pubkey: configPubkey, isSigner: false, isWritable: false },             // config
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },  // adminActionCounter
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // systemProgram
      ],
      programId,
      data: dataBuffer
    });
    
    // トランザクションにインストラクションを追加
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    console.log('Using blockhash:', blockhash);
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = consignerPubkey;
    
    console.log('Reject task transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating rejectTask transaction:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to create rejectTask transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 期限切れタスクの資金回収用のトランザクションを作成する
export async function reclaimTaskFundsTransaction(
  consignerPubkey: PublicKey,   // タスク作成者のウォレットアドレス（署名者）
  taskId: number                // 資金を回収するタスクのID
): Promise<Transaction> {
  try {
    console.log(`Creating reclaim task funds transaction:
      Consigner: ${consignerPubkey.toString()}
      Task ID: ${taskId}`);
    
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // Anchorのシリアライズ形式に合わせたデータバッファの作成
    // 8バイトのメソッド識別子(ディスクリミネーター)
    // "reclaim_task_funds" の正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([117, 112, 75, 205, 124, 103, 96, 192]);
    
    // IDLを確認すると引数は不要（空の配列）
    const dataBuffer = methodDiscriminator;
    
    console.log('Data buffer created:', dataBuffer.length);
    
    // タスクアカウントのPDAを生成
    const taskSeedPrefix = new TextEncoder().encode("task");
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, taskIdBytes],
      programId
    );
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    
    // 設定アカウントのPDAを生成
    const configSeedPrefix = new TextEncoder().encode("config");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    console.log('Config Account PDA:', configPubkey.toString());
    
    // IDLに基づいたアカウント構造でインストラクションを作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },         // taskAccount
        { pubkey: consignerPubkey, isSigner: true, isWritable: true },            // consignerWallet
        { pubkey: configPubkey, isSigner: false, isWritable: false },             // config
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // systemProgram
      ],
      programId,
      data: dataBuffer
    });
    
    // トランザクションにインストラクションを追加
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    console.log('Using blockhash:', blockhash);
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = commissionerPubkey;
    
    console.log('Reclaim task funds transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating reclaimTaskFunds transaction:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to create reclaimTaskFunds transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Initialize Admin Counter用のトランザクションを作成する
export async function initializeAdminCounterTransaction(
  adminPubkey: PublicKey     // 管理者のウォレットアドレス
): Promise<Transaction> {
  try {
    console.log(`Creating initialize admin counter transaction:
      Admin: ${adminPubkey.toString()}`);
    
    // プログラムIDをPublicKeyに変換
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // Anchorのシリアライズ形式に合わせたデータバッファの作成
    // 8バイトのメソッド識別子(ディスクリミネーター)
    // "initialize_admin_counter" の正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([75, 91, 216, 32, 21, 249, 169, 251]);
    
    // IDLを確認すると引数は不要（空の配列）
    
    // 全てのバッファを連結（このケースではディスクリミネーターのみ）
    const dataBuffer = methodDiscriminator;
    
    console.log('Data buffer created:', dataBuffer.length);
    
    // 管理アクションカウンターのPDAを生成
    const adminActionSeedPrefix = new TextEncoder().encode("admin_action");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminActionSeedPrefix],
      programId
    );
    console.log('Admin Action Counter PDA:', adminActionCounterPubkey.toString());
    
    // Anchor IDLに基づいたアカウント構造でインストラクションを作成
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },  // 管理アクションカウンター (PDA)
        { pubkey: adminPubkey, isSigner: true, isWritable: true },                // 管理者（署名者・支払者）
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // システムプログラム
      ],
      programId,
      data: dataBuffer
    });
    
    // トランザクションにインストラクションを追加
    const transaction = new Transaction().add(instruction);
    
    // 最新のブロックハッシュを取得して設定
    const { blockhash } = await connection.getLatestBlockhash();
    console.log('Using blockhash:', blockhash);
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPubkey;
    
    console.log('Initialize admin counter transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating initializeAdminCounter transaction:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    throw new Error(`Failed to create initializeAdminCounter transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}