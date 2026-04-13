import { api } from '../lib/api-client';

export interface ProviderReview {
  id: string;
  providerId: string;
  patientId: string;
  appointmentId: string | null;
  rating: number;
  reviewText: string | null;
  isAnonymous: boolean;
  isPublished: boolean;
  providerResponse: string | null;
  providerResponseDate: string | null;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export const providerReviewService = {
  async getProviderReviews(
    providerId: string,
    sortBy: 'recent' | 'highest' | 'lowest' = 'recent',
    limit: number = 20
  ): Promise<ProviderReview[]> {
    try {
      let orderBy = 'created_at:desc';
      switch (sortBy) {
        case 'highest':
          orderBy = 'rating:desc';
          break;
        case 'lowest':
          orderBy = 'rating:asc';
          break;
        default:
          orderBy = 'created_at:desc';
      }

      const { data, error } = await api.get<any[]>('/provider-reviews', {
        params: {
          provider_id: providerId,
          is_published: true,
          order_by: orderBy,
          limit,
        },
      });
      if (error) throw error;

      return (data || []).map((review: any) => ({
        id: review.id,
        providerId: review.provider_id,
        patientId: review.patient_id,
        appointmentId: review.appointment_id,
        rating: review.rating,
        reviewText: review.review_text,
        isAnonymous: review.is_anonymous ?? false,
        isPublished: review.is_published ?? true,
        providerResponse: review.provider_response,
        providerResponseDate: review.provider_response_date,
        createdAt: review.created_at,
      }));
    } catch (error) {
      console.error('Error fetching provider reviews:', error);
      throw error;
    }
  },

  async getReviewStats(providerId: string): Promise<ReviewStats> {
    try {
      const { data: reviews, error } = await api.get<any[]>('/provider-reviews', {
        params: {
          provider_id: providerId,
          is_published: true,
          select: 'rating',
        },
      });

      if (error) throw error;

      if (!reviews || reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
      }

      const totalReviews = reviews.length;
      const sumRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = sumRating / totalReviews;

      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      reviews.forEach((r) => {
        const key = r.rating as keyof typeof ratingDistribution;
        if (key >= 1 && key <= 5) ratingDistribution[key]++;
      });

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        ratingDistribution,
      };
    } catch (error) {
      console.error('Error calculating review stats:', error);
      throw error;
    }
  },

  async createReview(
    patientId: string,
    providerId: string,
    appointmentId: string,
    reviewData: {
      rating: number;
      reviewText?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await api.post('/provider-reviews', {
        patient_id: patientId,
        provider_id: providerId,
        appointment_id: appointmentId,
        rating: reviewData.rating,
        review_text: reviewData.reviewText,
        is_published: true,
        is_anonymous: false,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  },

  async respondToReview(
    reviewId: string,
    responseText: string
  ): Promise<void> {
    try {
      const { error } = await api.put(`/provider-reviews/${reviewId}`, {
        provider_response: responseText,
        provider_response_date: new Date().toISOString(),
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error responding to review:', error);
      throw error;
    }
  },
};
