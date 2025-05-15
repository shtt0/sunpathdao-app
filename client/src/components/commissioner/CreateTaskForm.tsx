import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ROUTES, COUNTRIES, MAPS_CONFIG } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { apiRequest } from '@/lib/queryClient';
import { createTransferTransaction } from '@/lib/solana';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  DirectionsRenderer
} from '@react-google-maps/api';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { PublicKey } from '@solana/web3.js';

// Create form schema
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  country: z.string().min(2, "Please select a country"),
  city: z.string().min(2, "City is required"),
  startLocation: z.string().min(3, "Start location is required"),
  endLocation: z.string().min(3, "End location is required"),
  rewardAmount: z.coerce.number().positive("Reward must be greater than 0"),
  expiresAt: z.date().refine(val => val > new Date(), {
    message: "Expiration date must be in the future",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTaskFormProps {
  recreateTaskId?: number;
}

// Google Maps configuration
const libraries: ("drawing" | "geometry" | "localContext" | "visualization")[] = [];
const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

export default function CreateTaskForm({ recreateTaskId }: CreateTaskFormProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { walletStatus, walletAddress, signAndSendTransaction } = useWallet();
  const [isLockingFunds, setIsLockingFunds] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  
  // Load Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: libraries as any,
  });
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      country: '',
      city: '',
      startLocation: '',
      endLocation: '',
      rewardAmount: 0.5,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days in the future
    },
  });

  // Form submission handler
  const createTaskMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      // 1. Create a transaction to lock the funds
      if (!walletAddress) {
        throw new Error("Wallet is not connected");
      }
      
      // Create a payload for the task with proper type conversions
      const taskData = {
        ...formData,
        // Convert rewardAmount to string as expected by server
        rewardAmount: String(formData.rewardAmount),
        // Convert expiresAt Date to ISO string - server will parse it
        expiresAt: formData.expiresAt.toISOString(),
        routeData: routeData,
        commissionerWalletAddress: walletAddress,
      };
      
      console.log('Submitting task with converted data:', taskData);
      
      // 2. Submit the task to the server
      return apiRequest('POST', `${API_ROUTES.TASKS}`, taskData);
    },
    onSuccess: (data) => {
      toast({
        title: 'Task Created',
        description: 'Your task has been created successfully',
      });
      
      // Invalidate the tasks query to refresh the list
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.TASKS] });
      
      // Navigate to the home page (root) since /commissioner might not exist
      navigate('/');
    },
    onError: (error: any) => {
      console.error('Error creating task:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
      
      setIsLockingFunds(false);
    },
  });

  // If recreateTaskId is provided, fetch the task data to prefill the form
  const { data: taskData, isLoading: isLoadingTask } = useQuery({
    queryKey: [API_ROUTES.TASKS, recreateTaskId],
    queryFn: async () => {
      if (!recreateTaskId) return null;
      const response = await fetch(`${API_ROUTES.TASKS}/${recreateTaskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
    enabled: !!recreateTaskId,
  });

  // Fill form with task data when it's loaded
  useEffect(() => {
    if (taskData) {
      const task = taskData.task;
      if (!task) return;

      // Set form values
      form.reset({
        title: task.title,
        description: task.description,
        country: task.country,
        city: task.city,
        startLocation: task.startLocation,
        endLocation: task.endLocation,
        rewardAmount: Number(task.rewardAmount),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
      });

      // If there's route data and the map is loaded, calculate route
      if (task.routeData && isLoaded) {
        // Set timeout to wait for map to be fully loaded
        setTimeout(() => {
          calculateRoute();
        }, 1000);
      }
    }
  }, [taskData, isLoaded, form]);
  
  // Function to handle map load
  const onLoad = useCallback(function callback(map: google.maps.Map) {
    console.log('Google Map loaded successfully');
    map.setZoom(14);
    map.setCenter(MAPS_CONFIG.defaultCenter);
    setMap(map);
  }, []);

  // Function to handle map unmount
  const onUnmount = useCallback(function callback() {
    console.log('Google Map unmounted');
    setMap(null);
  }, []);

  // Relocated autocomplete functionality due to API restrictions
  // Now using manual text input for locations

  // Function to calculate route
  const calculateRoute = () => {
    if (!isLoaded || !map) return;
    
    const startLocation = form.getValues('startLocation');
    const endLocation = form.getValues('endLocation');
    
    if (!startLocation || !endLocation) {
      toast({
        title: 'Missing Location',
        description: 'Please set both start and end locations',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('Calculating route from', startLocation, 'to', endLocation);
    
    const directionsService = new google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: startLocation,
        destination: endLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          console.log('Route calculated successfully');
          setDirectionsResponse(result);
          
          // Extract route info for saving
          const routeDataObj = {
            distance: result.routes[0].legs[0].distance?.text || '',
            duration: result.routes[0].legs[0].duration?.text || '',
            start_location: {
              lat: result.routes[0].legs[0].start_location.lat(),
              lng: result.routes[0].legs[0].start_location.lng(),
            },
            end_location: {
              lat: result.routes[0].legs[0].end_location.lat(),
              lng: result.routes[0].legs[0].end_location.lng(),
            },
            polyline: result.routes[0].overview_polyline,
          };
          
          console.log('Route data:', routeDataObj);
          setRouteData(routeDataObj);
          
          toast({
            title: 'Route Calculated',
            description: `Distance: ${routeDataObj.distance}, Duration: ${routeDataObj.duration}`,
          });
        } else {
          console.error('Directions request failed:', status);
          toast({
            title: 'Route Error',
            description: `Could not calculate route: ${status}`,
            variant: 'destructive',
          });
        }
      }
    );
  };

  // Function to clear route
  const clearRoute = () => {
    setDirectionsResponse(null);
    setRouteData(null);
    form.setValue('startLocation', '');
    form.setValue('endLocation', '');
  };

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (walletStatus !== 'connected') {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to create a task',
        variant: 'destructive',
      });
      return;
    }
    
    if (!routeData) {
      toast({
        title: 'Route Required',
        description: 'Please set both start and end locations and calculate a route',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLockingFunds(true);
      
      // Submit the form data
      await createTaskMutation.mutateAsync(values);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsLockingFunds(false);
    }
  };

  // Render loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-center">
          <p className="mb-2">Loading Google Maps...</p>
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-6">
            {recreateTaskId ? 'Re-Create Task' : 'Create New Task'}
          </h1>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title Field */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Reward Amount Field */}
                <FormField
                  control={form.control}
                  name="rewardAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Amount (SOL)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0.01"
                          placeholder="0.5" 
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Minimum reward is 0.01 SOL</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Country Field */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* City Field */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Expiry Date Field */}
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry Date</FormLabel>
                      <div className="flex flex-col space-y-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        {/* Time selector */}
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => {
                              const timeValue = e.target.value;
                              if (timeValue && field.value) {
                                const [hours, minutes] = timeValue.split(':').map(Number);
                                const newDate = new Date(field.value);
                                newDate.setHours(hours);
                                newDate.setMinutes(minutes);
                                field.onChange(newDate);
                              }
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter detailed task description" 
                        className="h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Location Selection Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Route Selection</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Start Location Field */}
                  <FormField
                    control={form.control}
                    name="startLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Location</FormLabel>
                        <FormControl>
                          <div>
                            <Input
                              placeholder="Enter start location (eg. Tokyo Station)"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* End Location Field */}
                  <FormField
                    control={form.control}
                    name="endLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Location</FormLabel>
                        <FormControl>
                          <div>
                            <Input
                              placeholder="Enter end location (eg. Shibuya Station)"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Route Controls */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={calculateRoute}
                  >
                    Check Route
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={clearRoute}
                  >
                    Clear Route
                  </Button>
                </div>
                
                {/* Map Display */}
                <div className="w-full h-[400px] bg-gray-100 rounded-md relative">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    zoom={12}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={MAPS_CONFIG.options}
                  >
                    {directionsResponse && (
                      <DirectionsRenderer
                        directions={directionsResponse}
                        options={{
                          suppressMarkers: false,
                          draggable: true,
                        }}
                      />
                    )}
                  </GoogleMap>
                </div>
                
                {/* Route Info */}
                {routeData && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                    <h3 className="font-medium mb-2">Route Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Distance</p>
                        <p className="font-medium">{routeData.distance}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Driving Duration</p>
                        <p className="font-medium">{routeData.duration}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/')}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isLockingFunds || createTaskMutation.isPending}
                >
                  {isLockingFunds || createTaskMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⚙️</span>
                      {recreateTaskId ? 'Re-Creating Task...' : 'Creating Task...'}
                    </>
                  ) : (
                    <>{recreateTaskId ? 'Re-Create Task' : 'Create Task'}</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}