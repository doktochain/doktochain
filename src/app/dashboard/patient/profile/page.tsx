import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { patientService, Patient, PatientAllergy, PatientMedication, EmergencyContact } from '../../../../services/patientService';
import { User, Heart, Pill, Phone, Pencil, Plus, Trash2 } from 'lucide-react';
import EditProfileModal from '../../../../components/patient/EditProfileModal';
import AddAllergyModal from '../../../../components/patient/AddAllergyModal';
import AddMedicationModal from '../../../../components/patient/AddMedicationModal';
import AddEmergencyContactModal from '../../../../components/patient/AddEmergencyContactModal';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';

export default function PatientProfile() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<PatientAllergy[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [error, setError] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ title: '', description: '', onConfirm: () => {} });

  useEffect(() => {
    loadPatientData();
  }, [user]);

  const loadPatientData = async () => {
    if (!user) return;

    try {
      setError('');
      let patientData = await patientService.getPatientByUserId(user.id);

      if (!patientData) {
        patientData = await patientService.createPatient({
          user_id: user.id,
          is_minor: false
        });
      }

      setPatient(patientData);

      if (patientData) {
        const [allergiesData, medicationsData, contactsData] = await Promise.all([
          patientService.getAllergies(patientData.id),
          patientService.getCurrentMedications(patientData.id),
          patientService.getEmergencyContacts(patientData.id),
        ]);

        setAllergies(allergiesData);
        setMedications(medicationsData);
        setEmergencyContacts(contactsData);
      }
    } catch (error: any) {
      console.error('Error loading patient data:', error);
      setError(error.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<Patient>) => {
    if (!patient) return;
    try {
      setError('');
      await patientService.updatePatient(patient.id, updates);
      await loadPatientData();
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      throw error;
    }
  };

  const handleAddAllergy = async (allergyData: any) => {
    if (!patient) return;
    try {
      setError('');
      await patientService.addAllergy(patient.id, allergyData);
      await loadPatientData();
      setShowAllergyModal(false);
    } catch (error: any) {
      console.error('Error adding allergy:', error);
      setError(error.message || 'Failed to add allergy');
      throw error;
    }
  };

  const handleDeleteAllergy = (allergyId: string) => {
    setConfirmDialogConfig({
      title: 'Delete Allergy',
      description: 'Are you sure you want to delete this allergy?',
      onConfirm: async () => {
        await patientService.deleteAllergy(allergyId);
        await loadPatientData();
        setConfirmDialogOpen(false);
      },
    });
    setConfirmDialogOpen(true);
  };

  const handleAddMedication = async (medicationData: any) => {
    if (!patient) return;
    try {
      setError('');
      await patientService.addMedication(patient.id, medicationData);
      await loadPatientData();
      setShowMedicationModal(false);
    } catch (error: any) {
      console.error('Error adding medication:', error);
      setError(error.message || 'Failed to add medication');
      throw error;
    }
  };

  const handleAddContact = async (contactData: any) => {
    if (!patient) return;
    try {
      setError('');
      await patientService.addEmergencyContact(patient.id, contactData);
      await loadPatientData();
      setShowContactModal(false);
    } catch (error: any) {
      console.error('Error adding contact:', error);
      setError(error.message || 'Failed to add emergency contact');
      throw error;
    }
  };

  const handleDeleteContact = (contactId: string) => {
    setConfirmDialogConfig({
      title: 'Delete Contact',
      description: 'Are you sure you want to delete this contact?',
      onConfirm: async () => {
        await patientService.deleteEmergencyContact(contactId);
        await loadPatientData();
        setConfirmDialogOpen(false);
      },
    });
    setConfirmDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">My Health Profile</h1>
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Pencil /> Edit Profile
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {['profile', 'allergies', 'medications', 'contacts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Health Card Number
                  </label>
                  <input
                    type="text"
                    value={patient?.health_card_number || 'Not provided'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Province
                  </label>
                  <input
                    type="text"
                    value={patient?.health_card_province || 'Not provided'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Type
                  </label>
                  <input
                    type="text"
                    value={patient?.blood_type || 'Not specified'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Health Card Expiry
                  </label>
                  <input
                    type="text"
                    value={patient?.health_card_expiry || 'Not provided'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="text"
                    value={patient?.height_cm || 'Not provided'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    value={patient?.weight_kg || 'Not provided'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medical History
                </label>
                <textarea
                  value={patient?.medical_history || 'No medical history recorded'}
                  disabled
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chronic Conditions
                </label>
                <div className="flex flex-wrap gap-2">
                  {patient?.chronic_conditions && patient.chronic_conditions.length > 0 ? (
                    patient.chronic_conditions.map((condition, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {condition}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No chronic conditions recorded</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'allergies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">My Allergies</h3>
                <button
                  onClick={() => setShowAllergyModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Plus /> Add Allergy
                </button>
              </div>

              {allergies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No allergies recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-full">
                          <Heart className="text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{allergy.allergen}</h4>
                          <p className="text-sm text-gray-600">{allergy.reaction}</p>
                          <span
                            className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                              allergy.severity === 'life-threatening'
                                ? 'bg-red-100 text-red-800'
                                : allergy.severity === 'severe'
                                ? 'bg-orange-100 text-orange-800'
                                : allergy.severity === 'moderate'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {allergy.severity}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAllergy(allergy.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Current Medications</h3>
                <button
                  onClick={() => setShowMedicationModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus /> Add Medication
                </button>
              </div>

              {medications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No current medications
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map((medication) => (
                    <div
                      key={medication.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Pill className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {medication.medication_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {medication.dosage} - {medication.frequency}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Started: {medication.start_date}
                          </p>
                        </div>
                      </div>
                      <button className="text-gray-600 hover:text-gray-800">
                        <Pencil />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Emergency Contacts</h3>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus /> Add Contact
                </button>
              </div>

              {emergencyContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No emergency contacts added
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full">
                          <Phone className="text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                          <p className="text-sm text-gray-600">{contact.relationship}</p>
                          <p className="text-sm text-gray-600">{contact.phone}</p>
                          {contact.email && (
                            <p className="text-xs text-gray-500">{contact.email}</p>
                          )}
                          {contact.is_primary && (
                            <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && patient && (
        <EditProfileModal
          patient={patient}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdateProfile}
        />
      )}

      {showAllergyModal && (
        <AddAllergyModal
          onClose={() => setShowAllergyModal(false)}
          onSave={handleAddAllergy}
        />
      )}

      {showMedicationModal && (
        <AddMedicationModal
          onClose={() => setShowMedicationModal(false)}
          onSave={handleAddMedication}
        />
      )}

      {showContactModal && (
        <AddEmergencyContactModal
          onClose={() => setShowContactModal(false)}
          onSave={handleAddContact}
        />
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
