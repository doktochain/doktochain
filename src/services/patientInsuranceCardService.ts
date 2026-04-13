import { supabase } from '../lib/supabase';

export interface PatientInsuranceCard {
  id: string;
  patient_id: string;
  insurance_provider_id: string;
  policy_number: string;
  group_number?: string;
  member_id?: string;
  policy_holder_name: string;
  policy_holder_relationship: 'self' | 'spouse' | 'parent' | 'child' | 'other';
  card_front_url?: string;
  card_back_url?: string;
  is_primary: boolean;
  is_active: boolean;
  verified: boolean;
  verified_at?: string;
  effective_date?: string;
  expiration_date?: string;
  coverage_type?: string;
  policy_type?: 'public' | 'private';
  province?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  insurance_provider?: {
    name: string;
    slug: string;
    logo_url: string;
    provider_type: string;
  };
}

class PatientInsuranceCardService {
  async getPatientInsuranceCards(patientId: string): Promise<PatientInsuranceCard[]> {
    const { data, error } = await supabase
      .from('patient_insurance_cards')
      .select(`
        *,
        insurance_provider:insurance_providers_master(
          name,
          slug,
          logo_url,
          provider_type
        )
      `)
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching insurance cards:', error);
      throw error;
    }

    return data || [];
  }

  async getInsuranceCard(cardId: string): Promise<PatientInsuranceCard | null> {
    const { data, error } = await supabase
      .from('patient_insurance_cards')
      .select(`
        *,
        insurance_provider:insurance_providers_master(
          name,
          slug,
          logo_url,
          provider_type
        )
      `)
      .eq('id', cardId)
      .single();

    if (error) {
      console.error('Error fetching insurance card:', error);
      throw error;
    }

    return data;
  }

  async createInsuranceCard(
    cardData: Partial<PatientInsuranceCard>
  ): Promise<PatientInsuranceCard> {
    const { data, error } = await supabase
      .from('patient_insurance_cards')
      .insert(cardData)
      .select()
      .single();

    if (error) {
      console.error('Error creating insurance card:', error);
      throw error;
    }

    return data;
  }

  async updateInsuranceCard(
    cardId: string,
    updates: Partial<PatientInsuranceCard>
  ): Promise<PatientInsuranceCard> {
    const { data, error } = await supabase
      .from('patient_insurance_cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      console.error('Error updating insurance card:', error);
      throw error;
    }

    return data;
  }

  async deleteInsuranceCard(cardId: string): Promise<void> {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('patient_insurance_cards')
      .update({ is_active: false })
      .eq('id', cardId);

    if (error) {
      console.error('Error deleting insurance card:', error);
      throw error;
    }
  }

  async setPrimaryCard(cardId: string, patientId: string): Promise<void> {
    const { error } = await supabase
      .from('patient_insurance_cards')
      .update({ is_primary: true })
      .eq('id', cardId)
      .eq('patient_id', patientId);

    if (error) {
      console.error('Error setting primary card:', error);
      throw error;
    }
  }

  async uploadCardImage(
    file: File,
    userId: string,
    side: 'front' | 'back'
  ): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${side}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('insurance-cards')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading card image:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('insurance-cards')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async deleteCardImage(url: string): Promise<void> {
    // Extract file path from URL
    const urlParts = url.split('/insurance-cards/');
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('insurance-cards')
      .remove([filePath]);

    if (error) {
      console.error('Error deleting card image:', error);
      throw error;
    }
  }

  async getAcceptedInsuranceForProvider(providerId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('provider_insurance_plans')
      .select('insurance_provider_id')
      .eq('provider_id', providerId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching provider insurance:', error);
      return [];
    }

    return data.map((item) => item.insurance_provider_id);
  }

  async getMatchingInsuranceCards(
    patientId: string,
    acceptedInsuranceIds: string[]
  ): Promise<PatientInsuranceCard[]> {
    const { data, error } = await supabase
      .from('patient_insurance_cards')
      .select(`
        *,
        insurance_provider:insurance_providers_master(
          name,
          slug,
          logo_url,
          provider_type
        )
      `)
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .in('insurance_provider_id', acceptedInsuranceIds)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error fetching matching insurance cards:', error);
      return [];
    }

    return data || [];
  }

  async validateCardExpiration(cardId: string): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    const card = await this.getInsuranceCard(cardId);

    if (!card) {
      return { isValid: false, message: 'Insurance card not found' };
    }

    if (!card.is_active) {
      return { isValid: false, message: 'Insurance card is inactive' };
    }

    if (card.expiration_date) {
      const expirationDate = new Date(card.expiration_date);
      const today = new Date();

      if (expirationDate < today) {
        return {
          isValid: false,
          message: 'Insurance card has expired',
        };
      }
    }

    return { isValid: true };
  }
}

export const patientInsuranceCardService = new PatientInsuranceCardService();
