import React from 'react';
import { useWallet } from '@/contexts/WalletContext';
import TaskGrid from '@/components/runner/TaskGrid';

export default function AvailableTasks() {
  const { walletStatus } = useWallet();
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-display font-bold text-neutral-900">Available Tasks</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Browse available tasks and earn SOL by completing routes
        </p>
      </div>

      {walletStatus !== 'connected' ? (
        <div className="mt-12 flex flex-col items-center justify-center">
          <div className="bg-primary-light/10 rounded-full p-6">
            <span className="material-icons text-4xl text-primary">account_balance_wallet</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-neutral-900">Wallet Not Connected</h2>
          <p className="mt-2 text-neutral-600 text-center max-w-md">
            Please connect your Phantom wallet to browse and complete tasks.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <TaskGrid />
        </div>
      )}
    </div>
  );
}
