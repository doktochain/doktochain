import { supabase } from '../lib/supabase';

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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-daily-room`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
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
      const { error } = await supabase
        .from('appointments')
        .update({
          video_room_url: roomUrl,
          video_room_id: roomName,
        })
        .eq('id', appointmentId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating appointment with room:', error);
      return { success: false, error };
    }
  },
};
