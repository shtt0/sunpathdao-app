import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "./contexts/WalletContext";
import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';

// Solana Adapterの設定
const solanaAdapter = new SolanaAdapter();

// Reown Cloudから取得したプロジェクトID
const projectId = 'd23ae7d79eb19db8cf9c5e7595ea6e1f';

// メタデータの設定
const metadata = {
  name: 'SUNPATH DAO',
  description: 'Location-based task economy powered by Solana',
  url: window.location.origin,
  icons: [`${window.location.origin}/generated-icon.png`]
};

// AppKitの初期化（React外で実行）
createAppKit({
  adapters: [solanaAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata: metadata,
  projectId,
  features: {
    email: true,
    socials: ["google", "x", "discord", "github"],
    emailShowWallets: true,
    analytics: true
  }
});

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";

// Commissioner pages
import CommissionerDashboard from "@/pages/commissioner/Dashboard";
import CreateTask from "@/pages/commissioner/CreateTask";
import ReviewSubmission from "@/pages/commissioner/ReviewSubmission";

// Driver pages
import AvailableTasks from "@/pages/driver/AvailableTasks";
import TaskDetail from "@/pages/driver/TaskDetail";
import MyTasks from "@/pages/driver/MyTasks";

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Switch>
          {/* Public routes */}
          <Route path="/" component={Home} />
          
          {/* Commissioner routes */}
          <Route path="/commissioner/dashboard" component={CommissionerDashboard} />
          <Route path="/commissioner/create-task" component={CreateTask} />
          <Route path="/commissioner/review/:id" component={ReviewSubmission} />
          
          {/* Driver routes */}
          <Route path="/driver/tasks" component={AvailableTasks} />
          <Route path="/driver/tasks/:id" component={TaskDetail} />
          <Route path="/driver/achievement" component={MyTasks} />
          
          {/* Fallback to 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  // このコンポーネントでReownモーダルの初期化
  // useAppKitフックは不要、インポートしたモーダルで自動初期化
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <Router />
        <Toaster />
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
