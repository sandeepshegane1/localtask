import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Task {
  _id: string;
  status: string;
  title: string;
}

interface TaskActionsProps {
  task: Task;
  onTaskUpdated: () => void;
}

export function TaskActions({ task, onTaskUpdated }: TaskActionsProps) {
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptTask = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/tasks/${task._id}`, {
        status: 'ASSIGNED'
      });
      toast.success('Task accepted successfully');
      onTaskUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTask = async () => {
    try {
      setIsLoading(true);
      await axios.patch(`/api/tasks/${task._id}`, {
        status: 'IN_PROGRESS'
      });
      toast.success('Task started successfully');
      onTaskUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`/api/tasks/${task._id}/request-completion`);
      setClientEmail(response.data.clientEmail);
      setShowOTPInput(true);
      toast.success('OTP has been generated. Check console for OTP (development only)');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate OTP');
      setShowOTPInput(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await axios.post(`/api/tasks/${task._id}/verify-completion`, { otp });
      toast.success('Task completed successfully');
      setShowOTPInput(false);
      setOtp('');
      onTaskUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionButton = () => {
    switch (task.status) {
      case 'OPEN':
        return (
          <button
            onClick={handleAcceptTask}
            disabled={isLoading}
            className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 disabled:opacity-50"
          >
            {isLoading ? 'Accepting...' : 'Accept Task'}
          </button>
        );
      
      case 'ASSIGNED':
        return (
          <button
            onClick={handleStartTask}
            disabled={isLoading}
            className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 disabled:opacity-50"
          >
            {isLoading ? 'Starting...' : 'Start Task'}
          </button>
        );
      
      case 'IN_PROGRESS':
        return (
          <button
            onClick={handleRequestOTP}
            disabled={isLoading}
            className="bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Complete Task'}
          </button>
        );
      
      default:
        return null;
    }
  };

  return (
    <div>
      {renderActionButton()}
      
      {showOTPInput && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Complete Task</h2>
            <p className="text-sm text-gray-600 mb-4">
              An OTP has been generated for client ({clientEmail}).
              <br />
              For testing: Check the console for the OTP.
            </p>
            
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="Enter 6-digit OTP"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading || !otp}
                  className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Complete'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowOTPInput(false)}
                  disabled={isLoading}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
