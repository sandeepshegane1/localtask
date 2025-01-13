import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, DollarSign, MapPin, CheckCircle, Trash2, X, Share2, Navigation, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useGeolocation } from '@/hooks/useGeolocation';

interface User {
  _id: string;
  name: string;
  email: string;
  location?: { lat: number; lng: number };
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'QUICK_SERVICE_PENDING';
  budget: number;
  category: string;
  createdAt: string;
  provider?: { $oid: string } | string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  deadline?: string;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return parseFloat(distance.toFixed(1));
}

interface TaskNavigationMapProps {
  taskLocation: {
    lat: number;
    lng: number;
  };
  containerId: string;
}

const TaskNavigationMap: React.FC<TaskNavigationMapProps> = ({ taskLocation, containerId }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const { currentLocation } = useGeolocation();
  const [isMobile, setIsMobile] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!isLoaded || loadError) return;

    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Map container not found');
      return;
    }

    const mapInstance = new google.maps.Map(container, {
      zoom: 14,
      center: taskLocation,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    const renderer = new google.maps.DirectionsRenderer({
      map: mapInstance,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#4285F4',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      },
    });

    setMap(mapInstance);
    setDirectionsRenderer(renderer);

    new google.maps.Marker({
      position: taskLocation,
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#FF0000',
        fillOpacity: 0.8,
        strokeColor: 'white',
        strokeWeight: 2,
      },
      title: 'Task Location',
    });
  }, [isLoaded, loadError, containerId, taskLocation]);

  useEffect(() => {
    if (!map || !directionsRenderer || !currentLocation || !taskLocation) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: currentLocation,
        destination: taskLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          
          const route = result.routes[0];
          if (route && route.legs.length > 0) {
            const leg = route.legs[0];
            setDistance(leg.distance?.text || '');
            setDuration(leg.duration?.text || '');
          }
        }
      }
    );
  }, [map, directionsRenderer, currentLocation, taskLocation]);

  const openInGoogleMaps = () => {
    if (!currentLocation) {
      toast.error('Please enable location services');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${taskLocation.lat},${taskLocation.lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      toast.error('Please enable location services');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${taskLocation.lat},${taskLocation.lng}&travelmode=driving`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Task Location',
          text: 'Here is the route to the task location',
          url: url,
        });
        toast.success('Shared successfully');
      } catch (error) {
        console.error('Error sharing:', error);
        toast.error('Failed to share');
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy link');
    }
  };

  const copyMapLink = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${taskLocation.lat},${taskLocation.lng}&travelmode=driving`;
    copyToClipboard(url);
  };

  if (loadError) {
    return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="p-4">Loading map...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div id={containerId} className="flex-grow w-full rounded-lg overflow-hidden" />
      
      {/* Navigation Controls */}
      <div className="mt-2">
        <div className="bg-white rounded-lg shadow p-2">
          {/* Distance and Time Info */}
          {distance && duration && (
            <div className="mb-2 text-center">
              <p className="text-gray-700">
                <span className="font-semibold">{distance}</span> • 
                <span className="font-semibold ml-2">{duration}</span>
              </p>
            </div>
          )}
          
          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={openInGoogleMaps}
              className="flex flex-col items-center justify-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Navigation className="w-5 h-5 text-blue-600 mb-1" />
              <span className="text-xs text-blue-600 font-medium">Navigate</span>
            </button>
            
            <button
              onClick={shareLocation}
              className="flex flex-col items-center justify-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Share2 className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-purple-600 font-medium">Share</span>
            </button>
            
            <button
              onClick={copyMapLink}
              className="flex flex-col items-center justify-center p-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Copy className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="text-xs text-emerald-600 font-medium">Copy Link</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ProviderDashboard() {
  const user = useAuthStore((state) => state.user) as User | null;
  const [activeTab, setActiveTab] = useState<'quick' | 'open' | 'assigned' | 'completed'>('open');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const queryClient = useQueryClient();

  // Get current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Failed to get your location. Tasks will be shown without distance information.");
          // Set a default location or proceed without location
          setCurrentLocation(null);
        }
      );
    }
  }, []);

  // Fetch tasks based on active tab
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['provider-tasks', activeTab, currentLocation?.lat, currentLocation?.lng, user?._id],
    queryFn: async () => {
      console.log('Fetching tasks with params:', {
        status: activeTab === 'quick' ? 'QUICK_SERVICE_PENDING' : activeTab.toUpperCase(),
        lat: currentLocation?.lat,
        lng: currentLocation?.lng,
        userId: user?._id
      });

      const response = await api.get('/tasks/provider', {
        params: {
          status: activeTab === 'quick' ? 'QUICK_SERVICE_PENDING' : activeTab.toUpperCase(),
          lat: currentLocation?.lat,
          lng: currentLocation?.lng
        }
      });

      return response.data;
    },
    enabled: !!user?._id,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Accept task handler
  const handleAcceptTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, {
        status: 'ASSIGNED',
        provider: user?._id
      });
      
      toast.success('Task accepted successfully');
      queryClient.invalidateQueries(['provider-tasks']);
    } catch (error: any) {
      console.error('Error accepting task:', error);
      toast.error(error.response?.data?.error || 'Failed to accept task');
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Not Authenticated</h2>
          <p className="text-gray-600 mt-2">Please login to view your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'open', label: 'Open Tasks' },
            { id: 'quick', label: 'Quick Service Requests' },
            { id: 'assigned', label: 'Assigned Tasks' },
            { id: 'completed', label: 'Completed Tasks' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-red-500">Error loading tasks</p>
          <p className="text-gray-600 mt-2">{(error as any).message}</p>
        </div>
      )}

      {/* Tasks Grid */}
      {!isLoading && !error && (
        <>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No {activeTab} tasks found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task: Task) => (
                <div
                  key={task._id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    task.status === 'QUICK_SERVICE_PENDING'
                      ? 'border-emerald-500'
                      : task.status === 'ASSIGNED'
                      ? 'border-blue-500'
                      : task.status === 'COMPLETED'
                      ? 'border-purple-500'
                      : 'border-gray-500'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{task.title}</h3>
                  <p className="text-gray-600 mb-4">{task.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-500">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span>${task.budget}</span>
                    </div>
                    
                    {task.deadline && (
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    {task.location && currentLocation && (
                      <div className="flex items-center text-gray-500">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>
                          {calculateDistance(
                            currentLocation.lat,
                            currentLocation.lng,
                            task.location.coordinates[1],
                            task.location.coordinates[0]
                          )} km away
                        </span>
                      </div>
                    )}

                    <div className="flex items-center text-gray-500">
                      <span className="font-medium">Category:</span>
                      <span className="ml-2">{task.category}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(activeTab === 'open' || activeTab === 'quick') && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleAcceptTask(task._id)}
                        className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                      >
                        Accept Task
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
