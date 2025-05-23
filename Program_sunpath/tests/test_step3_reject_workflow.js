// tests/test_reject_workflow.js

// 非同期のメイン関数を定義して、スクリプト全体を囲みます
async function main() {
  try {
    console.log("🚀 Running REJECT workflow script (v2 with pre-fetch)...");

    const { SystemProgram } = anchor.web3;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Sunpath; // あなたのプログラム名に合わせてください
    const wallet = provider.wallet;

    // AdminActionCounterのPDAを導出
    const [adminActionCounterPDA, _adminBumpInitial] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin_counter"), wallet.publicKey.toBuffer()],
        program.programId
      );

    // STEP 0: rejectTask呼び出し前のrejectCountを取得
    // AdminActionCounterが初期化されていることを前提とします。
    // initialize_admin_counterテストが事前に成功しているはずです。
    let rejectCountBefore = 0;
    try {
      const counterDataBefore = await program.account.adminActionCounter.fetch(
        adminActionCounterPDA
      );
      rejectCountBefore = counterDataBefore.rejectCount.toNumber();
      console.log(
        `📊 Reject Count for ${wallet.publicKey.toString()} BEFORE rejectTask: ${rejectCountBefore}`
      );
    } catch (e) {
      console.error(
        `❌ CRITICAL: Failed to fetch AdminActionCounter for ${wallet.publicKey.toString()} BEFORE rejectTask. Ensure it's initialized. Error: ${
          e.message
        }`
      );
      console.error(
        "   This test cannot proceed without a valid initial counter state."
      );
      return; // テストを中止
    }

    // =================================================================
    // STEP 1: 新しいタスクを作成 (createTask)
    // =================================================================
    console.log("\nSTEP 1: Creating a new task to be rejected...");

    const taskId = new anchor.BN(Date.now()); // 現在時刻を元にユニークなIDを生成
    const rewardAmount = new anchor.BN(100_000_000); // 0.1 SOL
    const durationSeconds = new anchor.BN(3600); // 1時間

    // TaskAccountのPDAを導出
    const [taskAccountPDA, _taskBump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("task_account"),
          wallet.publicKey.toBuffer(),
          taskId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

    // ConfigアカウントのPDAを導出
    const [configPDA, _configBump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("config_v2")],
        program.programId
      );

    console.log(`  - Your Wallet (Consigner): ${wallet.publicKey.toString()}`);
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
    console.log("   🔗 Signature:", createTaskTx);

    // =================================================================
    // STEP 2: タスクを拒否 (rejectTask)
    // =================================================================
    console.log("\nSTEP 2: Rejecting the task...");

    console.log(
      `  - AdminActionCounter PDA for this consigner: ${adminActionCounterPDA.toString()}`
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
    console.log("   🔗 Signature:", rejectTaskTx);

    // =================================================================
    // STEP 3: 結果の検証
    // =================================================================
    console.log("\nSTEP 3: Verifying the results...");

    // rejectTask呼び出し後のrejectCountを取得
    const counterDataAfterReject =
      await program.account.adminActionCounter.fetch(adminActionCounterPDA);
    const rejectCountAfter = counterDataAfterReject.rejectCount.toNumber();
    console.log(`  - Reject Count AFTER rejectTask: ${rejectCountAfter}`);

    const expectedRejectCountAfter = rejectCountBefore + 1;
    if (rejectCountAfter !== expectedRejectCountAfter) {
      throw new Error(
        `Verification failed: rejectCount should have incremented from ${rejectCountBefore} to ${expectedRejectCountAfter}, but it is ${rejectCountAfter}.`
      );
    }

    // TaskAccountのステータスが"Rejected"になっていることを確認
    const taskAccountData = await program.account.taskAccount.fetch(
      taskAccountPDA
    );
    const currentStatusName = Object.keys(taskAccountData.status)[0];

    console.log(`  - Task status is now: ${currentStatusName}`);
    if (currentStatusName.toLowerCase() !== "rejected") {
      // 'rejected' (小文字)と比較
      throw new Error(
        `Verification failed: task status should be 'Rejected', but it is '${currentStatusName}'.`
      );
    }

    console.log("🎉🎉🎉 Reject workflow test passed successfully (v2)! 🎉🎉🎉");
  } catch (error) {
    console.error("❌ Script failed with error (v2):", error);
    if (error.logs) {
      console.error("Full logs:", error.logs);
    }
  }
}

// メイン関数を実行します
main();
