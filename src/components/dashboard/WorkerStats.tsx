import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import api from '../../lib/axios';

interface WorkerStatsProps {
  workerId: string;
  category?: string;
}

export function WorkerStats({ workerId, category }: WorkerStatsProps) {
  // Fetch worker stats
  const { data: stats } = useQuery({
    queryKey: ['worker-stats', workerId, category],
    queryFn: async () => {
      const response = await api.get(`/reviews/worker/${workerId}/stats${category ? `?category=${category?.toUpperCase()}` : ''}`);
      return response.data;
    },
    initialData: { averageRating: 0, totalReviews: 0 }
  });

  // Fetch worker tasks count
  const { data: tasksCount } = useQuery({
    queryKey: ['worker-tasks-count', workerId, category],
    queryFn: async () => {
      const response = await api.get(`/tasks/worker/${workerId}/completed-count${category ? `?category=${category}` : ''}`);
      return response.data.count;
    },
    initialData: 0
  });

  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, index) => (
      <Star 
        key={index}
        className={`w-4 h-4 ${index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <div className="flex items-center">
        <div className="flex items-center">
          {renderStars(stats.averageRating)}
        </div>
        <span className="ml-2 font-medium">
          {stats.averageRating.toFixed(1)}
        </span>
      </div>
      <span>•</span>
      <span>
        ({stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'})
      </span>
      <span>•</span>
      <span>
        ({tasksCount} {tasksCount === 1 ? 'task' : 'tasks'})
      </span>
    </div>
  );
}
