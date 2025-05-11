import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import TaskStatusBadge from '@/components/TaskStatusBadge';
import { formatSOL } from '@/lib/utils';
import { Task } from '@shared/schema';

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  // Generate a random map placeholder image using Unsplash
  const mapImageId = React.useMemo(() => {
    const mapIds = [
      'oGv9xIftcmM',
      'LY1eyQMFeyo',
      'wYbJeOUayU4',
      'JUqQEO-72LE',
      '5e861c8ad8c5f72e1eca15a6a36812d5',
      'a074ee4d8aeedc16a9e0e0a2e3d592cc',
    ];
    return mapIds[Math.floor(Math.random() * mapIds.length)];
  }, [task.id]);

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-neutral-200 hover:shadow-md transition-shadow">
      <div 
        className="h-40 bg-cover bg-center" 
        style={{ 
          backgroundImage: `url(https://source.unsplash.com/${mapImageId}/800x400)` 
        }}
      />
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
