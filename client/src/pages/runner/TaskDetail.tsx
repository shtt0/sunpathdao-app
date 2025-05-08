import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { API_ROUTES, MAPS_CONFIG } from '@/lib/constants';
import { formatSOL, formatDate, calculateTimeLeft, blobToBase64 } from '@/lib/utils';
import { VideoRecordingData } from '@shared/types';
import VideoRecorder from '@/components/runner/VideoRecorder';
import TaskStatusBadge from '@/components/TaskStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { walletStatus, walletAddress } = useWallet();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Fetch task details
  const { data: taskData, isLoading, error } = useQuery({
    queryKey: [API_ROUTES.TASKS, id],
    queryFn: async () => {
      const response = await fetch(`${API_ROUTES.TASKS}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
  });
  
  // Initialize Google Maps after task data is loaded
  useEffect(() => {
    if (!taskData?.task || !taskData.task.routeData || !mapRef.current) return;
    
    const task = taskData.task;
    
    // Skip if no route data or map already loaded
    if (!task.routeData || mapLoaded) return;
    
    // Check for Google Maps API
    if (!window.google || !window.google.maps) {
      // Load Google Maps API if not already loaded
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap(task);
      document.head.appendChild(script);
    } else {
      // Initialize map directly if API already loaded
      initMap(task);
    }
  }, [taskData, mapLoaded]);
  
  // Initialize map with route data
  const initMap = (task: any) => {
    if (!mapRef.current || mapLoaded) return;
    
    try {
      // Extract route data
      const { routeData } = task;
      
      if (!routeData) {
        console.error('No route data available');
        return;
      }
      
      // Create the map
      const google = window.google;
      const map = new google.maps.Map(mapRef.current, {
        zoom: MAPS_CONFIG.defaultZoom,
        center: { 
          lat: routeData.startLocation?.lat || 0, 
          lng: routeData.startLocation?.lng || 0 
        },
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      });
      
      // Set map bounds to show the entire route
      if (routeData.bounds) {
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(
            routeData.bounds.southwest.lat,
            routeData.bounds.southwest.lng
          ),
          new google.maps.LatLng(
            routeData.bounds.northeast.lat,
            routeData.bounds.northeast.lng
          )
        );
        map.fitBounds(bounds);
      }
      
      // Create start marker
      if (routeData.startLocation) {
        new google.maps.Marker({
          position: { 
            lat: routeData.startLocation.lat, 
            lng: routeData.startLocation.lng 
          },
          map,
          title: 'Start',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new google.maps.Size(32, 32),
          },
        });
      }
      
      // Create end marker
      if (routeData.endLocation) {
        new google.maps.Marker({
          position: { 
            lat: routeData.endLocation.lat, 
            lng: routeData.endLocation.lng 
          },
          map,
          title: 'End',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32),
          },
        });
      }
      
      // Draw the route using polyline
      if (routeData.polyline) {
        const path = google.maps.geometry.encoding.decodePath(routeData.polyline);
        
        new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#0088FF',
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map,
        });
      }
      
      // Mark map as loaded
      setMapLoaded(true);
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  };
  
  // Submit task completion mutation
  const submitTaskMutation = useMutation({
    mutationFn: async (data: {
      taskId: number;
      videoData: string;
      startTime: string;
      endTime: string;
    }) => {
      const response = await apiRequest('POST', API_ROUTES.SUBMISSIONS, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.TASKS] });
      toast({
        title: 'Submission Successful',
        description: 'Your task completion has been submitted and is pending review.',
      });
      navigate('/runner/my-tasks');
    },
    onError: (error) => {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit task completion. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });
  
  // Start recording
  const handleStartRecording = () => {
    if (!walletAddress) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsRecording(true);
  };
  
  // Handle completed recording
  const handleRecordingComplete = async (recordingData: VideoRecordingData) => {
    if (!taskData?.task || !id) {
      toast({
        title: 'Error',
        description: 'Task data is missing.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Convert blob to base64
      const base64Data = await blobToBase64(recordingData.blob);
      
      // Submit the recording
      submitTaskMutation.mutate({
        taskId: parseInt(id),
        videoData: base64Data,
        startTime: recordingData.startTime.toISOString(),
        endTime: recordingData.endTime.toISOString(),
      });
      
      setIsRecording(false);
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process the recording. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };
  
  // Cancel recording
  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  // If wallet is not connected, show connect wallet message
  if (walletStatus !== 'connected') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Wallet Not Connected</h2>
          <p className="mb-4">You need to connect your wallet to view task details.</p>
        </div>
      </div>
    );
  }
  
  // If task is loading, show loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <span className="material-icons animate-spin">sync</span>
            Loading task details...
          </div>
        </div>
      </div>
    );
  }
  
  // If there was an error loading the task, show error message
  if (error || !taskData?.task) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Error Loading Task</h2>
          <p className="mb-4">There was an error loading the task details. Please try again later.</p>
          <Button onClick={() => navigate('/runner/tasks')}>
            Back to Available Tasks
          </Button>
        </div>
      </div>
    );
  }
  
  const { task, commissioner } = taskData;
  const timeLeft = calculateTimeLeft(task.expiresAt);
  const isAvailable = task.status === 'available';

  return (
    <>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <nav className="flex items-center text-sm font-medium text-neutral-500">
            <Button variant="ghost" size="sm" className="flex items-center" onClick={() => navigate('/runner/tasks')}>
              <span className="material-icons text-sm mr-1">arrow_back</span>
              Back to Available Tasks
            </Button>
          </nav>
          
          <div className="mt-4">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-display font-bold text-neutral-900">{task.title}</h1>
                  <p className="mt-1 text-sm text-neutral-500">Task by: <span className="font-mono">{commissioner.walletAddress.slice(0, 4)}...{commissioner.walletAddress.slice(-4)}</span></p>
                </div>
                <div>
                  <TaskStatusBadge status={task.status} />
                </div>
              </div>
              
              <div className="border-t border-neutral-200 px-4 py-5 sm:px-6">
                <div 
                  ref={mapRef} 
                  className="map-container w-full h-96 rounded-lg overflow-hidden mb-6" 
                  id="task-map"
                ></div>
                
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
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
                        <dt className="font-medium text-neutral-500">Distance</dt>
                        <dd className="text-neutral-900">
                          {task.routeData?.distance?.text || 'Not available'}
                        </dd>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <dt className="font-medium text-neutral-500">Estimated Time</dt>
                        <dd className="text-neutral-900">
                          {task.routeData?.duration?.text || 'Not available'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <h3 className="text-lg font-medium leading-6 text-neutral-900">Reward & Timeline</h3>
                    <dl className="mt-2 text-sm text-neutral-500">
                      <div className="mt-1 flex justify-between">
                        <dt className="font-medium text-neutral-500">Reward</dt>
                        <dd className="text-accent text-lg font-display font-semibold">{formatSOL(task.rewardAmount)}</dd>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <dt className="font-medium text-neutral-500">Posted</dt>
                        <dd className="text-neutral-900">{formatDate(task.createdAt)}</dd>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <dt className="font-medium text-neutral-500">Expires</dt>
                        <dd className={`text-neutral-900 ${timeLeft.isExpired ? 'text-red-500' : ''}`}>
                          {timeLeft.isExpired ? `Expired ${formatDate(task.expiresAt)}` : timeLeft.text}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                <div className="mt-6 prose prose-sm max-w-none text-neutral-500">
                  <h3 className="text-lg font-medium leading-6 text-neutral-900">Description</h3>
                  <p>{task.description}</p>
                </div>
                
                <div className="mt-6 border-t border-neutral-200 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500">Ready to complete this task?</p>
                      <p className="text-xs text-neutral-500 mt-1">You will need to record a 15-second video while completing the route</p>
                    </div>
                    <Button
                      onClick={handleStartRecording}
                      disabled={!isAvailable || isUploading}
                      className="inline-flex items-center"
                    >
                      {isUploading ? (
                        <>
                          <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-1 text-sm">videocam</span>
                          Record & Complete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Video Recorder Modal */}
      {isRecording && (
        <VideoRecorder 
          onRecordingComplete={handleRecordingComplete}
          onCancel={handleCancelRecording}
        />
      )}
    </>
  );
}
