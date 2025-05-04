import React, { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { API_ROUTES } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

import TaskTable from '@/components/commissioner/TaskTable';

export default function Dashboard() {
  const { walletStatus, walletAddress } = useWallet();
  const { toast } = useToast();
  const [increaseRewardOpen, setIncreaseRewardOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [additionalReward, setAdditionalReward] = useState('0.5');
  
  // Fetch user data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: [API_ROUTES.USERS, walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      const response = await fetch(`${API_ROUTES.USERS}/${walletAddress}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
    enabled: !!walletAddress && walletStatus === 'connected',
  });
  
  // Handle opening increase reward dialog
  const handleIncreaseReward = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIncreaseRewardOpen(true);
  };
  
  // Handle submitting increase reward
  const handleIncreaseRewardSubmit = async () => {
    if (!selectedTaskId) return;
    
    try {
      const response = await fetch(`${API_ROUTES.TASKS}/${selectedTaskId}/increase-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additionalAmount: parseFloat(additionalReward),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to increase reward');
      }
      
      toast({
        title: 'Reward Increased',
        description: 'The task reward has been increased successfully.',
      });
      
      setIncreaseRewardOpen(false);
      setAdditionalReward('0.5');
    } catch (error) {
      console.error('Error increasing reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to increase reward. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  // If wallet is not connected, show connect wallet message
  if (walletStatus !== 'connected') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-display font-bold text-neutral-900">My Task Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Connect your wallet to manage your commissioned tasks
          </p>
        </div>
        
        <div className="mt-12 flex flex-col items-center justify-center">
          <div className="bg-primary-light/10 rounded-full p-6">
            <span className="material-icons text-4xl text-primary">account_balance_wallet</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-neutral-900">Wallet Not Connected</h2>
          <p className="mt-2 text-neutral-600 text-center max-w-md">
            Please connect your Phantom wallet to access the commissioner dashboard and manage your tasks.
          </p>
        </div>
      </div>
    );
  }
  
  // If user data is loading, show loading indicator
  if (isLoadingUser) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-display font-bold text-neutral-900">My Task Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Loading your commissioned tasks...
          </p>
        </div>
        
        <div className="mt-12 flex justify-center">
          <div className="flex items-center">
            <span className="material-icons animate-spin mr-2">sync</span>
            Loading your profile...
          </div>
        </div>
      </div>
    );
  }
  
  // Extract user ID from user data
  const userId = userData?.user?.id;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-display font-bold text-neutral-900">My Task Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage your commissioned tasks and review submissions
        </p>
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <div className="bg-primary-light/10 rounded-lg p-2">
                <span className="material-icons text-primary-dark">task_alt</span>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-display font-medium text-neutral-900">Active Tasks</h2>
                <p className="text-sm text-neutral-500">Manage your tasks and review submissions</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link href="/commissioner/create-task">
              <Button className="inline-flex items-center">
                <span className="material-icons mr-2 text-sm">add</span>
                Create New Task
              </Button>
            </Link>
          </div>
        </div>

        {/* Task Table */}
        <div className="mt-6">
          <TaskTable
            userId={userId}
            onIncreaseReward={handleIncreaseReward}
          />
        </div>
      </div>
      
      {/* Increase Reward Dialog */}
      <Dialog open={increaseRewardOpen} onOpenChange={setIncreaseRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Increase Task Reward</DialogTitle>
            <DialogDescription>
              Add more SOL to increase the reward for this task. This might attract more runners to complete your task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rewardAmount">Additional Reward (SOL)</Label>
                <div className="relative">
                  <Input
                    id="rewardAmount"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={additionalReward}
                    onChange={(e) => setAdditionalReward(e.target.value)}
                    className="pr-12"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-neutral-500 text-sm">SOL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIncreaseRewardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIncreaseRewardSubmit}
            >
              Increase Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
