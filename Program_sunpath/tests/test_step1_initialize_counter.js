// tests/test_initialize_counter.js

// 非同期のメイン関数を定義して、スクリプト全体を囲みます
async function main() {
  try {
    console.log("🚀 Running script: Initialize Admin Action Counter...");

    // AnchorとSolanaのライブラリを取得します (Playgroundが自動で提供)
    const { SystemProgram } = anchor.web3;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Sunpath; // ここはあなたのプログラム名に合わせてください
    const wallet = provider.wallet;

    // 1. AdminActionCounterのPDAを導出します
    const [adminActionCounterPDA, bump] =
      await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("admin_counter"), wallet.publicKey.toBuffer()],
        program.programId
      );

    console.log("🔑 Your Wallet (Admin):", wallet.publicKey.toString());
    console.log(
      "📈 Derived AdminActionCounter PDA:",
      adminActionCounterPDA.toString()
    );

    // 2. initializeAdminCounter命令を実行するトランザクションを送信します
    const tx = await program.methods
      .initializeAdminCounter()
      .accounts({
        adminActionCounter: adminActionCounterPDA,
        admin: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Transaction successful!");
    console.log("🔗 Transaction Signature:", tx);

    // 3. 作成されたアカウントのデータを取得して確認します
    const counterAccountData = await program.account.adminActionCounter.fetch(
      adminActionCounterPDA
    );

    console.log("📊 Fetched Counter Account Data:", counterAccountData);
    console.log("   - Admin:", counterAccountData.admin.toString());
    console.log(
      "   - Accept Count:",
      counterAccountData.acceptCount.toString()
    );
    console.log(
      "   - Reject Count:",
      counterAccountData.rejectCount.toString()
    );

    // 検証
    if (
      counterAccountData.acceptCount.toString() !== "0" ||
      counterAccountData.rejectCount.toString() !== "0"
    ) {
      throw new Error("Counter did not initialize to zero.");
    }

    console.log("🎉 Script finished and verified successfully!");
  } catch (error) {
    console.error("❌ Script failed with error:", error);
  }
}

// メイン関数を実行します
main();
