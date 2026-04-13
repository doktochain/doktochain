import { useState, useEffect } from 'react';
import { Star, ThumbsUp, UserCircle } from 'lucide-react';
import { providerReviewService, ProviderReview, ReviewStats } from '../../services/providerReviewService';

interface ProviderReviewsProps {
  providerId: string;
  reviewStats: ReviewStats | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-8">{rating}</span>
      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className="bg-yellow-400 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
    </div>
  );
}

export default function ProviderReviews({ providerId, reviewStats }: ProviderReviewsProps) {
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  useEffect(() => {
    loadReviews();
  }, [providerId, sortBy]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await providerReviewService.getProviderReviews(providerId, sortBy, 20);
      setReviews(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!reviewStats) return null;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {reviewStats.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center mb-2">
              <StarRating rating={Math.round(reviewStats.averageRating)} />
            </div>
            <p className="text-gray-600">{reviewStats.totalReviews} reviews</p>
          </div>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <RatingBar
                key={rating}
                rating={rating}
                count={reviewStats.ratingDistribution[rating as keyof typeof reviewStats.ratingDistribution]}
                total={reviewStats.totalReviews}
              />
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ThumbsUp className="w-8 h-8 text-sky-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-1">Patient Feedback</h3>
            <p className="text-gray-600 text-sm">
              Based on {reviewStats.totalReviews} verified patient reviews
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Patient Reviews</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'highest' | 'lowest')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="recent">Most Recent</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      {review.isAnonymous ? 'Anonymous' : 'Verified Patient'}
                    </span>
                    <span className="block text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>

              {review.reviewText && (
                <p className="text-gray-700 leading-relaxed">{review.reviewText}</p>
              )}

              {review.providerResponse && (
                <div className="mt-4 ml-6 bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">Dr</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">Provider Response</span>
                        {review.providerResponseDate && (
                          <span className="text-xs text-gray-500">
                            {new Date(review.providerResponseDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm">{review.providerResponse}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
