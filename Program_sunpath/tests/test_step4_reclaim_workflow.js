// tests/test_reclaim_workflow.js

async function main() {
  try {
    console.log("🚀 Running RECLAIM workflow script...");

    const { SystemProgram } = anchor.web3;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Sunpath;
    const wallet = provider.wallet;

    // =================================================================
    // STEP 1: 新しいタスクを作成
    // =================================================================
    console.log("\nSTEP 1: Creating a new task for reclaim test...");

    const taskId = new anchor.BN(Date.now());
    const rewardAmount = new anchor.BN(100_000_000); // 0.1 SOL
    const durationSeconds = new anchor.BN(3600);

    const [taskAccountPDA, _taskBump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("task_account"),
          wallet.publicKey.toBuffer(),
          taskId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

    const [configPDA, _configBump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("config_v2")],
        program.programId
      );

    console.log(`  - Task ID: ${taskId.toString()}`);
    console.log(`  - Task PDA: ${taskAccountPDA.toString()}`);

    const createTaskTx = await program.methods
      .createTask(taskId, rewardAmount, durationSeconds)
      .accounts({
        taskAccount: taskAccountPDA,
        consigner: wallet.publicKey,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ createTask transaction successful!");

    // =================================================================
    // STEP 2: タスクを拒否 (Reject)
    // =================================================================
    console.log("\nSTEP 2: Rejecting the task to make it reclaimable...");

    const [adminActionCounterPDA, _] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin_counter"), wallet.publicKey.toBuffer()],
        program.programId
      );

    const rejectTaskTx = await program.methods
      .rejectTask()
      .accounts({
        taskAccount: taskAccountPDA,
        consignerWallet: wallet.publicKey,
        config: configPDA,
        adminActionCounter: adminActionCounterPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ rejectTask transaction successful!");

    // =================================================================
    // STEP 3: 資金を回収 (Reclaim)
    // =================================================================
    console.log("\nSTEP 3: Reclaiming funds from the rejected task...");

    console.log(
      "   - Proceeding to reclaim (assuming denial penalty period has passed)..."
    );

    const reclaimTx = await program.methods
      .reclaimTaskFunds()
      .accounts({
        taskAccount: taskAccountPDA,
        consignerWallet: wallet.publicKey,
        config: configPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ reclaimTaskFunds transaction successful!");
    console.log("   🔗 Signature:", reclaimTx);

    // =================================================================
    // STEP 4: 結果の検証
    // =================================================================
    console.log("\nSTEP 4: Verifying the final state...");

    const taskAccountData = await program.account.taskAccount.fetch(
      taskAccountPDA
    );
    const currentStatusName = Object.keys(taskAccountData.status)[0];
    const lockedAmount = taskAccountData.rewardAmountLocked.toNumber();

    console.log(`  - Final Task Status: ${currentStatusName}`);
    console.log(`  - Final Locked Amount: ${lockedAmount}`);

    if (currentStatusName.toLowerCase() !== "reclaimed") {
      throw new Error(
        `Verification failed: task status should be 'Reclaimed', but it is '${currentStatusName}'.`
      );
    }

    if (lockedAmount !== 0) {
      throw new Error(
        `Verification failed: rewardAmountLocked should be 0, but it is ${lockedAmount}.`
      );
    }

    console.log("🎉🎉🎉 Reclaim workflow test passed successfully! 🎉🎉🎉");
  } catch (error) {
    console.error("❌ Script failed with error:", error);
    if (error.logs) {
      console.error("Full logs:", error.logs);
    }
  }
}

// メイン関数を実行します
main();
