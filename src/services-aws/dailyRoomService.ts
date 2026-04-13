import { api } from '../lib/api-client';

export interface DailyRoomResponse {
  success: boolean;
  roomUrl?: string;
  roomName?: string;
  expiresAt?: number;
  error?: string;
}

export const dailyRoomService = {
  async createRoom(appointmentId: string, patientId: string, providerId: string): Promise<DailyRoomResponse> {
    try {
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-daily-room`;

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentId,
          patientId,
          providerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create video room');
      }

      const result: DailyRoomResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating Daily.co room:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create video room',
      };
    }
  },

  async updateAppointmentWithRoom(appointmentId: string, roomUrl: string, roomName: string) {
    try {
      const { error } = await api.put(`/appointments/${appointmentId}`, {
        video_room_url: roomUrl,
        video_room_id: roomName,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating appointment with room:', error);
      return { success: false, error };
    }
  },
};
