import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, MapPin, Calendar, Info, Crosshair, Zap } from 'lucide-react';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { calculateDistance } from '../../utils/distance';
import { ProviderReviews } from './ProviderReviews';
import { ProviderStats } from './ProviderStats';

// Interfaces (updated)
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'CLIENT' | 'PROVIDER';
}

interface ProviderStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
}

interface ServiceProvider extends User {
  category?: string;
  skills?: string[];
  rating?: number;
  completedTasks?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  stats?: ProviderStats;
  reviewsCount?: number;
  profilePhoto?: string;
}

interface Task {
  _id?: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  client: string;
  provider: string;
  location: {
    type: string;
    coordinates: number[];
  };
  deadline?: Date;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface TaskFormData {
  title: string;
  description: string;
  budget: number;
  deadline: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  location: {
    type: string;
    coordinates: number[];
  };
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  client: {
    _id: string;
    name: string;
  };
  serviceCategory: string;
}

// Utility Components (unchanged)
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-[400px]">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 border-solid"></div>
  </div>
);

const ProviderAvatar = ({ name, profilePhoto }: { name: string; profilePhoto?: string }) => (
  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center shadow-md overflow-hidden">
    {profilePhoto ? (
      <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
    ) : (
      <span className="text-purple-600 font-bold text-lg uppercase">
        {name.charAt(0)}
      </span>
    )}
  </div>
);

