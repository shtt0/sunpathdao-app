import React, { useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';

// シンプルなReownウォレット接続ボタンコンポーネント
export default function ReownWalletButton() {
  // AppKitのコンテキストをアクティブ化
  useAppKit();

  useEffect(() => {
    // Reownを使用する準備ができたかどうかをコンソールに表示
    console.log('Reown AppKit initialized in ReownWalletButton component');
  }, []);

  return (
    <>
      <div className="appkit-buttons-container">
        {/* AppKitのグローバルWebコンポーネントを使用 */}
        <appkit-button />
        <appkit-network-button />
      </div>
    </>
  );
}