import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, MapPin, Calendar, Info, Crosshair, Zap } from 'lucide-react';
import api from '../../lib/axios';
import { useAuthStore } from '../../store/authStore';
import { calculateDistance } from '../../utils/distance';

// Interfaces
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

interface Worker extends User {
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
    latitude: number | null;
    longitude: number | null;
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

// Utility Components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-[400px]">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 border-solid"></div>
  </div>
);

const WorkerAvatar = ({ name, profilePhoto }: { name: string; profilePhoto?: string }) => (
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

// Form Input Component
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
              className={`w-full px-3 py-2 border ${
                quickServiceMutation.isError ? 'border-red-500' : 'border-gray-300'
              } rounded-md`}
              placeholder="Enter budget in rupees"
              step="0.01"
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
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
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
                Location set: {formData.location.latitude.toFixed(4)}, {formData.location.longitude.toFixed(4)}
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
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
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

// Provider Reviews Component
const ProviderReviews = ({ providerId, serviceCategory, hideStats }: { providerId: string; serviceCategory: string; hideStats?: boolean }) => {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ['provider-reviews', providerId, serviceCategory],
    queryFn: async () => {
      const response = await api.get(`/reviews/provider/${providerId}`, {
        params: { category: serviceCategory.toUpperCase() }
      });
      return response.data;
    },
    refetchInterval: 5000 // Refetch every 5 seconds for real-time updates
  });

  if (isLoading) return <div>Loading reviews...</div>;
  if (!reviews || reviews.length === 0) return <div>No reviews yet.</div>;

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
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
      ))}
    </div>
  );
};

