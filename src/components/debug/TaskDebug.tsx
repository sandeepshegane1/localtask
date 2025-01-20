import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';

export function TaskDebug() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-all-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks/test-all');
      return response.data;
    },
    onError: (err: any) => {
      console.error('Error fetching all tasks:', err);
      toast.error('Failed to fetch tasks: ' + (err.response?.data?.error || err.message));
    }
  });

  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

  if (error) {
    return <div>Error: {(error as any).message}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Task Debug Info</h2>
      <div className="mb-4">
        <strong>Total Tasks: </strong>
        {data?.count || 0}
      </div>
      <div className="space-y-4">
        {data?.tasks?.map((task: any) => (
          <div key={task._id} className="border p-4 rounded">
            <h3 className="font-semibold">{task.title}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Status:</strong> {task.status}</div>
              <div><strong>Category:</strong> {task.category}</div>
              <div><strong>Budget:</strong> ₹{task.budget}</div>
              <div>
                <strong>Location:</strong>{' '}
                {task.location?.coordinates?.[0]}, {task.location?.coordinates?.[1]}
              </div>
              <div>
                <strong>Client:</strong>{' '}
                {task.client?.name || task.client}
              </div>
              <div>
                <strong>Provider:</strong>{' '}
                {task.provider?.name || task.provider || 'None'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
