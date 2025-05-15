import { createAppKit, useAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Reown Cloudから取得したプロジェクトID
export const projectId = '94bdc72864350b5bb20a86fdf3e6c59e';

// Solanaアダプターの設定
const solanaAdapter = new SolanaAdapter();

// モーダルの初期化（AppKitの初期化）
const modal = createAppKit({
  adapters: [solanaAdapter],
  networks: [solana, solanaTestnet, solanaDevnet] as any,
  metadata: {
    name: 'SUNPATH DAO',
    description: 'Location-based task economy powered by Solana',
    url: 'https://sunpath.replit.app',
    icons: ['https://sunpath.replit.app/generated-icon.png']
  },
  projectId,
  themeMode: 'light',
  features: {
    email: true,
    socials: ["google", "x", "discord", "github"],
    emailShowWallets: true,
    analytics: true
  }
});

export {
  modal,
  useAppKit,
}