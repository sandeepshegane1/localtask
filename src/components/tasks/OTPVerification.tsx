import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface OTPVerificationProps {
  taskId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function OTPVerification({ taskId, onSuccess, onCancel }: OTPVerificationProps) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOTP = async () => {
    try {
      setIsLoading(true);
      await axios.post(`/api/tasks/${taskId}/request-completion`);
      toast.success('OTP sent to client\'s email');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await axios.post(`/api/tasks/${taskId}/verify-completion`, { otp });
      toast.success('Task completed successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Complete Task</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleRequestOTP}
            disabled={isLoading}
            className="w-full bg-emerald-500 text-white py-2 px-4 rounded hover:bg-emerald-600 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Request OTP'}
          </button>

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Enter OTP sent to client's email
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
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
