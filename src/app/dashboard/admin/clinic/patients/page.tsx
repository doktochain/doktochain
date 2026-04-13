import { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Eye, FileText, Calendar } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { supabase } from '../../../../../lib/supabase';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

const PROVINCES = [
  { value: 'ON', label: 'Ontario' },
  { value: 'QC', label: 'Quebec' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'YT', label: 'Yukon' },
];

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient && showDetailView) {
      loadPatientDetails(selectedPatient.id);
    }
  }, [selectedPatient, showDetailView]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'patient')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (patientId: string) => {
    try {
      const [appointmentsRes, prescriptionsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, status, appointment_type, providers(first_name, last_name, specialization)')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false })
          .limit(10),
        supabase
          .from('prescriptions')
          .select('id, medication_name, dosage, frequency, status, created_at, providers(first_name, last_name)')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setPatientAppointments(appointmentsRes.data || []);
      setPatientPrescriptions(prescriptionsRes.data || []);
    } catch {
      setPatientAppointments([]);
      setPatientPrescriptions([]);
    }
  };

  const handleCreatePatient = async (data: any) => {
    try {
      await adminCRUDService.create('user_profiles', { ...data, role: 'patient', profile_completed: false });
      setShowCreateModal(false);
      loadPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  const handleUpdatePatient = async (data: any) => {
    try {
      await adminCRUDService.update('user_profiles', selectedPatient.id, data, selectedPatient);
      setShowEditModal(false);
      setSelectedPatient(null);
      loadPatients();
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleDeletePatient = async () => {
    try {
      await adminCRUDService.softDelete('user_profiles', selectedPatient.id);
      setShowDeleteModal(false);
      setSelectedPatient(null);
      loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('user_profiles', ids, true);
      loadPatients();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await adminCRUDService.exportToCSV('user_profiles', { role: 'patient' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'first_name',
      label: 'Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.first_name} {row.last_name}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', sortable: true },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'Not provided',
    },
    { key: 'gender', label: 'Gender', sortable: true },
    {
      key: 'city',
      label: 'Location',
      sortable: true,
      render: (_, row) => row.city && row.province ? `${row.city}, ${row.province}` : 'Not provided',
    },
    {
      key: 'profile_completed',
      label: 'Profile',
      render: (value) => <AdminStatusBadge status={value ? 'Complete' : 'Incomplete'} variant={value ? 'success' : 'warning'} />,
    },
    { key: 'created_at', label: 'Registered', sortable: true, render: (value) => new Date(value).toLocaleDateString() },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => { setSelectedPatient(row); setShowDetailView(true); },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => { setSelectedPatient(row); setShowEditModal(true); },
    },
    {
      label: 'View Records',
      icon: <FileText size={16} />,
      onClick: (row) => { setSelectedPatient(row); setShowDetailView(true); },
    },
    {
      label: 'View Appointments',
      icon: <Calendar size={16} />,
      onClick: (row) => { setSelectedPatient(row); setShowDetailView(true); },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => { setSelectedPatient(row); setShowDeleteModal(true); },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    { label: 'Delete Selected', icon: <Trash2 size={16} />, onClick: handleBulkDelete, variant: 'danger', requiresConfirmation: true },
  ];

  const createFields: FormField[] = [
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'gender', label: 'Gender', type: 'select', required: true, options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other', label: 'Other' },
      { value: 'prefer_not_to_say', label: 'Prefer not to say' },
    ]},
    { name: 'address_line1', label: 'Address Line 1', type: 'text' },
    { name: 'address_line2', label: 'Address Line 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'province', label: 'Province', type: 'select', options: PROVINCES },
    { name: 'postal_code', label: 'Postal Code', type: 'text' },
  ];

  const renderAppointmentsList = () => {
    if (patientAppointments.length === 0) {
      return <p className="text-gray-500">No appointments found.</p>;
    }
    return (
      <div className="space-y-2">
        {patientAppointments.map((apt) => (
          <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">
                Dr. {apt.providers?.first_name} {apt.providers?.last_name}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(apt.appointment_date).toLocaleDateString()} {apt.appointment_time && `at ${apt.appointment_time}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs capitalize">{apt.appointment_type || 'General'}</span>
              <AdminStatusBadge
                status={apt.status || 'scheduled'}
                variant={apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'danger' : 'info'}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPrescriptionsList = () => {
    if (patientPrescriptions.length === 0) {
      return <p className="text-gray-500">No prescriptions found.</p>;
    }
    return (
      <div className="space-y-2">
        {patientPrescriptions.map((rx) => (
          <div key={rx.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{rx.medication_name}</p>
              <p className="text-sm text-gray-500">
                {rx.dosage} - {rx.frequency} | Dr. {rx.providers?.first_name} {rx.providers?.last_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">{new Date(rx.created_at).toLocaleDateString()}</span>
              <AdminStatusBadge
                status={rx.status || 'active'}
                variant={rx.status === 'active' ? 'success' : rx.status === 'expired' ? 'danger' : 'default'}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <AdminCRUDTemplate
        title="Patient Management"
        description="Manage patient records, view medical history, and monitor patient activity"
        icon={<Users size={32} className="text-green-500" />}
        data={patients}
        columns={columns}
        loading={loading}
        onRefresh={loadPatients}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => { setSelectedPatient(row); setShowDetailView(true); }}
        actions={actions}
        bulkActions={bulkActions}
        onExport={handleExport}
        searchPlaceholder="Search by name, email, phone..."
        createButtonLabel="Add Patient"
        emptyMessage="No patients found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Patient"
        fields={createFields}
        onSubmit={handleCreatePatient}
        submitLabel="Create Patient"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedPatient(null); }}
        title="Edit Patient"
        fields={createFields.map(field => ({ ...field, defaultValue: selectedPatient?.[field.name] }))}
        onSubmit={handleUpdatePatient}
        submitLabel="Update Patient"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedPatient(null); }}
        onConfirm={handleDeletePatient}
        title="Delete Patient"
        message="Are you sure you want to delete this patient? This action will soft-delete the patient record."
        itemName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
        cascadeWarning={[
          'All medical records will be preserved',
          'Appointment history will remain accessible',
          'Prescriptions will be archived',
        ]}
      />

      {selectedPatient && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => { setShowDetailView(false); setSelectedPatient(null); }}
          title={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          subtitle={selectedPatient.email}
          tabs={[
            {
              id: 'profile',
              label: 'Profile',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Personal Information</h4>
                    <p>Email: {selectedPatient.email}</p>
                    <p>Phone: {selectedPatient.phone || selectedPatient.phone_number || 'N/A'}</p>
                    <p>Date of Birth: {selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'Not provided'}</p>
                    <p>Gender: {selectedPatient.gender || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Address</h4>
                    <p>{selectedPatient.address_line1 || 'N/A'}</p>
                    {selectedPatient.address_line2 && <p>{selectedPatient.address_line2}</p>}
                    <p>
                      {selectedPatient.city || ''}{selectedPatient.province ? `, ${selectedPatient.province}` : ''} {selectedPatient.postal_code || ''}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              id: 'appointments',
              label: 'Appointments',
              badge: patientAppointments.length,
              content: renderAppointmentsList(),
            },
            {
              id: 'medical',
              label: 'Prescriptions',
              badge: patientPrescriptions.length,
              content: renderPrescriptionsList(),
            },
          ]}
          onEdit={() => { setShowDetailView(false); setShowEditModal(true); }}
          onDelete={() => { setShowDetailView(false); setShowDeleteModal(true); }}
        />
      )}
    </>
  );
}