// Reusable Form Input Component (unchanged)
const FormInput = ({
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  error,
  step
}: {
  label: string;
  type: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  step?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      step={step}
      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
    />
    {error && (
      <p className="text-red-500 text-xs mt-1">{error}</p>
    )}
  </div>
);

// Provider Card Component (new)
function ProviderCard({ provider, onSelect }: { provider: ServiceProvider; onSelect: () => void }) {
  const { category } = useParams<{ category: string }>();
  const { data: stats } = useQuery({
    queryKey: ['provider-stats', provider._id, category],
    queryFn: async () => {
      const response = await api.get(`/reviews/provider/${provider._id}/stats?category=${category}`);
      return response.data;
    },
  });

  const { data: tasksData } = useQuery({
    queryKey: ['provider-tasks', provider._id],
    queryFn: async () => {
      const response = await api.get(`/tasks/provider/${provider._id}/completed`);
      return response.data;
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <ProviderAvatar name={provider.name} profilePhoto={provider.profilePhoto} />
          <div className="ml-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
              <ProviderStats providerId={provider._id} category={category} />
            </div>
          </div>
        </div>
        <div className="ml-auto text-right">
          <span className="text-2xl font-bold text-gray-900">
            ₹{provider.hourlyRate}/hr
          </span>
          <p className="text-sm text-emerald-600">2 HOUR MINIMUM</p>
        </div>
      </div>

      {provider.skills && provider.skills.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {provider.skills.map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto">
        <button
          onClick={onSelect}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
        >
          Select Provider
        </button>
      </div>

      {/* Reviews Section */}
      <div className="border-t pt-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Reviews</h4>
          <button
            onClick={() => setShowReviews(prev => ({
              ...prev,
              [provider._id]: !prev[provider._id]
            }))}
            className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
          >
            {showReviews[provider._id] ? 'Hide Reviews' : 'Show Reviews'}
          </button>
        </div>
        {showReviews[provider._id] && (
          <div className="mt-4">
            <ProviderReviews 
              providerId={provider._id} 
              serviceCategory={category || ''}
              hideStats={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Service Form Component
const QuickServiceForm = ({ category, onClose }: { 
  category: string;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    budget: 0,
    deadline: '',
    priority: 'HIGH',
    location: {
      latitude: null,
      longitude: null,
    }
  });
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const quickServiceMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await api.post('/tasks/quick-service', {
        ...data,
        category: category?.toUpperCase(),
        type: 'QUICK_SERVICE_REQUEST'
      });
      return response.data;
    },
    onSuccess: () => {
      onClose();
      alert('Quick service request sent successfully! Providers will be notified.');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to send quick service request');
    }
  });

  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
        }));
        setIsGettingLocation(false);
      },
      (error) => {
        setLocationError('Failed to get location. Please try again.');
        setIsGettingLocation(false);
      }
    );
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location.latitude || !formData.location.longitude) {
      setLocationError('Location is required. Please enable location access.');
      return;
    }
    quickServiceMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Quick Service Request - {category}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter task title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={4}
              placeholder="Describe your urgent task"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-md"
              min="0"
              step="100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <button
              type="button"
              onClick={getCurrentLocation}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              disabled={isGettingLocation}
            >
              <MapPin className="w-4 h-4" />
              {isGettingLocation ? 'Getting Location...' : 'Get Location'}
            </button>
            {locationError && (
              <p className="text-red-500 text-xs mt-1">{locationError}</p>
            )}
            {formData.location.latitude && formData.location.longitude && (
              <p className="text-sm text-purple-600 mt-1">
                Location set successfully!
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2"
              disabled={quickServiceMutation.isPending || isGettingLocation}
            >
              <Zap className="w-4 h-4" />
              {quickServiceMutation.isPending ? 'Sending...' : 'Send Quick Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

export function ServiceProviders() {
  const { category } = useParams<{ category: string }>();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showReviews, setShowReviews] = useState<{ [key: string]: boolean }>({});
  const [providerStats, setProviderStats] = useState<{ [key: string]: { rating: number, count: number } }>({});
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Authentication and data fetching logic
  const { user: clientUser, isAuthenticated } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }));

  // Fetch providers first
  const { data: providers, isLoading: isProvidersLoading, error } = useQuery<ServiceProvider[]>({
    queryKey: ['providers', category],
    queryFn: async () => {
      const response = await api.get(`/users/providers?category=${category?.toUpperCase()}`);
      return response.data;
    },
    enabled: isAuthenticated && !!clientUser?._id
  });

  // Fetch provider reviews
  const { data: providerReviews, isLoading: isReviewsLoading } = useQuery<{ [key: string]: Review[] }>({
    queryKey: ['provider-reviews', providers?.map(p => p._id), category],
    queryFn: async () => {
      const reviewsData: { [key: string]: Review[] } = {};
      
      if (providers) {
        await Promise.all(
          providers.map(async (provider) => {
            try {
              const response = await api.get(`/reviews/provider/${provider._id}`, {
                params: { 
                  category: category?.toUpperCase()
                }
              });
              reviewsData[provider._id] = response.data;
            } catch (error) {
              console.error('Error fetching reviews for provider:', error);
              reviewsData[provider._id] = [];
            }
          })
        );
      }
      return reviewsData;
    },
    enabled: !!providers?.length
  });

  // Fetch provider stats
  const { data: providerStatsData } = useQuery({
    queryKey: ['provider-stats', providers?.map(p => p._id), category],
    queryFn: async () => {
      const statsData: { [key: string]: { averageRating: number, totalReviews: number } } = {};
      
      if (providers) {
        await Promise.all(
          providers.map(async (provider) => {
            try {
              const response = await api.get(`/reviews/provider/${provider._id}/stats`);
              statsData[provider._id] = response.data || { averageRating: 0, totalReviews: 0 };
            } catch (error) {
              console.error('Error fetching provider stats:', error);
              statsData[provider._id] = { averageRating: 0, totalReviews: 0 };
            }
          })
        );
      }
      return statsData;
    },
    enabled: !!providers?.length,
    refetchInterval: 3000 // Refetch more frequently
  });

  // Calculate average rating and count for a provider
  const calculateProviderStats = (providerId: string) => {
    const reviews = providerReviews?.[providerId] || [];
    if (reviews.length === 0) {
      return { rating: 0, count: 0 };
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return {
      rating: totalRating / reviews.length,
      count: reviews.length
    };
  };

  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    budget: 0,
    deadline: '',
    priority: 'LOW',
    location: {
      type: 'Point',
      coordinates: [0, 0]
    }
  });
  const [formErrors, setFormErrors] = useState<Partial<TaskFormData>>({});

  const createTaskMutation = useMutation<Task, Error, Task>({
    mutationFn: async (taskData) => {
      const response = await api.post('/tasks', taskData);
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Task created successfully with ID: ${data._id}`);
      resetForm();
      setSelectedProvider(null);
    },
    onError: (error) => {
      console.error(error);
      alert('Failed to create task');
    },
  });

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTaskFormData(prev => ({
            ...prev,
            location: {
              type: 'Point',
              coordinates: [position.coords.longitude || 0, position.coords.latitude || 0]
            }
          }));
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Failed to get your location. Please try again.");
          setIsGettingLocation(false);
          // Set default coordinates on error
          setTaskFormData(prev => ({
            ...prev,
            location: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }));
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setIsGettingLocation(false);
      // Set default coordinates if geolocation is not supported
      setTaskFormData(prev => ({
        ...prev,
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<TaskFormData> = {};

    if (!taskFormData.title.trim()) errors.title = 'Title is required';
    if (!taskFormData.description.trim()) errors.description = 'Description is required';
    if (taskFormData.budget <= 0) errors.budget = 'Budget must be greater than zero';
    if (!taskFormData.deadline) errors.deadline = 'Deadline is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProvider) return;

    if (validateForm()) {
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        budget: taskFormData.budget,
        category: category || '',
        targetProvider: selectedProvider,
        location: {
          latitude: taskFormData.location.coordinates[1],
          longitude: taskFormData.location.coordinates[0]
        },
        deadline: new Date(taskFormData.deadline),
        priority: taskFormData.priority
      };

      createTaskMutation.mutate(taskData as any);
    }
  };

  const resetForm = () => {
    setTaskFormData({
      title: '',
      description: '',
      budget: 0,
      deadline: '',
      priority: 'LOW',
      location: {
        type: 'Point',
        coordinates: [0, 0]
      }
    });
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setTaskFormData(prev => {
      if (name === 'budget') {
        return { ...prev, [name]: parseFloat(value) || 0 };
      }
      return { ...prev, [name]: value };
    });
  };

  const toggleReviews = (providerId: string) => {
    setShowReviews(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const [showQuickServiceModal, setShowQuickServiceModal] = useState(false);

  // Sort providers by their average stats
  const sortedProviders = [...(providers || [])].sort((a, b) => {
    const aStats = providerStatsData?.[a._id] || { averageRating: 0, totalReviews: 0 };
    const bStats = providerStatsData?.[b._id] || { averageRating: 0, totalReviews: 0 };
    return bStats.averageRating - aStats.averageRating;
  });

  if (isProvidersLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading providers</div>;
  if (!providers?.length) return <div>No providers found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Quick Service Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-amber-800 mb-2">
              Need Urgent Help?
            </h2>
            <p className="text-amber-700">
              Get quick assistance for urgent tasks. Service providers will be notified immediately.
            </p>
          </div>
          <button
            onClick={() => setShowQuickServiceModal(true)}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
          >
            <Zap className="w-5 h-5" />
            <span>Quick Service</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sortedProviders.map((provider) => (
          <div key={provider._id} className="bg-white rounded-lg shadow-lg p-6">
            {/* Provider Info Section */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <ProviderAvatar name={provider.name} profilePhoto={provider.profilePhoto} />
                <div className="ml-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{provider.name}</h3>
                    <div className="flex items-center space-x-2">
                      <StarRating rating={Math.round(providerStatsData?.[provider._id]?.averageRating || 0)} />
                      <span className="text-sm text-gray-600">
                        {(providerStatsData?.[provider._id]?.averageRating || 0).toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({providerStatsData?.[provider._id]?.totalReviews || 0} {providerStatsData?.[provider._id]?.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleReviews(provider._id)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    {showReviews[provider._id] ? 'Hide Reviews' : 'Show Reviews'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setSelectedProvider(selectedProvider === provider._id ? null : provider._id)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedProvider === provider._id
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {selectedProvider === provider._id ? 'Cancel' : 'Create Task'}
              </button>
            </div>

            {/* Reviews Section */}
            {showReviews[provider._id] && (
              <div className="space-y-4 mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">Reviews</h4>
                  <span className="text-sm text-gray-500">
                    {providerStatsData?.[provider._id]?.totalReviews || 0} {providerStatsData?.[provider._id]?.totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
                {isReviewsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading reviews...</p>
                  </div>
                ) : providerReviews?.[provider._id]?.length > 0 ? (
                  providerReviews[provider._id].map((review) => (
                    <div key={review._id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} />
                          <span className="text-sm font-medium">{review.client.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{review.comment}</p>
                      {review.serviceCategory && (
                        <span className="mt-2 inline-block px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                          {review.serviceCategory}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No reviews yet
                  </div>
                )}
              </div>
            )}

            {/* Task Form - Only show for selected provider */}
            {selectedProvider === provider._id && (
              <div className="border-t pt-6">
                <form onSubmit={handleSubmitTask} className="space-y-4">
                  <FormInput
                    label="Title"
                    type="text"
                    name="title"
                    value={taskFormData.title}
                    onChange={handleInputChange}
                    error={formErrors.title}
                    placeholder="Enter task title"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={taskFormData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-md ${
                        formErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Describe your task"
                    />
                    {formErrors.description && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="Budget (₹)"
                      type="number"
                      name="budget"
                      value={taskFormData.budget}
                      onChange={handleInputChange}
                      error={formErrors.budget}
                      step="0.01"
                    />

                    <FormInput
                      label="Deadline"
                      type="datetime-local"
                      name="deadline"
                      value={taskFormData.deadline}
                      onChange={handleInputChange}
                      error={formErrors.deadline}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Crosshair className="w-4 h-4" />
                      {isGettingLocation ? 'Getting Location...' : 'Get Current Location'}
                    </button>
                    {locationError && (
                      <p className="text-red-500 text-sm mt-1">{locationError}</p>
                    )}
                    {taskFormData.location.coordinates[1] !== 0 && taskFormData.location.coordinates[0] !== 0 && (
                      <p className="text-sm text-purple-600 mt-1">
                        Location set: {taskFormData.location.coordinates[1].toFixed(4)}, 
                        {taskFormData.location.coordinates[0].toFixed(4)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={taskFormData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    className="w-full bg-purple-500 text-white py-3 rounded-md hover:bg-purple-600 transition-colors 
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTaskMutation.isPending ? 'Creating Task...' : 'Create Task'}
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Service Modal */}
      {showQuickServiceModal && (
        <QuickServiceForm
          category={category}
          onClose={() => setShowQuickServiceModal(false)}
        />
      )}
    </div>
  );
}
