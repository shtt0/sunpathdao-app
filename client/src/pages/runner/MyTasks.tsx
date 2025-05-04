import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { API_ROUTES, ITEMS_PER_PAGE } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { formatSOL, formatDate } from '@/lib/utils';
import TaskStatusBadge from '@/components/TaskStatusBadge';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function MyTasks() {
  const { walletStatus, walletAddress } = useWallet();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  
  // Fetch user data to get user ID
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
  
  // Fetch user's submissions
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: [API_ROUTES.SUBMISSIONS, 'user', userData?.user?.id, statusFilter, page],
    queryFn: async () => {
      if (!userData?.user?.id) return null;
      
      const queryParams = new URLSearchParams();
      queryParams.append('userId', userData.user.id.toString());
      
      if (statusFilter && statusFilter !== 'all_statuses') {
        queryParams.append('status', statusFilter);
      }
      
      queryParams.append('page', page.toString());
      queryParams.append('limit', ITEMS_PER_PAGE.toString());
      
      const response = await fetch(`${API_ROUTES.SUBMISSIONS}?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      return response.json();
    },
    enabled: !!userData?.user?.id,
  });
  
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page when filter changes
  };
  
  // If wallet is not connected, show connect wallet message
  if (walletStatus !== 'connected') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-display font-bold text-neutral-900">My Tasks</h1>
          <p className="mt-1 text-sm text-neutral-600">
            View your task history and payment status
          </p>
        </div>
        
        <div className="mt-12 flex flex-col items-center justify-center">
          <div className="bg-primary-light/10 rounded-full p-6">
            <span className="material-icons text-4xl text-primary">account_balance_wallet</span>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-neutral-900">Wallet Not Connected</h2>
          <p className="mt-2 text-neutral-600 text-center max-w-md">
            Please connect your Phantom wallet to view your task history.
          </p>
        </div>
      </div>
    );
  }
  
  // If data is loading, show loading indicator
  if (isLoadingUser || isLoadingSubmissions) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <h1 className="text-2xl font-display font-bold text-neutral-900">My Tasks</h1>
          <p className="mt-1 text-sm text-neutral-600">
            View your task history and payment status
          </p>
        </div>
        
        <div className="mt-12 flex justify-center">
          <div className="flex items-center">
            <span className="material-icons animate-spin mr-2">sync</span>
            Loading your task history...
          </div>
        </div>
      </div>
    );
  }
  
  const submissions = submissionsData?.submissions || [];
  const totalSubmissions = submissionsData?.totalCount || 0;
  const totalPages = Math.ceil(totalSubmissions / ITEMS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-display font-bold text-neutral-900">My Tasks</h1>
        <p className="mt-1 text-sm text-neutral-600">
          View your task history and payment status
        </p>
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <div className="bg-primary-light/10 rounded-lg p-2">
                <span className="material-icons text-primary-dark">history</span>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-display font-medium text-neutral-900">Task History</h2>
                <p className="text-sm text-neutral-500">Track your completed and in-progress tasks</p>
              </div>
            </div>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4">
            <Link href="/runner/tasks">
              <Button variant="outline" className="inline-flex items-center">
                <span className="material-icons mr-2 text-sm">search</span>
                Find New Tasks
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-neutral-500">Filter by status</label>
              </div>
              <div className="w-48">
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        {submissions.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <p className="text-neutral-500">
                No submissions found. Complete tasks to see your history here.
              </p>
              <Link href="/runner/tasks">
                <Button className="mt-4">Browse Available Tasks</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission: any) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.task.title}</TableCell>
                      <TableCell>{formatDate(submission.createdAt)}</TableCell>
                      <TableCell>
                        <TaskStatusBadge 
                          status={
                            submission.status === 'pending' ? 'judging' : 
                            submission.status === 'accepted' ? 'completed' : 
                            'expired'
                          } 
                        />
                      </TableCell>
                      <TableCell>{formatSOL(submission.task.rewardAmount)}</TableCell>
                      <TableCell>
                        <Link href={`/runner/tasks/${submission.task.id}`}>
                          <Button variant="ghost" size="sm">
                            View Task
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 bg-white px-4 py-3 border-t border-neutral-200 sm:px-6 rounded-md shadow">
            <div>
              <p className="text-sm text-neutral-700">
                Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * ITEMS_PER_PAGE, totalSubmissions)}
                </span>{' '}
                of <span className="font-medium">{totalSubmissions}</span> submissions
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) handlePageChange(page - 1);
                    }}
                    className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (page <= 3) {
                    pageNumber = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = page - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(pageNumber);
                        }}
                        isActive={pageNumber === page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && page < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) handlePageChange(page + 1);
                    }}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
