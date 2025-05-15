import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import CreateTaskForm from '@/components/commissioner/CreateTaskForm';

export default function CreateTask() {
  const [location] = useLocation();
  
  // Extract recreate task ID from URL query params if present
  const urlParams = new URLSearchParams(window.location.search);
  const recreateTaskId = urlParams.get('recreate') ? parseInt(urlParams.get('recreate')!) : undefined;
  
  // Scroll to top of page on component mount
  useEffect(() => {
    // Check if URL has hash fragment
    if (window.location.hash === '#create-task-top') {
      // Add a small delay to ensure the DOM is fully loaded
      setTimeout(() => {
        const element = document.getElementById('create-task-top');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8" id="create-task-top">
      <div className="px-4 sm:px-0">
        <h1 className="text-2xl font-display font-bold text-neutral-900">
          {recreateTaskId ? 'Recreate Task' : 'Create New Task'}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Fill out the details below to create a new task for runners to complete.
        </p>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="pt-6">
            <CreateTaskForm recreateTaskId={recreateTaskId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
