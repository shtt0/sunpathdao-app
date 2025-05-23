// tests/test_expire_reclaim_workflow.js

async function main() {
  try {
    console.log("🚀 Running EXPIRE & RECLAIM workflow script...");

    const { SystemProgram } = anchor.web3;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Sunpath;
    const wallet = provider.wallet;

    // =================================================================
    // STEP 0: テスト前のカウンターの状態を取得
    // =================================================================
    console.log("\nSTEP 0: Fetching initial counter state...");

    const [adminActionCounterPDA, _] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin_counter"), wallet.publicKey.toBuffer()],
        program.programId
      );

    // このテストではカウンターが変更されないことを確認するため、事前に値を取得します
    const counterDataBefore = await program.account.adminActionCounter.fetch(
      adminActionCounterPDA
    );
    const acceptCountBefore = counterDataBefore.acceptCount.toNumber();
    const rejectCountBefore = counterDataBefore.rejectCount.toNumber();

    console.log(`  - Accept Count BEFORE test: ${acceptCountBefore}`);
    console.log(`  - Reject Count BEFORE test: ${rejectCountBefore}`);

    // =================================================================
    // STEP 1: 短い有効期間で新しいタスクを作成
    // =================================================================
    console.log("\nSTEP 1: Creating a new task with a short duration...");

    const taskId = new anchor.BN(Date.now());
    const rewardAmount = new anchor.BN(100_000_000); // 0.1 SOL
    const durationSeconds = new anchor.BN(0); // ★★★ 有効期間を0秒に変更 ★★★

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
    console.log("  - Task will expire in 0 seconds (immediately)."); // メッセージも修正

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
    // STEP 2: 資金を回収 (Reclaim)
    // =================================================================
    console.log("\nSTEP 2: Reclaiming funds from the expired task...");

    console.log("   - Proceeding to reclaim (assuming task has expired)...");

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
    // STEP 3: 結果の検証
    // =================================================================
    console.log("\nSTEP 3: Verifying the final state...");

    // TaskAccountの状態を検証
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

    // カウンターの状態を検証
    const counterDataAfter = await program.account.adminActionCounter.fetch(
      adminActionCounterPDA
    );
    const acceptCountAfter = counterDataAfter.acceptCount.toNumber();
    const rejectCountAfter = counterDataAfter.rejectCount.toNumber();

    console.log(`  - Accept Count AFTER test: ${acceptCountAfter}`);
    console.log(`  - Reject Count AFTER test: ${rejectCountAfter}`);

    if (acceptCountAfter !== acceptCountBefore) {
      throw new Error(
        `Verification failed: acceptCount changed from ${acceptCountBefore} to ${acceptCountAfter}. It should not have changed.`
      );
    }
    if (rejectCountAfter !== rejectCountBefore) {
      throw new Error(
        `Verification failed: rejectCount changed from ${rejectCountBefore} to ${rejectCountAfter}. It should not have changed.`
      );
    }

    console.log(
      "🎉🎉🎉 Expire & Reclaim workflow test passed successfully! 🎉🎉🎉"
    );
  } catch (error) {
    console.error("❌ Script failed with error:", error);
    if (error.logs) {
      console.error("Full logs:", error.logs);
    }
  }
}

// メイン関数を実行します
main();
