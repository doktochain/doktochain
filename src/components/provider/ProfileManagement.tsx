import { useState, useEffect } from 'react';
import { User, GraduationCap, Image, Video, Save, Plus, X, Languages, Clock, Calendar, Building2, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { providerProfileService, type ProviderProfileData, type Specialty, type Procedure, type Language } from '../../services/providerProfileService';

interface ProfileManagementProps {
  providerId: string;
}

export default function ProfileManagement({ providerId }: ProfileManagementProps) {
  const [activeTab, setActiveTab] = useState('bio');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState<ProviderProfileData>({
    bio: '',
    years_of_experience: 0,
    accepting_new_patients: true,
    consultation_fee_cents: 40000,
    virtual_consultation_fee_cents: 30000,
    slot_duration_minutes: 30,
    max_daily_virtual_appointments: 10,
    emergency_consultation_available: false,
    buffer_time_minutes: 5,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [allSpecialties, setAllSpecialties] = useState<any[]>([]);
  const [allProcedures, setAllProcedures] = useState<any[]>([]);

  const [newSpecialty, setNewSpecialty] = useState<Partial<Specialty>>({
    specialty_id: '',
    is_primary: false,
    board_certified: false,
  });

  const [newProcedure, setNewProcedure] = useState<any>({
    procedure_id: '',
    price_cents: 0,
    duration_minutes: 30,
    requires_referral: false,
    available_virtually: false,
  });

  const [newLanguage, setNewLanguage] = useState<Language>({
    language: '',
    proficiency: 'conversational',
  });

  const LANGUAGE_OPTIONS = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'zh', name: 'Chinese (Mandarin)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ru', name: 'Russian' },
  ];

  useEffect(() => {
    loadData();
  }, [providerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profile, specs, procs, langs, allSpecs, allProcs] = await Promise.all([
        providerProfileService.getProfile(providerId),
        providerProfileService.getProviderSpecialties(providerId),
        providerProfileService.getProcedures(providerId),
        providerProfileService.getLanguages(providerId),
        providerProfileService.getAllSpecialties(),
        providerProfileService.getAllProcedures(),
      ]);

      if (profile) {
        setProfileData({
          bio: profile.bio || '',
          years_of_experience: profile.years_of_experience || 0,
          professional_photo_url: profile.professional_photo_url,
          video_intro_url: profile.video_intro_url,
          accepting_new_patients: profile.accepting_new_patients ?? true,
          consultation_fee_cents: profile.consultation_fee_cents || 40000,
          virtual_consultation_fee_cents: profile.virtual_consultation_fee_cents || 30000,
          slot_duration_minutes: profile.slot_duration_minutes || 30,
          max_daily_virtual_appointments: profile.max_daily_virtual_appointments || 10,
          emergency_consultation_available: profile.emergency_consultation_available || false,
          buffer_time_minutes: profile.buffer_time_minutes || 5,
        });
      }

      setSpecialties(specs);
      setProcedures(procs);
      setLanguages(langs);
      setAllSpecialties(allSpecs);
      setAllProcedures(allProcs);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      let photoUrl = profileData.professional_photo_url;
      let videoUrl = profileData.video_intro_url;

      if (photoFile) {
        photoUrl = await providerProfileService.uploadPhoto(photoFile);
      }

      if (videoFile) {
        videoUrl = await providerProfileService.uploadVideo(videoFile);
      }

      await providerProfileService.updateProfile(providerId, {
        ...profileData,
        professional_photo_url: photoUrl,
        video_intro_url: videoUrl,
      });

      toast.success('Profile updated successfully!');
      loadData();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpecialty = async () => {
    if (!newSpecialty.specialty_id) {
      toast.error('Please select a specialty');
      return;
    }

    try {
      await providerProfileService.addSpecialty(providerId, newSpecialty as Omit<Specialty, 'id'>);
      setNewSpecialty({ specialty_id: '', is_primary: false, board_certified: false });
      await loadData();
      toast.success('Specialty added successfully!');
    } catch (error: any) {
      console.error('Error adding specialty:', error);
      toast.error(`Failed to add specialty: ${error.message}`);
    }
  };

  const handleRemoveSpecialty = async (id: string) => {
    try {
      await providerProfileService.deleteSpecialty(id);
      loadData();
    } catch (error) {
      console.error('Error removing specialty:', error);
    }
  };

  const handleAddProcedure = async () => {
    if (!newProcedure.procedure_id) {
      toast.error('Please select a procedure');
      return;
    }

    try {
      await providerProfileService.addProcedure(providerId, newProcedure);
      setNewProcedure({
        procedure_id: '',
        price_cents: 0,
        duration_minutes: 30,
        requires_referral: false,
        available_virtually: false,
      });
      await loadData();
      toast.success('Procedure added successfully!');
    } catch (error: any) {
      console.error('Error adding procedure:', error);
      toast.error(`Failed to add procedure: ${error.message}`);
    }
  };

  const handleRemoveProcedure = async (id: string) => {
    try {
      await providerProfileService.deleteProcedure(id);
      loadData();
    } catch (error) {
      console.error('Error removing procedure:', error);
    }
  };

  const handleAddLanguage = async () => {
    if (!newLanguage.language) {
      toast.error('Please select a language');
      return;
    }

    try {
      await providerProfileService.addLanguage(providerId, newLanguage);
      setNewLanguage({
        language: '',
        proficiency: 'conversational',
      });
      await loadData();
      toast.success('Language added successfully!');
    } catch (error: any) {
      console.error('Error adding language:', error);
      toast.error(`Failed to add language: ${error.message}`);
    }
  };

  const handleRemoveLanguage = async (id: string) => {
    try {
      await providerProfileService.deleteLanguage(id);
      loadData();
    } catch (error) {
      console.error('Error removing language:', error);
    }
  };

  const tabs = [
    { id: 'bio', label: 'Bio & Experience', icon: User },
    { id: 'specialties', label: 'Specialties', icon: GraduationCap },
    { id: 'procedures', label: 'Procedures', icon: FileText },
    { id: 'languages', label: 'Languages', icon: Languages },
    { id: 'fees', label: 'Fees & Settings', icon: DollarSign },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Profile Management</h1>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Save />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'bio' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Photo
                </label>
                <div className="flex items-center gap-4">
                  {profileData.professional_photo_url && (
                    <img
                      src={profileData.professional_photo_url}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: Square image, at least 400x400px
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Introduction (Optional, max 2 minutes)
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {profileData.video_intro_url && (
                  <p className="text-sm text-green-600 mt-2">Video uploaded</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Biography (2000 characters max)
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  maxLength={2000}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell patients about your background, expertise, and approach to care..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {profileData.bio?.length || 0} / 2000 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={profileData.years_of_experience}
                  onChange={(e) =>
                    setProfileData({ ...profileData, years_of_experience: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={profileData.accepting_new_patients}
                  onChange={(e) =>
                    setProfileData({ ...profileData, accepting_new_patients: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Accepting new patients
                </label>
              </div>
            </div>
          )}

          {activeTab === 'specialties' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Specialties</h3>
                <div className="space-y-3">
                  {specialties.map((specialty: any) => (
                    <div
                      key={specialty.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">
                            {specialty.specialties_master?.name || specialty.specialty}
                          </span>
                          {specialty.is_primary && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              Primary
                            </span>
                          )}
                          {specialty.board_certified && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              Board Certified
                            </span>
                          )}
                        </div>
                        {specialty.certification_body && (
                          <p className="text-sm text-gray-600 mt-1">
                            {specialty.certification_body} {specialty.certification_year && `(${specialty.certification_year})`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveSpecialty(specialty.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {specialties.length < 5 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Specialty</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialty
                      </label>
                      <select
                        value={newSpecialty.specialty_id}
                        onChange={(e) => setNewSpecialty({ ...newSpecialty, specialty_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select a specialty</option>
                        {allSpecialties.map((spec) => (
                          <option key={spec.id} value={spec.id}>
                            {spec.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certification Body
                      </label>
                      <input
                        type="text"
                        value={newSpecialty.certification_body || ''}
                        onChange={(e) =>
                          setNewSpecialty({ ...newSpecialty, certification_body: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="e.g., Royal College of Physicians"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Certification Year
                      </label>
                      <input
                        type="number"
                        min="1950"
                        max={new Date().getFullYear()}
                        value={newSpecialty.certification_year || ''}
                        onChange={(e) =>
                          setNewSpecialty({ ...newSpecialty, certification_year: parseInt(e.target.value) })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newSpecialty.is_primary}
                          onChange={(e) =>
                            setNewSpecialty({ ...newSpecialty, is_primary: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Primary Specialty</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newSpecialty.board_certified}
                          onChange={(e) =>
                            setNewSpecialty({ ...newSpecialty, board_certified: e.target.checked })
                          }
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">Board Certified</label>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleAddSpecialty}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus />
                    Add Specialty
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'procedures' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Procedures Offered</h3>
                <div className="space-y-3">
                  {procedures.map((procedure: any) => (
                    <div
                      key={procedure.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <span className="font-medium text-gray-800">{procedure.procedure_name}</span>
                          <span className="text-blue-600">${(procedure.price_cents / 100).toFixed(2)}</span>
                          <span className="text-gray-600">{procedure.duration_minutes} min</span>
                        </div>
                        {procedure.description && (
                          <p className="text-sm text-gray-600 mt-1">{procedure.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveProcedure(procedure.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Procedure</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Procedure
                    </label>
                    <select
                      value={newProcedure.procedure_id}
                      onChange={(e) =>
                        setNewProcedure({ ...newProcedure, procedure_id: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select a procedure</option>
                      {allProcedures.map((proc: any) => (
                        <option key={proc.id} value={proc.id}>
                          {proc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (CAD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(newProcedure.price_cents || 0) / 100}
                      onChange={(e) =>
                        setNewProcedure({ ...newProcedure, price_cents: Math.round(parseFloat(e.target.value) * 100) })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={newProcedure.duration_minutes}
                      onChange={(e) =>
                        setNewProcedure({ ...newProcedure, duration_minutes: parseInt(e.target.value) || 30 })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="col-span-2 flex gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newProcedure.requires_referral}
                        onChange={(e) =>
                          setNewProcedure({ ...newProcedure, requires_referral: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">Requires Referral</label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newProcedure.available_virtually}
                        onChange={(e) =>
                          setNewProcedure({ ...newProcedure, available_virtually: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">Available Virtually</label>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddProcedure}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus />
                  Add Procedure
                </button>
              </div>
            </div>
          )}

          {activeTab === 'languages' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Languages Spoken</h3>
                <div className="space-y-3">
                  {languages.map((language: any) => (
                    <div
                      key={language.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{language.language}</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                            {language.proficiency}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveLanguage(language.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Language</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Language
                    </label>
                    <select
                      value={newLanguage.language}
                      onChange={(e) => {
                        setNewLanguage({
                          ...newLanguage,
                          language: e.target.value,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select a language</option>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <option key={lang.code} value={lang.name}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Proficiency Level
                    </label>
                    <select
                      value={newLanguage.proficiency}
                      onChange={(e) =>
                        setNewLanguage({
                          ...newLanguage,
                          proficiency: e.target.value as 'fluent' | 'conversational' | 'basic',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="fluent">Fluent</option>
                      <option value="conversational">Conversational</option>
                      <option value="basic">Basic</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAddLanguage}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus />
                  Add Language
                </button>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  In-Person Consultation Fee (CAD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(profileData.consultation_fee_cents || 0) / 100}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      consultation_fee_cents: Math.round(parseFloat(e.target.value) * 100),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Virtual Consultation Fee (CAD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(profileData.virtual_consultation_fee_cents || 0) / 100}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      virtual_consultation_fee_cents: Math.round(parseFloat(e.target.value) * 100),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Appointment Slot Duration (minutes)
                </label>
                <select
                  value={profileData.slot_duration_minutes}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      slot_duration_minutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buffer Time Between Appointments (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={profileData.buffer_time_minutes}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      buffer_time_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Daily Virtual Appointments
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={profileData.max_daily_virtual_appointments}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      max_daily_virtual_appointments: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={profileData.emergency_consultation_available}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      emergency_consultation_available: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Available for emergency consultations
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
