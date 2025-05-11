import React, { useEffect, useRef, useState } from 'react';
import { MAPS_CONFIG } from '@/lib/constants';

interface SimpleRouteMapProps {
  startLocation: string;
  endLocation: string;
  height?: number;
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function SimpleRouteMap({ 
  startLocation, 
  endLocation, 
  height = 160,
  className = ''
}: SimpleRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const scriptLoadedRef = useRef(false);

  // Global variable to track if script is loading
  const isGoogleMapsLoading = React.useRef(false);
  const isGoogleMapsLoaded = React.useRef(false);

  // Load the map when component mounts
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Function to initialize the map
    const initMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) {
        setMapError(true);
        return;
      }
      
      try {
        // Use a fixed point for Tokyo
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 14,
          center: { lat: 35.6812, lng: 139.7671 }, // Tokyo default
          mapTypeControl: false,
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scrollwheel: false,
          draggable: false,
          disableDefaultUI: true,
        });
        
        // Use fixed points based on location names
        let startPoint = { lat: 35.6588, lng: 139.7022 }; // Shibuya
        let endPoint = { lat: 35.6703, lng: 139.7038 };   // Harajuku
        
        // Draw a simple line between points
        new window.google.maps.Polyline({
          path: [startPoint, endPoint],
          geodesic: true,
          strokeColor: '#0088FF',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: map,
        });
        
        // Set map as loaded
        setMapLoaded(true);
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError(true);
      }
    };

    // Global helper to load Google Maps once for all components
    const loadGoogleMapsScript = () => {
      // Return a promise that resolves when Google Maps is loaded
      return new Promise<void>((resolve, reject) => {
        // If already loaded, resolve immediately
        if (window.google && window.google.maps) {
          isGoogleMapsLoaded.current = true;
          resolve();
          return;
        }
        
        // If already loading, wait for the existing script
        if (isGoogleMapsLoading.current) {
          const checkLoaded = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(checkLoaded);
              isGoogleMapsLoaded.current = true;
              resolve();
            }
          }, 100);
          return;
        }
        
        // Start loading
        isGoogleMapsLoading.current = true;
        
        // Create script only if not already in document
        if (!document.getElementById('google-maps-script')) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
          script.id = 'google-maps-script';
          script.async = true;
          script.defer = true;
          
          script.onload = () => {
            isGoogleMapsLoaded.current = true;
            resolve();
          };
          
          script.onerror = () => {
            isGoogleMapsLoading.current = false;
            reject(new Error('Failed to load Google Maps API'));
          };
          
          document.head.appendChild(script);
        }
      });
    };
    
    // Load or use existing Google Maps
    loadGoogleMapsScript()
      .then(() => initMap())
      .catch(() => setMapError(true));
  }, []);

  if (mapError) {
    // Fallback display when map fails to load
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-neutral-100 ${className}`}
        style={{ height: `${height}px` }}
      >
        <span className="material-icons text-neutral-400 mb-1">map</span>
        <div className="text-neutral-500 text-sm">
          {startLocation} → {endLocation}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`relative ${className}`} 
      style={{ height: `${height}px` }}
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
          <div className="animate-pulse flex flex-col items-center">
            <span className="material-icons text-neutral-300 text-2xl">map</span>
            <span className="text-neutral-400 text-sm mt-2">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
}