// Provider Stats Component
const ProviderStats = ({ providerId, category }: { providerId: string; category: string }) => {
  const { data: stats } = useQuery({
    queryKey: ['provider-stats', providerId, category],
    queryFn: async () => {
      const response = await api.get(`/reviews/provider/${providerId}/stats?category=${category}`);
      return response.data;
    },
  });

  if (!stats) return null;

  return (
    <div className="flex items-center space-x-2">
      <StarRating rating={Math.round(stats.averageRating)} />
      <span className="text-sm text-purple-600">
        {stats.averageRating.toFixed(1)}
      </span>
      <span className="text-sm text-gray-500">
        ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
};

export function WorkersByCategory() {
  const { category } = useParams<{ category: string }>();
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [showReviews, setShowReviews] = useState<{ [key: string]: boolean }>({});
  const [showQuickServiceModal, setShowQuickServiceModal] = useState(false);
  const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [taskFormDataMap, setTaskFormDataMap] = useState<{ [key: string]: TaskFormData }>({});
  const [formErrors, setFormErrors] = useState<{ [key: string]: Partial<TaskFormData> }>({});

  const { user: clientUser, isAuthenticated } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }));

  const { data: workers, isLoading: isWorkersLoading, error } = useQuery<Worker[]>({
    queryKey: ['workers', category],
    queryFn: async () => {
      const response = await api.get(`/users/workers?category=${category?.toUpperCase()}`);
      return response.data;
    },
    enabled: isAuthenticated && !!clientUser?._id
  });

  const createTaskMutation = useMutation<Task, Error, Task>({
    mutationFn: async (taskData) => {
      const response = await api.post('/tasks', taskData);
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Task created successfully with ID: ${data._id}`);
      setSelectedWorker(null);
    },
    onError: (error) => {
      console.error(error);
      alert('Failed to create task');
    },
  });

  const getInitialFormData = (): TaskFormData => ({
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

  const handleWorkerSelect = (workerId: string) => {
    if (selectedWorker === workerId) {
      setSelectedWorker(null);
    } else {
      setSelectedWorker(workerId);
      // Initialize form data for this worker if it doesn't exist
      if (!taskFormDataMap[workerId]) {
        setTaskFormDataMap(prev => ({
          ...prev,
          [workerId]: getInitialFormData()
        }));
      }
    }
  };

  const validateForm = (workerId: string): boolean => {
    const taskFormData = taskFormDataMap[workerId];
    if (!taskFormData) return false;

    const errors: Partial<TaskFormData> = {};
    if (!taskFormData.title.trim()) errors.title = 'Title is required';
    if (!taskFormData.description.trim()) errors.description = 'Description is required';
    if (taskFormData.budget <= 0) errors.budget = 'Budget must be greater than zero';
    if (!taskFormData.deadline) errors.deadline = 'Deadline is required';

    setFormErrors(prev => ({
      ...prev,
      [workerId]: errors
    }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTask = async (e: React.FormEvent<HTMLFormElement>, workerId: string) => {
    e.preventDefault();
    if (!workerId) return;

    if (validateForm(workerId)) {
      const taskFormData = taskFormDataMap[workerId];
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        budget: taskFormData.budget,
        category: category || '',
        targetProvider: workerId,
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

  const resetForm = (workerId: string) => {
    setTaskFormDataMap(prev => ({
      ...prev,
      [workerId]: getInitialFormData()
    }));
    setFormErrors(prev => ({
      ...prev,
      [workerId]: {}
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    workerId: string
  ) => {
    const { name, value } = e.target;
    
    setTaskFormDataMap(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [name]: name === 'budget' ? parseFloat(value) || 0 : value
      }
    }));
  };

  const getCurrentLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setClientLocation(newLocation);
          if (selectedWorker) {
            setTaskFormDataMap(prev => ({
              ...prev,
              [selectedWorker]: {
                ...prev[selectedWorker],
                location: {
                  type: 'Point',
                  coordinates: [newLocation.longitude, newLocation.latitude]
                }
              }
            }));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Failed to get your location. Please try again.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, [selectedWorker]);

  if (isWorkersLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading workers</div>;
  if (!workers?.length) return <div>No workers found</div>;

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
        {workers.map((worker) => (
          <div key={worker._id} className="bg-white rounded-lg shadow-lg p-6">
            {/* Worker Info Section */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <WorkerAvatar name={worker.name} profilePhoto={worker.profilePhoto} />
                <div className="ml-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{worker.name}</h3>
                    <ProviderStats providerId={worker._id} category={category || ''} />
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => setShowReviews(prev => ({
                        ...prev,
                        [worker._id]: !prev[worker._id]
                      }))}
                      className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      {showReviews[worker._id] ? 'Hide Reviews' : 'Show Reviews'}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleWorkerSelect(worker._id)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  selectedWorker === worker._id
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                }`}
              >
                {selectedWorker === worker._id ? 'Cancel' : 'Create Task'}
              </button>
            </div>

            {/* Worker Details */}
            <div className="space-y-3 text-gray-700 mb-4">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-3 text-purple-500" />
                {worker.location?.coordinates && clientLocation ? (
                  <span>
                    {calculateDistance(
                      clientLocation.latitude,
                      clientLocation.longitude,
                      worker.location.coordinates[1],
                      worker.location.coordinates[0]
                    ).toFixed(2)} km away
                  </span>
                ) : (
                  <span>Location not available</span>
                )}
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3 text-purple-500" />
                <span>Available Mon-Fri, 9AM-5PM</span>
              </div>
            </div>

            {/* Skills Section */}
            {/* {worker.skills && worker.skills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )} */}

            {/* Reviews Section */}
            {showReviews[worker._id] && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Reviews</h4>
                  <div className="flex items-center">
                    <ProviderStats providerId={worker._id} category={category} />
                  </div>
                </div>
                <ProviderReviews 
                  providerId={worker._id}
                  serviceCategory={category}
                  hideStats={true}
                />
              </div>
            )}

            {/* Task Form - Only show for selected worker */}
            {selectedWorker === worker._id && (
              <div className="border-t pt-6 mt-6">
                <form onSubmit={(e) => handleSubmitTask(e, worker._id)} className="space-y-4">
                  <FormInput
                    label="Title"
                    type="text"
                    name="title"
                    value={taskFormDataMap[worker._id]?.title || ''}
                    onChange={(e) => handleInputChange(e, worker._id)}
                    error={formErrors[worker._id]?.title}
                    placeholder="Enter task title"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={taskFormDataMap[worker._id]?.description || ''}
                      onChange={(e) => handleInputChange(e, worker._id)}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-md ${
                        formErrors[worker._id]?.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Describe your task"
                    />
                    {formErrors[worker._id]?.description && (
                      <p className="text-red-500 text-xs mt-1">{formErrors[worker._id].description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="Budget (₹)"
                      type="number"
                      name="budget"
                      value={taskFormDataMap[worker._id]?.budget || 0}
                      onChange={(e) => handleInputChange(e, worker._id)}
                      error={formErrors[worker._id]?.budget}
                      step="0.01"
                    />

                    <FormInput
                      label="Deadline"
                      type="datetime-local"
                      name="deadline"
                      value={taskFormDataMap[worker._id]?.deadline || ''}
                      onChange={(e) => handleInputChange(e, worker._id)}
                      error={formErrors[worker._id]?.deadline}
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
                      {taskFormDataMap[worker._id]?.location.coordinates[0] !== 0 && taskFormDataMap[worker._id]?.location.coordinates[1] !== 0
                        ? 'Update Current Location'
                        : 'Get Current Location'}
                    </button>
                    {taskFormDataMap[worker._id]?.location.coordinates[1] !== 0 && taskFormDataMap[worker._id]?.location.coordinates[0] !== 0 && (
                      <p className="text-sm text-purple-600 mt-1">
                        Location set: {taskFormDataMap[worker._id].location.coordinates[1].toFixed(4)}, 
                        {taskFormDataMap[worker._id].location.coordinates[0].toFixed(4)}
                      </p>
                    )}
                    {formErrors[worker._id]?.location && (
                      <p className="text-red-500 text-xs mt-1">{formErrors[worker._id].location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={taskFormDataMap[worker._id]?.priority || 'LOW'}
                      onChange={(e) => handleInputChange(e, worker._id)}
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
          category={category || ''}
          onClose={() => setShowQuickServiceModal(false)}
        />
      )}
    </div>
  );
}
