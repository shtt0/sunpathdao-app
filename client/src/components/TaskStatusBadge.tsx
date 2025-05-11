import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TaskStatus } from '@shared/types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export default function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  let variant: 
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'info'
    | 'neutral' = 'neutral';
  
  // Custom label mapping
  let label;
  switch (status) {
    case 'available':
      label = 'Available';
      break;
    case 'in_progress':
      label = 'Available';  // Both available and in_progress show as "Available"
      break;
    case 'judging':
      label = 'Judging';
      break;
    default:
      // Default formatting for other statuses
      label = status.replace('_', ' ');
      
      // Capitalize the first letter of each word
      label = label
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
  
  switch (status) {
    case 'available':
      variant = 'success';
      break;
    case 'in_progress':
      variant = 'success';  // Same styling as available
      break;
    case 'judging':
      variant = 'warning';
      break;
    case 'completed':
      variant = 'secondary';
      break;
    case 'expired':
      variant = 'neutral';
      break;
    default:
      variant = 'neutral';
  }
  
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
