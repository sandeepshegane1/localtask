import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import api from '../../lib/axios';

interface Props {
  workerId: string;
  category?: string;
  hideStats?: boolean;
}

export function WorkerReviews({ workerId, category, hideStats }: Props) {
  // Fetch reviews
  const { data: reviews, isLoading: isReviewsLoading } = useQuery({
    queryKey: ['worker-reviews', workerId, category],
    queryFn: async () => {
      const response = await api.get(`/reviews/worker/${workerId}`, {
        params: { 
          category: category?.toUpperCase()
        }
      });
      return response.data;
    },
  });

  // Fetch worker stats if not hidden
  const { data: stats } = useQuery({
    queryKey: ['worker-stats', workerId, category],
    queryFn: async () => {
      const response = await api.get(`/reviews/worker/${workerId}/stats${category ? `?category=${category?.toUpperCase()}` : ''}`);
      return response.data;
    },
    initialData: { averageRating: 0, totalReviews: 0 },
    enabled: !hideStats
  });

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {!hideStats && (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
          <h3 className="text-lg font-semibold mb-2">Overall Rating</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {renderStars(stats.averageRating)}
            </div>
            <span className="text-gray-600">
              ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>
      )}

      {isReviewsLoading ? (
        <div className="text-gray-600">Loading reviews...</div>
      ) : reviews?.length > 0 ? (
        reviews.map((review: any) => (
          <div key={review._id} className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {review.client?.name || 'Anonymous'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center">
                {renderStars(review.rating)}
              </div>
            </div>
            <p className="text-gray-600">{review.comment}</p>
            {!category && (
              <div className="mt-2">
                <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
                  {review.category}
                </span>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-gray-600">
          No reviews yet for {category ? category : 'this worker'}
        </div>
      )}
    </div>
  );
}
