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

  // Load the map when component mounts
  useEffect(() => {
    if (!mapRef.current || mapLoaded || scriptLoadedRef.current) return;
    
    // Function to initialize the map
    const initMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) {
        setMapError(true);
        return;
      }
      
      try {
        // Instead of geocoding, we'll create an approximate visualization
        // Assume Tokyo coordinates if geocoding is not available
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: 35.6812, lng: 139.7671 }, // Tokyo default
          mapTypeControl: false,
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          scrollwheel: false,
          draggable: false,
        });
        
        // Since we can't geocode, we'll create a simple route visualization
        // For Tokyo specific examples
        let startPoint, endPoint;
        
        // Recognize some common Tokyo locations
        if (startLocation.includes('Shibuya')) {
          startPoint = { lat: 35.6588, lng: 139.7022 };
        } else if (startLocation.includes('Shinjuku')) {
          startPoint = { lat: 35.6938, lng: 139.7034 };
        } else if (startLocation.includes('Akihabara')) {
          startPoint = { lat: 35.6980, lng: 139.7731 };
        } else if (startLocation.includes('Tokyo')) {
          startPoint = { lat: 35.6812, lng: 139.7671 };
        } else {
          // Default point with slight offset from center
          startPoint = { lat: 35.6712, lng: 139.7571 };
        }
        
        if (endLocation.includes('Harajuku')) {
          endPoint = { lat: 35.6703, lng: 139.7038 };
        } else if (endLocation.includes('Yoyogi')) {
          endPoint = { lat: 35.6715, lng: 139.6900 };
        } else if (endLocation.includes('Roppongi')) {
          endPoint = { lat: 35.6627, lng: 139.7307 };
        } else if (endLocation.includes('Ginza')) {
          endPoint = { lat: 35.6721, lng: 139.7636 };
        } else {
          // Default end point with slight offset from center
          endPoint = { lat: 35.6912, lng: 139.7771 };
        }
        
        // Create bounds to fit markers
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(startPoint);
        bounds.extend(endPoint);
        
        // Function to add a marker
        const addMarker = (position: any, color: string, label: string) => {
          // Add marker
          const marker = new window.google.maps.Marker({
            position,
            map,
            label,
            icon: {
              url: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
              scaledSize: new window.google.maps.Size(24, 24),
            }
          });
        };
        
        // Add start and end markers
        addMarker(startPoint, 'green', 'S');
        addMarker(endPoint, 'red', 'E');
        
        // Add polyline between the points
        const routePath = new window.google.maps.Polyline({
          path: [startPoint, endPoint],
          geodesic: true,
          strokeColor: '#0088FF',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: map,
        });
        
        // Fit map to bounds
        map.fitBounds(bounds);
        
        // Add padding
        const padding = {
          top: 30,
          right: 30,
          bottom: 30,
          left: 30
        };
        
        map.fitBounds(bounds, padding);
        
        // Set map as loaded
        setMapLoaded(true);
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError(true);
      }
    };

    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      initMap();
    } else {
      // Load Google Maps API script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.id = 'google-maps-script';
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        setMapError(true);
      };
      
      scriptLoadedRef.current = true;
      document.head.appendChild(script);
    }
  }, [startLocation, endLocation, mapLoaded]);

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