// 'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Star, MapPin, Clock, Calendar, Edit2, X, Check, Tag, MessageSquare, User, Mail, Briefcase, MapPinIcon } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../lib/axios'
import { ReviewForm } from '../dashboard/ReviewForm'
import { ReviewsModal } from './ReviewsModal'

interface UserData {
  _id: string
  name: string
  email: string
  role: 'CLIENT' | 'PROVIDER'
  skills: string[]
  location: {
    type: string
    coordinates: [number, number]
  }
  profilePhoto?: string
  createdAt: string
  updatedAt: string
}

interface Task {
  _id: string
  title: string
  description: string
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  rejectedByProvider?: boolean
  createdAt: string
  provider: {
    _id: string
    name: string
  }
  category: string
}

interface Review {
  _id: string
  task: {
    _id: string
    title: string
  }
  provider: {
    _id: string
    name: string
  }
  client: {
    _id: string
    name: string
  }
  rating: number
  comment: string
  createdAt: string
}

export function UserProfile() {
  const { user, updateUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [userTasks, setUserTasks] = useState<Task[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [submittedReviews, setSubmittedReviews] = useState<Set<string>>(new Set())
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset } = useForm<UserData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'CLIENT',
      skills: user?.skills || [],
      location: {
        type: 'Point',
        coordinates: user?.location?.coordinates || [0, 0]
      },
      profilePhoto: user?.profilePhoto,
      createdAt: user?.createdAt || '',
      updatedAt: user?.updatedAt || ''
    }
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const promises = [api.get('/reviews/my-reviews')];
        
        if (user?.role === 'CLIENT') {
          promises.push(api.get('/tasks/user-tasks'));
        }
        
        const [reviewsResponse, ...otherResponses] = await Promise.all(promises);
        
        setReviews(reviewsResponse.data);
        if (user?.role === 'CLIENT' && otherResponses[0]) {
          setUserTasks(otherResponses[0].data);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        toast.error('Failed to fetch user data')
      }
    };

    if (user?._id) {
      fetchUserData();
    }
  }, [user?._id, user?.role]);

  useEffect(() => {
    const fetchUserTasks = async () => {
      try {
        const response = await api.get('/tasks/user-tasks');
        console.log('Fetched user tasks:', response.data);
        setUserTasks(response.data);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        toast.error('Failed to fetch tasks');
      }
    };

    if (user?._id) {
      fetchUserTasks();
    }
  }, [user?._id]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await api.get('/reviews/user-reviews');
        console.log('Fetched reviews:', response.data);
        setReviews(response.data || []);
      } catch (error) {
        setReviews([]); // Set empty array on error
      }
    };

    if (user?._id) {
      fetchReviews();
    }
  }, [user?._id]);

  const getReviewStatus = (task: Task) => {
    if (!task?.provider) {
      return {
        canReview: false,
        message: 'No provider assigned',
        buttonStyle: 'text-gray-400 cursor-not-allowed'
      };
    }

    const review = reviews?.find(r => r?.task?._id === task._id);
    const isJustSubmitted = submittedReviews?.has(task._id);
    
    if (task.status !== 'COMPLETED') {
      return {
        canReview: false,
        message: 'Task not completed',
        buttonStyle: 'text-gray-400 cursor-not-allowed'
      };
    }
    if (review || isJustSubmitted) {
      return {
        canReview: false,
        message: 'Review submitted',
        buttonStyle: 'text-gray-400 cursor-not-allowed'
      };
    }
    return {
      canReview: true,
      message: 'Add Review',
      buttonStyle: 'bg-purple-500 text-white hover:bg-purple-600'
    };
  };

  const onSubmit = async (data: UserData) => {
    try {
      const skillsArray = typeof data.skills === 'string' 
        ? data.skills.split(',').map(skill => skill.trim()).filter(Boolean)
        : Array.isArray(data.skills) 
          ? data.skills 
          : [];

      let locationData = undefined;
      
      if (data.location && Array.isArray(data.location.coordinates)) {
        const coordinates = [
          typeof data.location.coordinates[0] === 'string' 
            ? parseFloat(data.location.coordinates[0]) 
            : Number(data.location.coordinates[0]),
          typeof data.location.coordinates[1] === 'string' 
            ? parseFloat(data.location.coordinates[1]) 
            : Number(data.location.coordinates[1])
        ];

        if (coordinates.some(coord => isNaN(coord))) {
          toast.error('Location coordinates must be valid numbers');
          return;
        }

        locationData = {
          type: 'Point',
          coordinates: coordinates
        };
      }

      // Handle profile photo upload
      let profilePhotoUrl = user?.profilePhoto;
      if (profilePhotoFile) {
        const formData = new FormData();
        formData.append('profilePhoto', profilePhotoFile);
        
        try {
          const response = await api.post('/users/upload-profile-photo', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          profilePhotoUrl = response.data.profilePhotoUrl;
        } catch (error) {
          console.error('Failed to upload profile photo:', error);
          toast.error('Failed to upload profile photo');
          return;
        }
      }

      const updateData = {
        name: data.name.trim(),
        skills: skillsArray,
        ...(locationData && { location: locationData }),
        ...(profilePhotoUrl && { profilePhoto: profilePhotoUrl })
      };

      console.log('Sending update data:', updateData);
      await updateUser(updateData);
      setIsEditing(false);
      setProfilePhotoFile(null);
      
      reset({
        ...data,
        name: updateData.name,
        skills: skillsArray,
        ...(locationData && { location: locationData }),
        ...(profilePhotoUrl && { profilePhoto: profilePhotoUrl })
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusStyle = (status: string, rejectedByProvider?: boolean) => {
    if (status === 'CANCELLED' && rejectedByProvider) {
      return 'bg-red-100 text-red-800'
    }
    switch (status) {
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800'
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800'
      case 'OPEN':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-purple-200 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3 bg-gradient-to-br from-purple-400 to-purple-300 p-8 text-white">
              <div className="text-center mb-8">
                <div className="relative w-32 h-32 mx-auto">
                  {user?.profilePhoto ? (
                    <img
                      src={user.profilePhoto}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-6xl font-bold text-purple-500 border-4 border-white shadow-lg">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute bottom-0 right-0">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                              toast.error('File size should be less than 5MB');
                              return;
                            }
                            setProfilePhotoFile(file);
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full shadow-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <h1 className="text-3xl font-bold">{user?.name}</h1>
                <p className="text-purple-100 mt-2">{user?.role}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 mr-3" />
                  <span>{user?.email}</span>
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="w-5 h-5 mr-3" />
                  <span>
                    Lat: {user?.location?.coordinates[0]}, 
                    Lng: {user?.location?.coordinates[1]}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-3" />
                  <span>Joined: {formatDate(user?.createdAt || '')}</span>
                </div>
              </div>
            </div>
            <div className="md:w-2/3 p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Profile Details</h2>
                  <div className="flex items-center mt-2">
                    {user?.role !== 'CLIENT' && (
                      <div className="flex items-center mt-2">
                        <Star className="w-5 h-5 text-purple-400 fill-current" />
                        <button 
                          onClick={() => setShowReviewsModal(true)}
                          className="ml-2 text-gray-600 hover:text-purple-500 transition-colors"
                        >
                          {reviews.length > 0
                            ? `${(reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)} (${reviews.length} reviews)`
                            : 'No reviews yet'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors duration-200 flex items-center"
                >
                  {isEditing ? (
                    <>
                      <X className="w-5 h-5 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-5 h-5 mr-2" />
                      Edit Profile
                    </>
                  )}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        {...register('name')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        {...register('email')}
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        {...register('role')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="CLIENT">Client</option>
                        <option value="PROVIDER">Provider</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                      <input
                        {...register('skills')}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">Enter skills separated by commas</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location (latitude, longitude)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        {...register('location.coordinates.0')}
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        {...register('location.coordinates.1')}
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        reset()
                        setIsEditing(false)
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600 transition-colors duration-200"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8">
                  <div className="bg-purple-50 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-purple-500" />
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {user?.skills && user.skills.length > 0 ? (
                        user.skills.map((skill: string) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500 italic">No skills listed</p>
                      )}
                    </div>
                  </div>

                  {user?.role === 'CLIENT' && (
                    <div className="bg-purple-50 rounded-xl p-6 shadow-sm">
                      <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-purple-500" />
                        Booked Services
                      </h3>
                      {userTasks.length > 0 ? (
                        <div className="space-y-4">
                          {userTasks.map((task) => (
                            <div key={task._id} className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-medium text-gray-800">{task.title}</h4>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center space-x-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(task.status, task.rejectedByProvider)}`}>
                                    {task.status === 'CANCELLED' && task.rejectedByProvider ? 'Rejected' : task.status}
                                  </span>
                                  {task.provider && task.provider._id && (
                                    <>
                                      {(() => {
                                        const reviewStatus = getReviewStatus(task);
                                        return (
                                          <div className="flex items-center">
                                            {reviewStatus.canReview ? (
                                              <button
                                                onClick={() => {
                                                  setSelectedTask(task);
                                                  setShowReviewForm(true);
                                                }}
                                                className={`flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${reviewStatus.buttonStyle}`}
                                              >
                                                <Star className="w-3 h-3 mr-1" />
                                                {reviewStatus.message}
                                              </button>
                                            ) : (
                                              <span className={`flex items-center text-xs ${reviewStatus.buttonStyle}`}>
                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                {reviewStatus.message}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {formatDate(task.createdAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No booked services found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showReviewForm && selectedTask && (
        <ReviewForm
          taskId={selectedTask._id}
          providerId={selectedTask.provider?._id}
          serviceCategory={selectedTask.category}
          onClose={() => {
            setShowReviewForm(false);
            setSelectedTask(null);
          }}
          onReviewSubmitted={() => {
            setReviews(prevReviews => [...prevReviews, { _id: selectedTask._id, task: { _id: selectedTask._id, title: selectedTask.title }, provider: { _id: selectedTask.provider?._id, name: selectedTask.provider?.name }, client: { _id: user?._id, name: user?.name }, rating: 0, comment: '', createdAt: new Date().toISOString() }]);
            setSubmittedReviews(prev => new Set([...prev, selectedTask._id]));
          }}
        />
      )}
      <ReviewsModal
        reviews={reviews}
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        userRole={user?.role || 'CLIENT'}
      />
    </div>
  )
}
