import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import TaskStatusBadge from '@/components/TaskStatusBadge';
import { formatSOL, generateStaticMapUrl } from '@/lib/utils';
import { Task } from '@shared/schema';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  // Generate static map URL for the route
  const mapImageUrl = React.useMemo(() => {
    return generateStaticMapUrl(task.startLocation, task.endLocation, 800, 400);
  }, [task.startLocation, task.endLocation]);

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-neutral-200 hover:shadow-md transition-shadow">
      <div 
        className="h-40 bg-cover bg-center relative" 
        style={{ 
          backgroundImage: `url(${mapImageUrl})` 
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
          <div className="text-white font-medium px-3 py-1 rounded shadow text-center">
            <div className="text-xs">Route Map</div>
          </div>
        </div>
      </div>
      <div className="px-4 py-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-neutral-900 truncate">{task.title}</h3>
          <TaskStatusBadge status={task.status as any} />
        </div>
        <div className="mt-2">
          <p className="text-sm text-neutral-500 flex items-center">
            <span className="material-icons text-neutral-400 mr-1 text-sm">location_on</span>
            {task.city}, {task.country}
          </p>
          <p className="mt-1 text-sm text-neutral-500 flex items-center">
            <span className="material-icons text-neutral-400 mr-1 text-sm">swap_horiz</span>
            {task.startLocation} → {task.endLocation}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg font-display font-semibold text-accent">{formatSOL(task.rewardAmount)}</span>
          </div>
          <Link href={`/driver/tasks/${task.id}`}>
            <Button size="sm">View Details</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
