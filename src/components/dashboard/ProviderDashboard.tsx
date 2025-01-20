import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, DollarSign, MapPin, CheckCircle, Trash2, X, Share2, Navigation, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useGeolocation } from '@/hooks/useGeolocation';

interface User {
  _id: string;
  name: string;
  email: string;
  location?: { lat: number; lng: number };
  category?: string;
  skills?: string[];
  role: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'QUICK_SERVICE_PENDING' | 'REJECTED';
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
              className="flex flex-col items-center justify-center p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Copy className="w-5 h-5 text-purple-600 mb-1" />
              <span className="text-xs text-purple-600 font-medium">Copy Link</span>
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
  const [selectedTaskForMap, setSelectedTaskForMap] = useState<Task | null>(null);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

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

  // Filter tasks based on provider's skills
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (activeTab !== 'quick') return tasks;
    
    // For quick service tab, show tasks matching provider's skills
    if (!user?.skills?.length) return tasks; // If no skills defined, show all tasks
    return tasks.filter((task: Task) => user.skills?.includes(task.category));
  }, [tasks, activeTab, user?.skills]);

  // Accept task handler
  const handleAcceptTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/accept`, {
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

  const handleCompleteTask = async (taskId: string) => {
    try {
      setSelectedTaskId(taskId);
      setIsVerifying(true);
      setEmailPreviewUrl(null);
      
      // Request OTP
      const response = await api.post(`/tasks/${taskId}/request-completion`);
      toast.success('OTP has been sent to client\'s email');
      setShowOTPInput(true);
      
      // For development: show email preview URL
      if (response.data.previewURL) {
        setEmailPreviewUrl(response.data.previewURL);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to request OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !otp) return;

    try {
      setIsVerifying(true);
      await api.post(`/tasks/${selectedTaskId}/verify-completion`, { otp });
      toast.success('Task completed successfully');
      setShowOTPInput(false);
      setOtp('');
      setSelectedTaskId(null);
      queryClient.invalidateQueries(['provider-tasks']);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelOTP = () => {
    setShowOTPInput(false);
    setOtp('');
    setSelectedTaskId(null);
    setIsVerifying(false);
    setEmailPreviewUrl(null);
  };

  const handleRejectTask = async (taskId: string) => {
    try {
      const response = await api.patch(`/tasks/${taskId}/reject`);
      
      if (response.data.success) {
        queryClient.invalidateQueries(['provider-tasks']);
        toast.success(response.data.message);
      } else {
        // If the backend sends a non-error response but without success flag
        console.warn('Unexpected response format:', response.data);
        toast.success('Task rejected');
      }
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Error rejecting task:', error);
      
      // Get the most specific error message available
      const errorMessage = 
        error.response?.data?.details || // Specific error details
        error.response?.data?.error ||   // General error message
        error.message ||                 // Axios error message
        'Failed to reject task';         // Fallback message
      
      toast.error(errorMessage);
      
      // Log additional details if available
      if (error.response?.data?.stack) {
        console.debug('Error stack:', error.response.data.stack);
      }
    }
  };

  const handleResendOTP = async () => {
    if (!selectedTaskId || resendDisabled) return;

    try {
      setResendDisabled(true);
      setResendTimer(30); // 30 seconds cooldown

      const response = await api.post(`/tasks/${selectedTaskId}/request-completion`);
      toast.success('New OTP has been sent to client\'s email');

      // For development: show email preview URL
      if (response.data.previewURL) {
        setEmailPreviewUrl(response.data.previewURL);
      }

      // Start countdown timer
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend OTP');
      setResendDisabled(false);
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
          {[/* eslint-disable @typescript-eslint/no-use-before-define */
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
                  ? 'border-purple-500 text-purple-600'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task: Task) => (
          <div 
            key={task._id} 
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              task.status === 'OPEN' ? 'border-emerald-500' :
              task.status === 'ASSIGNED' ? 'border-yellow-500' :
              task.status === 'COMPLETED' ? 'border-green-500' :
              task.status === 'QUICK_SERVICE_PENDING' ? 'border-purple-500' :
              'border-gray-500'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                task.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' :
                task.status === 'ASSIGNED' ? 'bg-yellow-100 text-yellow-800' :
                task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                task.status === 'QUICK_SERVICE_PENDING' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.status}
              </span>
            </div>
            
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

              <div className="flex items-center text-gray-500 mt-2">
                <span className="font-medium">Category:</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-sm">
                  {task.category}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex justify-between items-center">
              {task.status === 'QUICK_SERVICE_PENDING' && (
                <div className="flex w-full">
                  <button
                    onClick={() => handleAcceptTask(task._id)}
                    className="w-full bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Quick Service
                  </button>
                </div>
              )}
              {task.status === 'OPEN' && (
                <div className="flex space-x-2 w-full">
                  <button
                    onClick={() => handleAcceptTask(task._id)}
                    className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 transition-colors"
                  >
                    Accept Task
                  </button>
                  <button
                    onClick={() => handleRejectTask(task._id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
              {task.status === 'ASSIGNED' && (
                <div className="flex space-x-2 w-full">
                  <button
                    onClick={() => handleCompleteTask(task._id)}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Task
                  </button>
                  <button
                    onClick={() => setSelectedTaskForMap(task)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Direction
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* OTP Verification Modal */}
      {showOTPInput && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full m-4">
            <h2 className="text-xl font-semibold mb-4">Complete Task</h2>
            <p className="text-sm text-gray-600 mb-4">
              An OTP has been sent to the client's email.
              <br />
              Please ask the client for the OTP to complete the task.
            </p>

            {/* Development Only: Email Preview Link */}
            {emailPreviewUrl && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Development Mode:</strong> Click below to view the email with OTP
                </p>
                <a
                  href={emailPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  View Email with OTP →
                </a>
              </div>
            )}
            
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <div className="mt-1 relative">
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    disabled={isVerifying}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-100"
                    placeholder="Enter 6-digit OTP"
                  />
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendDisabled}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
                {resendDisabled && resendTimer > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    You can request a new OTP in {resendTimer} seconds
                  </p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Complete'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleCancelOTP}
                  disabled={isVerifying}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedTaskForMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] relative">
            <button
              onClick={() => setSelectedTaskForMap(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="h-full p-4">
              <TaskNavigationMap
                taskLocation={{
                  lat: selectedTaskForMap.location.coordinates[1],
                  lng: selectedTaskForMap.location.coordinates[0]
                }}
                containerId="task-navigation-map"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
