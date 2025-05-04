import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ROUTES, COUNTRIES } from '@/lib/constants';
import { useWallet } from '@/contexts/WalletContext';
import { apiRequest } from '@/lib/queryClient';
import { createTransferTransaction } from '@/lib/solana';

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
  expiresAt: z.string().refine(val => new Date(val) > new Date(), {
    message: "Expiration date must be in the future",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTaskFormProps {
  recreateTaskId?: number;
}

export default function CreateTaskForm({ recreateTaskId }: CreateTaskFormProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { walletStatus, walletAddress, signAndSendTransaction } = useWallet();
  const [mapIsLoaded, setMapIsLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [isLockingFunds, setIsLockingFunds] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if the Google Maps API script is already loaded
    if (window.google && window.google.maps) {
      setMapIsLoaded(true);
      return;
    }

    // Load the Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapIsLoaded(true);

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize map when API is loaded
  useEffect(() => {
    if (!mapIsLoaded) return;

    const mapContainerElement = document.getElementById('map-container');
    if (!mapContainerElement) return;

    const map = new window.google.maps.Map(mapContainerElement, {
      center: { lat: 35.6812, lng: 139.7671 }, // Tokyo, Japan
      zoom: 14,
    });

    setMapInstance(map);

    return () => {
      // Cleanup map
    };
  }, [mapIsLoaded]);

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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default to 7 days in the future
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
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default to 7 days from now
      });

      // If there's route data, update the map
      if (task.routeData && mapInstance) {
        displayRoute(task.startLocation, task.endLocation);
      }
    }
  }, [taskData, mapInstance, form]);

  // Function to display route on map
  const displayRoute = (start: string, end: string) => {
    if (!mapIsLoaded || !mapInstance) return;

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer();
    
    directionsRenderer.setMap(mapInstance);

    directionsService.route(
      {
        origin: start,
        destination: end,
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (response, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(response);
          setRoute(response);
        } else {
          console.error('Directions request failed:', status);
          toast({
            title: 'Route Error',
            description: 'Could not find a route between the locations',
            variant: 'destructive',
          });
        }
      }
    );
  };

  // Update route when start or end location changes
  const updateRoute = () => {
    const startLocation = form.getValues('startLocation');
    const endLocation = form.getValues('endLocation');
    
    if (startLocation && endLocation) {
      displayRoute(startLocation, endLocation);
    }
  };

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: FormValues & { routeData?: any, transactionId?: string }) => {
      const response = await apiRequest('POST', API_ROUTES.TASKS, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ROUTES.TASKS] });
      toast({
        title: 'Task Created',
        description: 'Your task has been successfully created',
      });
      navigate('/commissioner/dashboard');
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
      setIsLockingFunds(false);
    },
  });

  // Form submission handler
  const onSubmit = async (values: FormValues) => {
    if (!walletAddress) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }

    if (!route) {
      toast({
        title: 'Route Required',
        description: 'Please select a valid route on the map',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLockingFunds(true);

      // Prepare route data to save
      const routeData = {
        bounds: route.routes[0].bounds,
        distance: route.routes[0].legs[0].distance,
        duration: route.routes[0].legs[0].duration,
        polyline: route.routes[0].overview_polyline,
        startLocation: {
          lat: route.routes[0].legs[0].start_location.lat(),
          lng: route.routes[0].legs[0].start_location.lng(),
        },
        endLocation: {
          lat: route.routes[0].legs[0].end_location.lat(),
          lng: route.routes[0].legs[0].end_location.lng(),
        },
      };

      // Create a transaction to lock funds (in a real app, this would go to an escrow account)
      // For this demo, we'll just verify the transaction was created and signed
      const escrowPubkey = new PublicKey('11111111111111111111111111111111'); // Placeholder address
      const transaction = await createTransferTransaction(
        new PublicKey(walletAddress),
        escrowPubkey,
        values.rewardAmount
      );

      // Ask user to sign the transaction
      const signature = await signAndSendTransaction(transaction);

      // Submit the task with the transaction ID
      createTaskMutation.mutate({
        ...values,
        routeData,
        transactionId: signature,
      });

    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: 'Transaction Failed',
        description: 'Failed to lock funds for the task. Please try again.',
        variant: 'destructive',
      });
      setIsLockingFunds(false);
    }
  };

  // Check if wallet is connected
  if (walletStatus !== 'connected') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Wallet Not Connected</h2>
          <p className="mb-4">You need to connect your wallet to create a task.</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Task Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title</FormLabel>
                <FormControl>
                  <Input placeholder="Morning Run in Shibuya" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Task Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what needs to be done"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Country and City */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a country" />
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

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Tokyo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Route */}
          <div>
            <FormLabel>Route</FormLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-2">
              <FormField
                control={form.control}
                name="startLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-neutral-500">Start Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Shibuya Station" 
                        {...field} 
                        onBlur={() => {
                          field.onBlur();
                          updateRoute();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-neutral-500">End Location</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Yoyogi Park" 
                        {...field} 
                        onBlur={() => {
                          field.onBlur();
                          updateRoute();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Map Preview */}
          <div>
            <FormLabel>Map Preview</FormLabel>
            <div id="map-container" className="mt-2 h-64 rounded-lg bg-neutral-200" />
            {!mapIsLoaded && (
              <div className="text-center p-4 text-sm text-neutral-500">
                Loading map...
              </div>
            )}
          </div>

          {/* Reward and Expiration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="rewardAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward (SOL)</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="0.0"
                        {...field}
                        className="pr-12"
                      />
                    </FormControl>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-neutral-500 text-sm">SOL</span>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/commissioner/dashboard')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLockingFunds || createTaskMutation.isPending}
          >
            {isLockingFunds || createTaskMutation.isPending ? (
              <>
                <span className="material-icons animate-spin mr-2 text-sm">sync</span>
                {isLockingFunds ? 'Locking Funds...' : 'Creating Task...'}
              </>
            ) : (
              'Create & Lock Funds'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
