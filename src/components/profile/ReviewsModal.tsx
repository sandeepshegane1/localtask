import React from 'react';
import { Star, X } from 'lucide-react';

interface Review {
  _id: string;
  task: {
    _id: string;
    title: string;
  };
  provider: {
    _id: string;
    name: string;
  };
  client: {
    _id: string;
    name: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewsModalProps {
  reviews: Review[];
  isOpen: boolean;
  onClose: () => void;
  userRole: 'CLIENT' | 'PROVIDER';
}

export function ReviewsModal({ reviews, isOpen, onClose, userRole }: ReviewsModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>

        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="text-emerald-700 font-medium">
                      {userRole === 'PROVIDER' ? review.client.name.charAt(0) : review.provider.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {userRole === 'PROVIDER' ? review.client.name : review.provider.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Task: {review.task.title}
                    </p>
                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-gray-700">{review.comment}</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>
            </div>
          ))}

          {reviews.length === 0 && (
            <p className="text-center text-gray-500 py-8">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
