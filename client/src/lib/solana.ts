import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { SOLANA_CONSTANTS } from './constants';

export const connection = new Connection(SOLANA_CONSTANTS.RPC_URL);

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

export async function createTransferTransaction(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  lamports: number
): Promise<Transaction> {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports,
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  return transaction;
}

export async function hasEnoughSol(
  pubkey: PublicKey,
  requiredSol: number
): Promise<boolean> {
  try {
    const balance = await connection.getBalance(pubkey);
    const requiredLamports = solToLamports(requiredSol);
    return balance >= requiredLamports;
  } catch (error) {
    console.error('Error checking SOL balance:', error);
    return false;
  }
}

export async function getSolBalance(pubkey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(pubkey);
    return lamportsToSol(balance);
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}

export async function confirmTransaction(signature: string): Promise<boolean> {
  try {
    const confirmation = await connection.confirmTransaction(signature);
    return !confirmation.value.err;
  } catch (error) {
    console.error('Error confirming transaction:', error);
    return false;
  }
}

// タスク作成用のトランザクションを作成する（テストファイルに基づく）
export async function createTaskTransaction(
  commissionerPubkey: PublicKey,
  taskId: number,
  rewardAmount: number,
  expiryTimestamp: number
): Promise<Transaction> {
  try {
    console.log(`Creating task transaction:
      Commissioner: ${commissionerPubkey.toString()}
      Task ID: ${taskId}
      Reward: ${rewardAmount} lamports
      Expiry: ${expiryTimestamp}`);
    
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    console.log('Program ID:', programId.toString());
    
    // 正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([194, 80, 6, 180, 232, 127, 48, 171]);
    
    // 引数をAnchor形式でシリアライズ
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const rewardAmountBytes = new Uint8Array(8);
    const rewardAmountView = new DataView(rewardAmountBytes.buffer);
    rewardAmountView.setBigUint64(0, BigInt(rewardAmount), true);
    
    const durationSecondsBytes = new Uint8Array(8);
    const durationSecondsView = new DataView(durationSecondsBytes.buffer);
    durationSecondsView.setBigInt64(0, BigInt(3600), true); // 1時間
    
    const dataBuffer = new Uint8Array(
      methodDiscriminator.length + taskIdBytes.length + rewardAmountBytes.length + durationSecondsBytes.length
    );
    
    let offset = 0;
    dataBuffer.set(methodDiscriminator, offset);
    offset += methodDiscriminator.length;
    dataBuffer.set(taskIdBytes, offset);
    offset += taskIdBytes.length;
    dataBuffer.set(rewardAmountBytes, offset);
    offset += rewardAmountBytes.length;
    dataBuffer.set(durationSecondsBytes, offset);
    
    // PDA生成（テストファイルと同じ方法）
    const taskSeedPrefix = new TextEncoder().encode("task_account");
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, commissionerPubkey.toBytes(), taskIdBytes],
      programId
    );
    
    const configSeedPrefix = new TextEncoder().encode("config_v2");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    console.log('Config PDA:', configPubkey.toString());
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },
        { pubkey: commissionerPubkey, isSigner: true, isWritable: true },
        { pubkey: configPubkey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: Buffer.from(dataBuffer)
    });
    
    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = commissionerPubkey;
    
    console.log('Create task transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating createTask transaction:', error);
    throw new Error(`Failed to create task transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// タスク承認用のトランザクションを作成する（テストファイルに基づく）
export async function acceptTaskTransaction(
  consignerPubkey: PublicKey,
  recipientPubkey: PublicKey,
  taskId: number
): Promise<Transaction> {
  try {
    console.log(`Creating accept task transaction:
      Consigner: ${consignerPubkey.toString()}
      Recipient: ${recipientPubkey.toString()}
      Task ID: ${taskId}`);
    
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // 正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([222, 196, 79, 165, 120, 30, 38, 120]);
    
    // recipient引数
    const recipientBytes = new Uint8Array(recipientPubkey.toBytes());
    
    const dataBuffer = new Uint8Array(methodDiscriminator.length + recipientBytes.length);
    let offset = 0;
    dataBuffer.set(methodDiscriminator, offset);
    offset += methodDiscriminator.length;
    dataBuffer.set(recipientBytes, offset);
    
    // PDA生成（テストファイルと同じ方法）
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const taskSeedPrefix = new TextEncoder().encode("task_account");
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, consignerPubkey.toBytes(), taskIdBytes],
      programId
    );
    
    const configSeedPrefix = new TextEncoder().encode("config_v2");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    
    const adminCounterSeedPrefix = new TextEncoder().encode("admin_counter");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminCounterSeedPrefix, consignerPubkey.toBytes()],
      programId
    );
    
    console.log('Task Account PDA:', taskAccountPubkey.toString());
    console.log('Config PDA:', configPubkey.toString());
    console.log('Admin Counter PDA:', adminActionCounterPubkey.toString());
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },
        { pubkey: consignerPubkey, isSigner: true, isWritable: true },
        { pubkey: recipientPubkey, isSigner: false, isWritable: true },
        { pubkey: configPubkey, isSigner: false, isWritable: false },
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: Buffer.from(dataBuffer)
    });
    
    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = consignerPubkey;
    
    console.log('Accept task transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating acceptTask transaction:', error);
    throw new Error(`Failed to create acceptTask transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// タスク拒否用のトランザクションを作成する（テストファイルに基づく）
export async function rejectTaskTransaction(
  consignerPubkey: PublicKey,
  taskId: number
): Promise<Transaction> {
  try {
    console.log(`Creating reject task transaction:
      Consigner: ${consignerPubkey.toString()}
      Task ID: ${taskId}`);
    
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // 正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([152, 59, 207, 37, 222, 254, 28, 106]);
    const dataBuffer = methodDiscriminator;
    
    // PDA生成（テストファイルと同じ方法）
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const taskSeedPrefix = new TextEncoder().encode("task_account");
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, consignerPubkey.toBytes(), taskIdBytes],
      programId
    );
    
    const configSeedPrefix = new TextEncoder().encode("config_v2");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    
    const adminCounterSeedPrefix = new TextEncoder().encode("admin_counter");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminCounterSeedPrefix, consignerPubkey.toBytes()],
      programId
    );
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },
        { pubkey: consignerPubkey, isSigner: true, isWritable: true },
        { pubkey: configPubkey, isSigner: false, isWritable: false },
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: Buffer.from(dataBuffer)
    });
    
    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = consignerPubkey;
    
    console.log('Reject task transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating rejectTask transaction:', error);
    throw new Error(`Failed to create rejectTask transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 期限切れタスクの資金回収用のトランザクションを作成する（テストファイルに基づく）
export async function reclaimTaskFundsTransaction(
  consignerPubkey: PublicKey,
  taskId: number
): Promise<Transaction> {
  try {
    console.log(`Creating reclaim task funds transaction:
      Consigner: ${consignerPubkey.toString()}
      Task ID: ${taskId}`);
    
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // 正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([117, 112, 75, 205, 124, 103, 96, 192]);
    const dataBuffer = methodDiscriminator;
    
    // PDA生成（テストファイルと同じ方法）
    const taskIdBytes = new Uint8Array(8);
    const taskIdView = new DataView(taskIdBytes.buffer);
    taskIdView.setBigUint64(0, BigInt(taskId), true);
    
    const taskSeedPrefix = new TextEncoder().encode("task_account");
    const [taskAccountPubkey] = PublicKey.findProgramAddressSync(
      [taskSeedPrefix, consignerPubkey.toBytes(), taskIdBytes],
      programId
    );
    
    const configSeedPrefix = new TextEncoder().encode("config_v2");
    const [configPubkey] = PublicKey.findProgramAddressSync(
      [configSeedPrefix],
      programId
    );
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: taskAccountPubkey, isSigner: false, isWritable: true },
        { pubkey: consignerPubkey, isSigner: true, isWritable: true },
        { pubkey: configPubkey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: Buffer.from(dataBuffer)
    });
    
    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = consignerPubkey;
    
    console.log('Reclaim task funds transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating reclaimTaskFunds transaction:', error);
    throw new Error(`Failed to create reclaimTaskFunds transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Initialize Admin Counter用のトランザクションを作成する（テストファイルに基づく）
export async function initializeAdminCounterTransaction(
  adminPubkey: PublicKey
): Promise<Transaction> {
  try {
    console.log(`Creating initialize admin counter transaction:
      Admin: ${adminPubkey.toString()}`);
    
    const programId = new PublicKey(SOLANA_CONSTANTS.PROGRAM_ID);
    
    // 正しいディスクリミネーター
    const methodDiscriminator = new Uint8Array([75, 91, 216, 32, 21, 249, 169, 251]);
    const dataBuffer = methodDiscriminator;
    
    // PDA生成（テストファイルと同じ方法）
    const adminCounterSeedPrefix = new TextEncoder().encode("admin_counter");
    const [adminActionCounterPubkey] = PublicKey.findProgramAddressSync(
      [adminCounterSeedPrefix, adminPubkey.toBytes()],
      programId
    );
    
    console.log('Admin Action Counter PDA:', adminActionCounterPubkey.toString());
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: adminActionCounterPubkey, isSigner: false, isWritable: true },
        { pubkey: adminPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId,
      data: Buffer.from(dataBuffer)
    });
    
    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPubkey;
    
    console.log('Initialize admin counter transaction created successfully');
    return transaction;
  } catch (error) {
    console.error('Error creating initializeAdminCounter transaction:', error);
    throw new Error(`Failed to create initializeAdminCounter transaction: ${error instanceof Error ? error.message : String(error)}`);
  }
}