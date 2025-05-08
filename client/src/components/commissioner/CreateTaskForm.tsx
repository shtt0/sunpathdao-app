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
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  DirectionsRenderer, 
  Autocomplete 
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

// Google Maps configuration
const libraries = ["places"];
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
  const [locationSelectionMode, setLocationSelectionMode] = useState<'start' | 'end' | null>(null);
  const [originLocation, setOriginLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
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
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default to 7 days in the future
    },
  });

  // Load Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Debug message
    console.log('Loading Google Maps API...');
    console.log('API Key available:', !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

    // Check if the Google Maps API script is already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps API already loaded');
      setMapIsLoaded(true);
      return;
    }

    // Load the Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps API loaded successfully');
      setMapIsLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
    };

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
    if (!mapIsLoaded) {
      console.log('Map not loaded yet, skipping map initialization');
      return;
    }

    console.log('Initializing map now that API is loaded');
    
    const mapContainerElement = document.getElementById('map-container');
    if (!mapContainerElement) {
      console.error('Map container element not found');
      return;
    }

    try {
      // Create the map instance
      const map = new window.google.maps.Map(mapContainerElement, {
        center: { lat: 35.6812, lng: 139.7671 }, // Tokyo, Japan
        zoom: 14,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        fullscreenControl: false,
      });
      
      console.log('Map instance created successfully');

      // Create directions renderer
      const renderer = new window.google.maps.DirectionsRenderer({
        draggable: true, // Allow route to be dragged/adjusted
        map: map
      });
      setDirectionsRenderer(renderer);
      
      // Store map instance in state for later use
      setMapInstance(map);
      
      // Return cleanup function
      return () => {
        // Cleanup - remove event listeners
        if (window.google && window.google.maps) {
          window.google.maps.event.clearInstanceListeners(map);
        }
        if (startMarker) startMarker.setMap(null);
        if (endMarker) endMarker.setMap(null);
        if (directionsRenderer) directionsRenderer.setMap(null);
      };
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: 'Map Error',
        description: 'Failed to initialize Google Maps. Please try refreshing the page.',
        variant: 'destructive',
      });
    }
  }, [mapIsLoaded]);
  
  // Separate effect for map click listener that depends on the map instance
  useEffect(() => {
    if (!mapInstance || !mapIsLoaded) {
      console.log('Map instance or API not available for click handler');
      return;
    }
    
    console.log('Setting up map click listener');
    
    // Add click listener to map for setting markers
    const clickListener = window.google.maps.event.addListener(mapInstance, 'click', (event: any) => {
      console.log('Map clicked!');
      console.log('Current location selection mode:', locationSelectionMode);
      
      if (!locationSelectionMode) {
        console.log('No location selection mode active, ignoring click');
        return;
      }
      
      const clickedLocation = event.latLng;
      console.log('Clicked location:', clickedLocation.lat(), clickedLocation.lng());
      
      try {
        const geocoder = new window.google.maps.Geocoder();
        
        if (locationSelectionMode === 'start') {
          console.log('Processing start location selection');
          // Clear previous start marker if it exists
          if (startMarker) {
            startMarker.setMap(null);
          }
          
          // Create new start marker
          const marker = new window.google.maps.Marker({
            position: clickedLocation,
            map: mapInstance,
            title: 'Start Location',
            label: 'S',
            animation: window.google.maps.Animation.DROP
          });
          setStartMarker(marker);
          
          // Get address from coordinates and update form
          geocoder.geocode({ location: clickedLocation }, (results: any, status: any) => {
            console.log('Geocoding result:', status, results);
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              console.log('Found address:', address);
              form.setValue('startLocation', address);
              
              // Try to update route if both locations are set
              const endLocation = form.getValues('endLocation');
              if (endLocation) {
                displayRoute(address, endLocation);
              }
              
              toast({
                title: 'Start Location Set',
                description: `Selected: ${address}`,
              });
            } else {
              console.error('Geocoding failed:', status);
              toast({
                title: 'Location Error',
                description: 'Could not determine address for this location',
                variant: 'destructive',
              });
            }
          });
          
          // Reset selection mode
          console.log('Resetting location selection mode');
          setLocationSelectionMode(null);
        }
        else if (locationSelectionMode === 'end') {
          console.log('Processing end location selection');
          // Clear previous end marker if it exists
          if (endMarker) {
            endMarker.setMap(null);
          }
          
          // Create new end marker
          const marker = new window.google.maps.Marker({
            position: clickedLocation,
            map: mapInstance,
            title: 'End Location',
            label: 'E',
            animation: window.google.maps.Animation.DROP
          });
          setEndMarker(marker);
          
          // Get address from coordinates and update form
          geocoder.geocode({ location: clickedLocation }, (results: any, status: any) => {
            console.log('Geocoding result:', status, results);
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address;
              console.log('Found address:', address);
              form.setValue('endLocation', address);
              
              // Try to update route if both locations are set
              const startLocation = form.getValues('startLocation');
              if (startLocation) {
                displayRoute(startLocation, address);
              }
              
              toast({
                title: 'End Location Set',
                description: `Selected: ${address}`,
              });
            } else {
              console.error('Geocoding failed:', status);
              toast({
                title: 'Location Error',
                description: 'Could not determine address for this location',
                variant: 'destructive',
              });
            }
          });
          
          // Reset selection mode
          console.log('Resetting location selection mode');
          setLocationSelectionMode(null);
        }
      } catch (error) {
        console.error('Error processing map click:', error);
        toast({
          title: 'Error',
          description: 'An error occurred when setting the location',
          variant: 'destructive',
        });
        setLocationSelectionMode(null);
      }
    });

    return () => {
      // Cleanup - remove click listener
      if (window.google && window.google.maps && clickListener) {
        window.google.maps.event.removeListener(clickListener);
        console.log('Removed map click listener');
      }
    };
  }, [mapInstance, mapIsLoaded, locationSelectionMode, form]);

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
    if (!mapIsLoaded) {
      console.log('Map not loaded, cannot display route');
      return;
    }
    
    if (!mapInstance) {
      console.log('Map instance not available, cannot display route');
      return;
    }
    
    if (!directionsRenderer) {
      console.log('Directions renderer not available, cannot display route');
      return;
    }
    
    console.log('Calculating route from', start, 'to', end);

    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      // Use the stored directionsRenderer to maintain consistency
      directionsRenderer.setMap(mapInstance);

      directionsService.route(
        {
          origin: start,
          destination: end,
          travelMode: window.google.maps.TravelMode.WALKING,
        },
        (response: any, status: any) => {
          console.log('Directions response status:', status);
          
          if (status === window.google.maps.DirectionsStatus.OK) {
            console.log('Route calculation successful');
            directionsRenderer.setDirections(response);
            setRoute(response);
            
            // If markers exist, hide them when showing the route
            if (startMarker) startMarker.setMap(null);
            if (endMarker) endMarker.setMap(null);
            
            toast({
              title: 'Route Calculated',
              description: `Distance: ${response.routes[0].legs[0].distance.text}, Duration: ${response.routes[0].legs[0].duration.text}`,
            });
          } else {
            console.error('Directions request failed:', status);
            toast({
              title: 'Route Error',
              description: 'Could not find a route between the locations. Try different locations.',
              variant: 'destructive',
            });
          }
        }
      );
    } catch (error) {
      console.error('Error calculating route:', error);
      toast({
        title: 'Route Error',
        description: 'An error occurred while calculating the route',
        variant: 'destructive',
      });
    }
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs text-neutral-500">Start Location</FormLabel>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          console.log('Setting location selection mode to: start');
                          setLocationSelectionMode('start');
                          
                          // 地図のステータスを確認
                          console.log('Map loaded:', mapIsLoaded);
                          console.log('Map instance exists:', !!mapInstance);
                          
                          toast({
                            title: 'Select Start Location',
                            description: 'Click on the map to set the start location',
                          });
                        }}
                        className="h-6 text-xs px-2"
                      >
                        Pick on Map
                      </Button>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs text-neutral-500">End Location</FormLabel>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          console.log('Setting location selection mode to: end');
                          setLocationSelectionMode('end');
                          
                          // 地図のステータスを確認
                          console.log('Map loaded:', mapIsLoaded);
                          console.log('Map instance exists:', !!mapInstance);
                          
                          toast({
                            title: 'Select End Location',
                            description: 'Click on the map to set the end location',
                          });
                        }}
                        className="h-6 text-xs px-2"
                      >
                        Pick on Map
                      </Button>
                    </div>
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
            <div className="flex items-center justify-between">
              <FormLabel>Map Preview</FormLabel>
              <div className="flex space-x-2">
                {locationSelectionMode && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => setLocationSelectionMode(null)}
                    className="h-7 text-xs"
                  >
                    Cancel Selection
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={updateRoute}
                  className="h-7 text-xs"
                  disabled={!form.getValues('startLocation') || !form.getValues('endLocation')}
                >
                  Calculate Route
                </Button>
              </div>
            </div>
            <div className="mt-2">
              <div id="map-container" className="h-64 rounded-lg bg-neutral-200" />
              {!mapIsLoaded && (
                <div className="text-center p-4 text-sm text-neutral-500">
                  Loading map...
                </div>
              )}
              {locationSelectionMode && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 mt-2 text-sm rounded">
                  {locationSelectionMode === 'start' ? 'Click on the map to select the start location' : 'Click on the map to select the end location'}
                </div>
              )}
              {route && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-2 mt-2 text-sm rounded">
                  Route distance: {route.routes[0].legs[0].distance.text} | 
                  Duration: {route.routes[0].legs[0].duration.text}
                </div>
              )}
            </div>
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
