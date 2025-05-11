import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { API_ROUTES, ITEMS_PER_PAGE, TASK_STATUS } from '@/lib/constants';
import { formatSOL, formatDate, calculateTimeLeft } from '@/lib/utils';
import TaskStatusBadge from '@/components/TaskStatusBadge';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Task } from '@shared/schema';
import { TaskStatus } from '@shared/types';

interface TaskTableProps {
  onIncreaseReward?: (taskId: number) => void;
  userId?: number;
}

export default function TaskTable({ onIncreaseReward, userId }: TaskTableProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tasks from the API
  const { data, isLoading, error } = useQuery({
    queryKey: [API_ROUTES.TASKS, 'commissioner', userId, statusFilter, page, searchQuery],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      if (userId) {
        queryParams.append('userId', userId.toString());
      }
      
      if (statusFilter && statusFilter !== 'all_statuses') {
        queryParams.append('status', statusFilter);
      }
      
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      
      queryParams.append('page', page.toString());
      queryParams.append('limit', ITEMS_PER_PAGE.toString());
      
      const response = await fetch(`${API_ROUTES.TASKS}?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      return response.json();
    },
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when search changes
  };

  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <div className="flex items-center gap-2">
          <span className="material-icons animate-spin">sync</span>
          Loading tasks...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 p-4 bg-red-50 text-red-800 rounded-md">
        <p>Error loading tasks. Please try again.</p>
      </div>
    );
  }

  const tasks = data?.tasks || [];
  const totalTasks = data?.totalCount || 0;
  const totalPages = Math.ceil(totalTasks / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-icons text-neutral-400">search</span>
                  </div>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10"
                    placeholder="Search tasks"
                  />
                </div>
              </form>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">All Statuses</SelectItem>
                  <SelectItem value={TASK_STATUS.AVAILABLE}>Available</SelectItem>
                  <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TASK_STATUS.JUDGING}>Judge Pending</SelectItem>
                  <SelectItem value={TASK_STATUS.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={TASK_STATUS.EXPIRED}>Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div>
        <h3 className="text-lg font-medium text-neutral-900 mb-3">Your Tasks</h3>
        
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-neutral-500">No tasks found. Create a new task to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task: Task) => {
                    const timeLeft = calculateTimeLeft(task.expiresAt);
                    const isJudging = task.status === 'judging';
                    const isAvailable = task.status === 'available';
                    const isExpired = task.status === 'expired';
                    
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <TaskStatusBadge status={task.status as TaskStatus} />
                        </TableCell>
                        <TableCell>{task.city}, {task.country}</TableCell>
                        <TableCell className="text-sm text-neutral-500">
                          {task.startLocation} → {task.endLocation}
                        </TableCell>
                        <TableCell>{formatSOL(task.rewardAmount)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-neutral-500">
                            {timeLeft.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Link href={`/commissioner/task/${task.id}`}>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </Link>
                            
                            {isJudging && (
                              <Link href={`/commissioner/review/${task.id}`}>
                                <Button size="sm">
                                  Review
                                </Button>
                              </Link>
                            )}
                            
                            {isAvailable && onIncreaseReward && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onIncreaseReward(task.id)}
                              >
                                Increase Reward
                              </Button>
                            )}
                            
                            {isExpired && (
                              <Link href={`/commissioner/create-task?recreate=${task.id}`}>
                                <Button variant="outline" size="sm">
                                  Recreate
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                  {Math.min(page * ITEMS_PER_PAGE, totalTasks)}
                </span>{' '}
                of <span className="font-medium">{totalTasks}</span> tasks
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
