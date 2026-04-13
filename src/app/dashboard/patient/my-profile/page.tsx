import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { User, Mail, Phone, MapPin, Save, Camera, ArrowLeft, CreditCard, Heart, Pill, AlertTriangle, Shield, Plus, Trash2, CreditCard as Edit2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { patientService, Patient, PatientAllergy, PatientMedication, EmergencyContact } from '../../../../services/patientService';
import InsuranceCardManager from '../../../../components/patient/InsuranceCardManager';
import EditProfileModal from '../../../../components/patient/EditProfileModal';
import AddEmergencyContactModal from '../../../../components/patient/AddEmergencyContactModal';
import AddAllergyModal from '../../../../components/patient/AddAllergyModal';
import AddMedicationModal from '../../../../components/patient/AddMedicationModal';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  profile_photo_url?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  mild: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  moderate: 'bg-orange-50 text-orange-700 border-orange-200',
  severe: 'bg-red-50 text-red-700 border-red-200',
  'life-threatening': 'bg-red-100 text-red-800 border-red-300',
};

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'health', label: 'Health Profile', icon: Heart },
  { id: 'emergency', label: 'Emergency Contacts', icon: Phone },
  { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'insurance', label: 'Insurance Cards', icon: CreditCard },
] as const;

type TabId = typeof TABS[number]['id'];

