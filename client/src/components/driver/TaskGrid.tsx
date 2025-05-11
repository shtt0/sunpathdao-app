import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_ROUTES, COUNTRIES, ITEMS_PER_PAGE, SORT_OPTIONS, TASK_STATUS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import TaskCard from './TaskCard';
import { Task } from '@shared/schema';

export default function TaskGrid() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all_countries");
  const [statusFilter, setStatusFilter] = useState("available"); // デフォルトは利用可能なタスク
  const [sortBy, setSortBy] = useState("newest");

  // Fetch tasks from the API
  const { data, isLoading, error } = useQuery({
    queryKey: [API_ROUTES.TASKS, statusFilter, countryFilter, sortBy, page, searchQuery],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      
      // ステータスフィルターの適用
      if (statusFilter && statusFilter !== 'all_statuses') {
        queryParams.append('status', statusFilter);
      }
      
      if (countryFilter && countryFilter !== 'all_countries') {
        queryParams.append('country', countryFilter);
      }
      
      if (sortBy) {
        queryParams.append('sortBy', sortBy);
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
    window.scrollTo(0, 0);
  };

  const handleCountryFilterChange = (value: string) => {
    setCountryFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page when status filter changes
  };

  const handleSortByChange = (value: string) => {
    setSortBy(value);
    setPage(1); // Reset to first page when sort changes
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
    <div className="space-y-6">
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
                    placeholder="Search available tasks"
                  />
                </div>
              </form>
            </div>
            
            <div className="w-full md:w-40">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">All Statuses</SelectItem>
                  <SelectItem value={TASK_STATUS.AVAILABLE}>Available</SelectItem>
                  <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TASK_STATUS.JUDGING}>Judging</SelectItem>
                  <SelectItem value={TASK_STATUS.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={TASK_STATUS.EXPIRED}>Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-40">
              <Select value={countryFilter} onValueChange={handleCountryFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_countries">All Countries</SelectItem>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-40">
              <Select value={sortBy} onValueChange={handleSortByChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Grid */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-neutral-500">No tasks found that match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: Task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
