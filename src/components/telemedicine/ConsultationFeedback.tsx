import React, { useState } from 'react';
import { toast } from 'sonner';
import { Star, ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';

interface ConsultationFeedbackProps {
  consultationId: string;
  providerName: string;
  onSubmit: (feedback: FeedbackData) => void;
  onClose: () => void;
}

interface FeedbackData {
  rating: number;
  videoQuality: number;
  audioQuality: number;
  providerProfessionalism: number;
  waitTimeSatisfaction: number;
  feedbackText: string;
  wouldRecommend: boolean | null;
}

export const ConsultationFeedback: React.FC<ConsultationFeedbackProps> = ({
  consultationId,
  providerName,
  onSubmit,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    videoQuality: 0,
    audioQuality: 0,
    providerProfessionalism: 0,
    waitTimeSatisfaction: 0,
    feedbackText: '',
    wouldRecommend: null,
  });

  const handleSubmit = () => {
    if (feedback.rating === 0) {
      toast.error('Please provide an overall rating');
      return;
    }
    onSubmit(feedback);
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold mb-2">Rate Your Experience</h2>
          <p className="text-blue-100">Consultation with {providerName}</p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <StarRating
              label="Overall Rating"
              value={feedback.rating}
              onChange={v => setFeedback({ ...feedback, rating: v })}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <StarRating
              label="Video Quality"
              value={feedback.videoQuality}
              onChange={v => setFeedback({ ...feedback, videoQuality: v })}
            />
            <StarRating
              label="Audio Quality"
              value={feedback.audioQuality}
              onChange={v => setFeedback({ ...feedback, audioQuality: v })}
            />
            <StarRating
              label="Provider Professionalism"
              value={feedback.providerProfessionalism}
              onChange={v => setFeedback({ ...feedback, providerProfessionalism: v })}
            />
            <StarRating
              label="Wait Time Satisfaction"
              value={feedback.waitTimeSatisfaction}
              onChange={v => setFeedback({ ...feedback, waitTimeSatisfaction: v })}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Would you recommend this provider to others?
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setFeedback({ ...feedback, wouldRecommend: true })}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg border-2 transition ${
                  feedback.wouldRecommend === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
                <span className="font-medium">Yes</span>
              </button>
              <button
                onClick={() => setFeedback({ ...feedback, wouldRecommend: false })}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg border-2 transition ${
                  feedback.wouldRecommend === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-red-500'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
                <span className="font-medium">No</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Feedback (Optional)
            </label>
            <textarea
              value={feedback.feedbackText}
              onChange={e => setFeedback({ ...feedback, feedbackText: e.target.value })}
              placeholder="Share your experience or any suggestions..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Send className="w-5 h-5" />
              <span>Submit Feedback</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};