export default function MyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('personal');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  const [showEditHealthModal, setShowEditHealthModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showAddAllergyModal, setShowAddAllergyModal] = useState(false);
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ title: '', description: '', onConfirm: () => {} });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address_line1: '',
    address_line2: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Canada',
  });

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        setAvatarUrl(profileData.profile_photo_url || '');
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
          phone: profileData.phone || profileData.phone_number || '',
          date_of_birth: profileData.date_of_birth || '',
          gender: profileData.gender || '',
          address_line1: profileData.address_line1 || '',
          address_line2: profileData.address_line2 || '',
          city: profileData.city || '',
          province: profileData.province || '',
          postal_code: profileData.postal_code || '',
          country: profileData.country || 'Canada',
        });
      }

      const patientData = await patientService.getPatientByUserId(user.id);
      if (patientData) {
        setPatient(patientData);
        const [allergyData, medData, contactData] = await Promise.all([
          patientService.getAllergies(patientData.id),
          patientService.getCurrentMedications(patientData.id),
          patientService.getEmergencyContacts(patientData.id),
        ]);
        setAllergies(allergyData);
        setMedications(medData);
        setEmergencyContacts(contactData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          address_line1: formData.address_line1 || null,
          address_line2: formData.address_line2 || null,
          city: formData.city || null,
          province: formData.province || null,
          postal_code: formData.postal_code || null,
          country: formData.country || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      setMessage({ type: '', text: '' });
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      setMessage({ type: 'success', text: 'Photo uploaded!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload photo' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveHealthProfile = async (updates: Partial<Patient>) => {
    if (!patient) return;
    await patientService.updatePatient(patient.id, updates);
    const updated = await patientService.getPatientByUserId(user!.id);
    if (updated) setPatient(updated);
    setMessage({ type: 'success', text: 'Health profile updated!' });
  };

  const handleAddAllergy = async (data: { allergen: string; reaction: string; severity: string }) => {
    if (!patient) return;
    await patientService.addAllergy(patient.id, data as Partial<PatientAllergy>);
    setAllergies(await patientService.getAllergies(patient.id));
    setMessage({ type: 'success', text: 'Allergy added!' });
  };

  const handleDeleteAllergy = (id: string) => {
    setConfirmDialogConfig({
      title: 'Remove Allergy',
      description: 'Remove this allergy?',
      onConfirm: async () => {
        await patientService.deleteAllergy(id);
        setAllergies(prev => prev.filter(a => a.id !== id));
        setConfirmDialogOpen(false);
      },
    });
    setConfirmDialogOpen(true);
  };

  const handleAddMedication = async (data: { medication_name: string; dosage: string; frequency: string; start_date: string; prescribing_doctor?: string }) => {
    if (!patient) return;
    await patientService.addMedication(patient.id, {
      ...data,
      prescribing_provider: data.prescribing_doctor,
    });
    setMedications(await patientService.getCurrentMedications(patient.id));
    setMessage({ type: 'success', text: 'Medication added!' });
  };

  const handleStopMedication = (id: string) => {
    setConfirmDialogConfig({
      title: 'Stop Medication',
      description: 'Mark this medication as stopped?',
      onConfirm: async () => {
        await patientService.updateMedication(id, { is_active: false, end_date: new Date().toISOString().split('T')[0] });
        if (patient) setMedications(await patientService.getCurrentMedications(patient.id));
        setConfirmDialogOpen(false);
      },
    });
    setConfirmDialogOpen(true);
  };

  const handleAddContact = async (data: { name: string; relationship: string; phone: string; email?: string; is_primary: boolean }) => {
    if (!patient) return;
    await patientService.addEmergencyContact(patient.id, data);
    setEmergencyContacts(await patientService.getEmergencyContacts(patient.id));
    setMessage({ type: 'success', text: 'Emergency contact added!' });
  };

  const handleDeleteContact = (id: string) => {
    setConfirmDialogConfig({
      title: 'Remove Emergency Contact',
      description: 'Remove this emergency contact?',
      onConfirm: async () => {
        await patientService.deleteEmergencyContact(id);
        setEmergencyContacts(prev => prev.filter(c => c.id !== id));
        setConfirmDialogOpen(false);
      },
    });
    setConfirmDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal, health, and contact information</p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })}><X className="w-4 h-4" /></button>
        </div>
      )}

      <Card className="mb-6 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-white" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 text-2xl font-bold border-4 border-white">
                  {formData.first_name?.[0]}{formData.last_name?.[0]}
                </div>
              )}
              <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-1.5 bg-card rounded-full shadow-lg hover:bg-muted cursor-pointer">
                {uploading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground" />
                )}
              </label>
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{formData.first_name} {formData.last_name}</h2>
              <p className="text-blue-100 text-sm">{formData.email}</p>
              {patient?.health_card_number && (
                <p className="text-blue-200 text-xs mt-1">Health Card: {patient.health_card_number}</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)}>
          <TabsList className="w-full justify-start rounded-none border-b bg-card h-auto p-0 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="p-6">
            <TabsContent value="personal" className="mt-0">
              <form onSubmit={handleSubmitPersonal} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-1">First Name *</Label>
                      <Input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required />
                    </div>
                    <div>
                      <Label className="block mb-1">Last Name *</Label>
                      <Input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required />
                    </div>
                    <div>
                      <Label className="block mb-1">Date of Birth</Label>
                      <Input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} />
                    </div>
                    <div>
                      <Label className="block mb-1">Gender</Label>
                      <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-1">Email *</Label>
                      <Input type="email" value={formData.email} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <Label className="block mb-1">Phone *</Label>
                      <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address
                  </h3>
                  <div className="space-y-4">
                    <Input type="text" name="address_line1" value={formData.address_line1} onChange={handleChange} placeholder="Street address" />
                    <Input type="text" name="address_line2" value={formData.address_line2} onChange={handleChange} placeholder="Apartment, suite, etc. (optional)" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                      <Select value={formData.province} onValueChange={(value) => handleSelectChange('province', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Province" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AB">Alberta</SelectItem>
                          <SelectItem value="BC">British Columbia</SelectItem>
                          <SelectItem value="MB">Manitoba</SelectItem>
                          <SelectItem value="NB">New Brunswick</SelectItem>
                          <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                          <SelectItem value="NS">Nova Scotia</SelectItem>
                          <SelectItem value="ON">Ontario</SelectItem>
                          <SelectItem value="PE">Prince Edward Island</SelectItem>
                          <SelectItem value="QC">Quebec</SelectItem>
                          <SelectItem value="SK">Saskatchewan</SelectItem>
                          <SelectItem value="NT">Northwest Territories</SelectItem>
                          <SelectItem value="NU">Nunavut</SelectItem>
                          <SelectItem value="YT">Yukon</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} placeholder="A1A 1A1" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="health" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Health Profile
                  </h3>
                  {patient && (
                    <Button variant="outline" onClick={() => setShowEditHealthModal(true)} className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                      <Edit2 className="w-4 h-4" />
                      Edit Health Profile
                    </Button>
                  )}
                </div>

                {!patient ? (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">No health profile found. Please complete your patient registration.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoCard label="Health Card" value={patient.health_card_number || 'Not set'} />
                    <InfoCard label="Card Province" value={patient.health_card_province || 'Not set'} />
                    <InfoCard label="Card Expiry" value={patient.health_card_expiry ? new Date(patient.health_card_expiry).toLocaleDateString() : 'Not set'} />
                    <InfoCard label="Blood Type" value={patient.blood_type || 'Not set'} />
                    <InfoCard label="Height" value={patient.height_cm ? `${patient.height_cm} cm` : 'Not set'} />
                    <InfoCard label="Weight" value={patient.weight_kg ? `${patient.weight_kg} kg` : 'Not set'} />
                    {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
                      <div className="md:col-span-2 lg:col-span-3 bg-muted rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-2">Chronic Conditions</p>
                        <div className="flex flex-wrap gap-2">
                          {patient.chronic_conditions.map((c, i) => (
                            <span key={i} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm border border-red-200">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {patient.medical_history && (
                      <div className="md:col-span-2 lg:col-span-3 bg-muted rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">Medical History</p>
                        <p className="text-foreground text-sm whitespace-pre-wrap">{patient.medical_history}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Emergency Contacts
                  </h3>
                  <Button onClick={() => setShowAddContactModal(true)} className="flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Add Contact
                  </Button>
                </div>

                {emergencyContacts.length === 0 ? (
                  <div className="text-center py-12 bg-muted rounded-lg">
                    <Shield className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No emergency contacts added yet</p>
                    <button onClick={() => setShowAddContactModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Add your first emergency contact
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emergencyContacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{contact.name}</p>
                              {contact.is_primary && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">Primary</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{contact.relationship} -- {contact.phone}</p>
                            {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteContact(contact.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="allergies" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Allergies
                  </h3>
                  <Button onClick={() => setShowAddAllergyModal(true)} className="flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Add Allergy
                  </Button>
                </div>

                {allergies.length === 0 ? (
                  <div className="text-center py-12 bg-muted rounded-lg">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No allergies recorded</p>
                    <button onClick={() => setShowAddAllergyModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Add an allergy
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allergies.map(allergy => (
                      <div key={allergy.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">{allergy.allergen}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full border font-medium capitalize ${SEVERITY_STYLES[allergy.severity] || 'bg-muted text-muted-foreground'}`}>
                              {allergy.severity}
                            </span>
                          </div>
                          {allergy.reaction && <p className="text-sm text-muted-foreground">Reaction: {allergy.reaction}</p>}
                          {allergy.notes && <p className="text-xs text-muted-foreground mt-1">{allergy.notes}</p>}
                        </div>
                        <button onClick={() => handleDeleteAllergy(allergy.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="medications" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Current Medications
                  </h3>
                  <Button onClick={() => setShowAddMedicationModal(true)} className="flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Add Medication
                  </Button>
                </div>

                {medications.length === 0 ? (
                  <div className="text-center py-12 bg-muted rounded-lg">
                    <Pill className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No active medications</p>
                    <button onClick={() => setShowAddMedicationModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Add a medication
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medications.map(med => (
                      <div key={med.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border">
                        <div>
                          <p className="font-medium text-foreground">{med.medication_name}</p>
                          <p className="text-sm text-muted-foreground">{med.dosage} -- {med.frequency}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Started: {new Date(med.start_date).toLocaleDateString()}</span>
                            {med.prescribing_provider && <span>By: {med.prescribing_provider}</span>}
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => handleStopMedication(med.id)}
                          className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border-red-200">
                          Stop
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insurance" className="mt-0">
              <div>
                {user && patient ? (
                  <InsuranceCardManager patientId={patient.id} userId={user.id} />
                ) : (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">Complete your patient registration to manage insurance cards</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {showEditHealthModal && patient && (
        <EditProfileModal patient={patient} onClose={() => setShowEditHealthModal(false)} onSave={handleSaveHealthProfile} />
      )}
      {showAddContactModal && (
        <AddEmergencyContactModal onClose={() => setShowAddContactModal(false)} onSave={handleAddContact} />
      )}
      {showAddAllergyModal && (
        <AddAllergyModal onClose={() => setShowAddAllergyModal(false)} onSave={handleAddAllergy} />
      )}
      {showAddMedicationModal && (
        <AddMedicationModal onClose={() => setShowAddMedicationModal(false)} onSave={handleAddMedication} />
      )}
    </div>
    <ConfirmDialog
      open={confirmDialogOpen}
      onOpenChange={setConfirmDialogOpen}
      title={confirmDialogConfig.title}
      description={confirmDialogConfig.description}
      confirmLabel="Confirm"
      variant="destructive"
      onConfirm={confirmDialogConfig.onConfirm}
    />
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-lg p-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`font-medium ${value === 'Not set' ? 'text-muted-foreground italic' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
