import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { API_ROUTES } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import TaskReviewModal from '@/components/commissioner/TaskReviewModal';
import { formatDate } from '@/lib/utils';

export default function ReviewSubmission() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { walletStatus } = useWallet();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // Fetch task data
  const { data: taskData, isLoading: isLoadingTask } = useQuery({
    queryKey: [API_ROUTES.TASKS, id],
    queryFn: async () => {
      const response = await fetch(`${API_ROUTES.TASKS}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
  });
  
  // Fetch submission data
  const { data: submissionData, isLoading: isLoadingSubmission } = useQuery({
    queryKey: [API_ROUTES.SUBMISSIONS, 'task', id],
    queryFn: async () => {
      const response = await fetch(`${API_ROUTES.SUBMISSIONS}/task/${id}`);
      if (!response.ok) throw new Error('Failed to fetch submission');
      return response.json();
    },
  });
  
  // Check if user is authorized to view this submission
  useEffect(() => {
    if (!isLoadingTask && taskData?.task) {
      // If the task is not in judging status, redirect to dashboard
      if (taskData.task.status !== 'judging') {
        navigate('/commissioner/dashboard');
      }
    }
  }, [isLoadingTask, taskData, navigate]);
  
  // If wallet is not connected, show message
  if (walletStatus !== 'connected') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Wallet Not Connected</h2>
          <p className="mb-4">You need to connect your wallet to review task submissions.</p>
        </div>
      </div>
    );
  }
  
  // If data is loading, show loading message
  if (isLoadingTask || isLoadingSubmission) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <span className="material-icons animate-spin">sync</span>
            Loading submission...
          </div>
        </div>
      </div>
    );
  }
  
  // If submission not found, show error message
  if (!submissionData?.submission || !taskData?.task) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Submission Not Found</h2>
          <p className="mb-4">The requested submission could not be found or you don't have permission to view it.</p>
          <Button onClick={() => navigate('/commissioner/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  
  const { task } = taskData;
  const { submission, runner } = submissionData;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <nav className="flex items-center text-sm font-medium text-neutral-500 mb-4">
          <Button variant="ghost" size="sm" className="flex items-center" onClick={() => navigate('/commissioner/dashboard')}>
            <span className="material-icons text-sm mr-1">arrow_back</span>
            Back to Dashboard
          </Button>
        </nav>
        
        <h1 className="text-2xl font-display font-bold text-neutral-900">Review Task Submission</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Task: <span className="font-medium">{task.title}</span>
        </p>
      </div>

      <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-neutral-300 flex items-center justify-center">
                <span className="material-icons text-neutral-500">person</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg leading-6 font-medium text-neutral-900">Submission Details</h3>
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">
                Submitted on {formatDate(submission.createdAt)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <h3 className="text-lg font-medium leading-6 text-neutral-900">Runner Information</h3>
              <dl className="mt-2 text-sm text-neutral-500">
                <div className="mt-1 flex justify-between">
                  <dt className="font-medium text-neutral-500">Wallet Address</dt>
                  <dd className="text-neutral-900 font-mono text-xs sm:text-sm">{runner.walletAddress}</dd>
                </div>
              </dl>
            </div>
            
            <div className="sm:col-span-3">
              <h3 className="text-lg font-medium leading-6 text-neutral-900">Task Details</h3>
              <dl className="mt-2 text-sm text-neutral-500">
                <div className="mt-1 flex justify-between">
                  <dt className="font-medium text-neutral-500">Location</dt>
                  <dd className="text-neutral-900">{task.city}, {task.country}</dd>
                </div>
                <div className="mt-1 flex justify-between">
                  <dt className="font-medium text-neutral-500">Route</dt>
                  <dd className="text-neutral-900">{task.startLocation} → {task.endLocation}</dd>
                </div>
                <div className="mt-1 flex justify-between">
                  <dt className="font-medium text-neutral-500">Reward</dt>
                  <dd className="text-accent font-display font-semibold">{Number(task.rewardAmount).toFixed(2)} SOL</dd>
                </div>
              </dl>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium leading-6 text-neutral-900">Submission Video</h3>
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
          
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={() => setIsReviewModalOpen(true)}
              className="inline-flex items-center"
            >
              Review Submission
            </Button>
          </div>
        </div>
      </div>
      
      {/* Review Modal */}
      <TaskReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        submission={submission}
        task={task}
        runnerWalletAddress={runner.walletAddress}
      />
    </div>
  );
}
