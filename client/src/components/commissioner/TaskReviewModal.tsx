import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ROUTES } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { apiRequest } from '@/lib/queryClient';
import { formatWalletAddress, formatDate, formatSOL } from '@/lib/utils';
import { createTransferTransaction } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Submission, Task } from '@shared/schema';

interface TaskReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  task: Task | null;
  runnerWalletAddress: string | null;
}

export default function TaskReviewModal({
  isOpen,
  onClose,
  submission,
  task,
  runnerWalletAddress,
}: TaskReviewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { walletAddress, signAndSendTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // Accept submission mutation
  const acceptMutation = useMutation({
    mutationFn: async (data: { submissionId: number; transactionId: string }) => {
      const response = await apiRequest('POST', `${API_ROUTES.SUBMISSIONS}/${data.submissionId}/accept`, {
        transactionId: data.transactionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.TASKS] });
      toast({
        title: 'Submission Accepted',
        description: 'The funds have been transferred to the runner.',
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error accepting submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept submission. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    },
  });

  // Decline submission mutation
  const declineMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await apiRequest('POST', `${API_ROUTES.SUBMISSIONS}/${submissionId}/decline`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.TASKS] });
      toast({
        title: 'Submission Declined',
        description: 'The submission has been declined and the task is now available again.',
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error declining submission:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline submission. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    },
  });

  // Handle accept submission
  const handleAccept = async () => {
    if (!submission || !task || !walletAddress || !runnerWalletAddress) {
      toast({
        title: 'Error',
        description: 'Missing required data to complete this action.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Create a transaction to transfer funds to the runner
      const transaction = await createTransferTransaction(
        new PublicKey(walletAddress),
        new PublicKey(runnerWalletAddress),
        Number(task.rewardAmount)
      );

      // Ask user to sign the transaction
      const signature = await signAndSendTransaction(transaction);

      // Update the submission status
      acceptMutation.mutate({
        submissionId: submission.id,
        transactionId: signature,
      });
    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: 'Transaction Failed',
        description: 'Failed to transfer funds. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  // Handle decline submission
  const handleDecline = () => {
    if (!submission) {
      toast({
        title: 'Error',
        description: 'Missing submission data.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    declineMutation.mutate(submission.id);
  };

  if (!submission || !task) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review Task Submission</DialogTitle>
          <DialogDescription>
            Task: <span className="font-medium">{task.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="bg-neutral-50 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-neutral-300 flex items-center justify-center">
                  <span className="material-icons text-neutral-500">person</span>
                </div>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-neutral-900">
                  Submitted by: <span className="font-mono">{formatWalletAddress(runnerWalletAddress)}</span>
                </h4>
                <p className="text-xs text-neutral-500">
                  Submitted on: {formatDate(submission.createdAt)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-neutral-700">Submission Video</h4>
            <div className="mt-2 video-container">
              <video 
                controls
                className="w-full h-full object-contain"
                src={submission.videoUrl}
                poster="https://via.placeholder.com/800x450/000000/FFFFFF?text=Video+Loading"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Recording time: {formatDate(submission.startTime)} - {formatDate(submission.endTime)}
            </p>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-neutral-700">Route Verification</h4>
            {task.routeData ? (
              <div id="submission-map" className="mt-2 map-container" />
            ) : (
              <div className="mt-2 bg-neutral-100 rounded-lg h-64 flex items-center justify-center">
                <p className="text-neutral-500">Route data not available</p>
              </div>
            )}
          </div>
          
          <div className="mt-6 border-t border-neutral-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-neutral-900">Task Reward</h4>
                <p className="text-2xl font-display font-bold text-neutral-900 flex items-center">
                  {formatSOL(task.rewardAmount)}
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isProcessing || declineMutation.isPending}
                >
                  {declineMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                      Declining...
                    </>
                  ) : (
                    'Decline'
                  )}
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing || acceptMutation.isPending}
                  className="bg-secondary hover:bg-secondary-dark"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                      Processing...
                    </>
                  ) : (
                    'Accept & Pay'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
