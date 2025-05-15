import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { API_ROUTES } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { PublicKey } from '@solana/web3.js';
import { formatSOL } from '@/lib/utils';
import { getSolBalance, createTransferTransaction } from '@/lib/solana';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const { walletStatus, walletAddress, signAndSendTransaction } = useWallet();
  const { toast } = useToast();
  const [increaseRewardOpen, setIncreaseRewardOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [additionalReward, setAdditionalReward] = useState('0.5');
  
  // Account status state
  const [depositBalance, setDepositBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [withdrawRequestDate, setWithdrawRequestDate] = useState<Date | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
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
  
  // Fetch deposit balance from blockchain
  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress || walletStatus !== 'connected') return;
      
      try {
        setIsLoadingBalance(true);
        // In a real app, this would fetch the balance from a deposit escrow contract
        // For demo purposes, we're simulating a deposit balance
        
        // Get the wallet's SOL balance
        const pubkey = new PublicKey(walletAddress);
        const balance = await getSolBalance(pubkey);
        
        // For demo purposes only: simulating a deposit balance (3 SOL max)
        // In a real app, this would query an escrow contract
        setDepositBalance(Math.min(balance * 0.1, 3));
      } catch (error) {
        console.error('Error fetching deposit balance:', error);
        toast({
          title: 'Error',
          description: 'Failed to load account balance',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingBalance(false);
      }
    };
    
    fetchBalance();
  }, [walletAddress, walletStatus, toast]);
  
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
  
  // Extract user ID from user data
  const userId = userData?.user?.id;
  
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
  
  // Handle deposit button click
  const handleDeposit = async () => {
    if (!walletAddress) return;
    
    try {
      setIsDepositing(true);
      
      // In a real app, this would create a transaction to an escrow contract
      // For demo purposes, we'll simulate a successful deposit
      
      // Simulating a blockchain transaction delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update the deposit balance (simulated)
      setDepositBalance(3);
      
      toast({
        title: 'Deposit Successful',
        description: '3 SOL has been deposited to your account.',
      });
    } catch (error) {
      console.error('Error making deposit:', error);
      toast({
        title: 'Deposit Failed',
        description: 'Failed to deposit SOL. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDepositing(false);
    }
  };
  
  // Handle withdraw request
  const handleWithdrawRequest = () => {
    // Set the request date
    const requestDate = new Date();
    setWithdrawRequestDate(requestDate);
    
    // In a real app, this would be stored in the database
    
    toast({
      title: 'Withdrawal Request Submitted',
      description: 'Your withdrawal request has been submitted.',
    });
  };
  
  // Handle withdraw
  const handleWithdraw = async () => {
    if (!walletAddress) return;
    
    try {
      setIsWithdrawing(true);
      
      // In a real app, this would create a withdrawal transaction
      // For demo purposes, we'll simulate a successful withdrawal
      
      // Simulating a blockchain transaction delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update the deposit balance (simulated)
      setDepositBalance(0);
      setWithdrawRequestDate(null);
      
      toast({
        title: 'Withdrawal Successful',
        description: '3 SOL has been withdrawn to your wallet.',
      });
    } catch (error) {
      console.error('Error making withdrawal:', error);
      toast({
        title: 'Withdrawal Failed',
        description: 'Failed to withdraw SOL. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-display font-bold text-neutral-900">My Task Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage your commissioned tasks and review submissions
        </p>
      </div>

      {/* Account Status Section */}
      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <div className="bg-primary-light/10 rounded-lg p-2">
                <span className="material-icons text-primary-dark">account_balance</span>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-display font-medium text-neutral-900">Account Status</h2>
                <p className="text-sm text-neutral-500">Manage your deposit for task commissioning</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium leading-6 text-neutral-900">
                    Current Deposit:
                  </h3>
                  {isLoadingBalance ? (
                    <div className="flex items-center text-neutral-500">
                      <span className="material-icons animate-spin mr-1 text-sm">sync</span>
                      Loading...
                    </div>
                  ) : (
                    <span className="text-xl font-display font-bold">{formatSOL(depositBalance)}</span>
                  )}
                  
                  {depositBalance >= 3 ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <span className="material-icons text-xs mr-1">check_circle</span>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <span className="material-icons text-xs mr-1">info</span>
                      Not Active
                    </Badge>
                  )}
                </div>
                
                {depositBalance < 3 && (
                  <p className="mt-2 text-sm text-neutral-600">
                    Deposit 3 SOL to activate your commissioner account and create tasks.
                  </p>
                )}
                
                {withdrawRequestDate && (
                  <p className="mt-2 text-sm text-amber-600">
                    Withdrawal requested on {withdrawRequestDate.toLocaleDateString()}. Available after 7 days.
                  </p>
                )}
              </div>
              
              <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                {depositBalance < 3 ? (
                  <Button 
                    disabled={isDepositing}
                    onClick={handleDeposit}
                    className="inline-flex items-center"
                  >
                    {isDepositing ? (
                      <>
                        <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                        Depositing...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2 text-sm">account_balance_wallet</span>
                        Deposit 3 SOL
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline" 
                      disabled={!!withdrawRequestDate || isWithdrawing}
                      onClick={handleWithdrawRequest}
                      className="inline-flex items-center"
                    >
                      <span className="material-icons mr-2 text-sm">event</span>
                      Request Withdrawal
                    </Button>
                    
                    <Button
                      variant="outline"
                      disabled={!withdrawRequestDate || isWithdrawing}
                      onClick={handleWithdraw}
                      className="inline-flex items-center"
                    >
                      {isWithdrawing ? (
                        <>
                          <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                          Withdrawing...
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-2 text-sm">savings</span>
                          Withdraw
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {depositBalance >= 3 && (
              <div className="mt-4 text-xs text-neutral-500">
                <span className="material-icons text-xs align-middle mr-1">info</span>
                Withdrawal is possible 7 days after the request application.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Active Tasks Section */}
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
