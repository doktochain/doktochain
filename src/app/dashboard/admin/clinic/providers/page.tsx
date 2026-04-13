import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, CheckCircle, CreditCard as Edit, Trash2, Eye, Calendar, Shield } from 'lucide-react';
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

export default function AdminProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [providerAppointments, setProviderAppointments] = useState<any[]>([]);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider && showDetailView) {
      loadProviderAppointments(selectedProvider.id);
    }
  }, [selectedProvider, showDetailView]);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('providers')
        .select(`
          *,
          user_profiles!providers_user_id_fkey(email, phone, first_name, last_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderAppointments = async (providerId: string) => {
    try {
      const { data } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, status, appointment_type, user_profiles!appointments_patient_id_fkey(first_name, last_name)')
        .eq('provider_id', providerId)
        .order('appointment_date', { ascending: false })
        .limit(10);
      setProviderAppointments(data || []);
    } catch {
      setProviderAppointments([]);
    }
  };

  const handleCreateProvider = async (data: any) => {
    try {
      await adminCRUDService.create('providers', data);
      setShowCreateModal(false);
      loadProviders();
    } catch (error) {
      console.error('Error creating provider:', error);
    }
  };

  const handleUpdateProvider = async (data: any) => {
    try {
      await adminCRUDService.update('providers', selectedProvider.id, data, selectedProvider);
      setShowEditModal(false);
      setSelectedProvider(null);
      loadProviders();
    } catch (error) {
      console.error('Error updating provider:', error);
    }
  };

  const handleDeleteProvider = async () => {
    try {
      await adminCRUDService.softDelete('providers', selectedProvider.id);
      setShowDeleteModal(false);
      setSelectedProvider(null);
      loadProviders();
    } catch (error) {
      console.error('Error deleting provider:', error);
    }
  };

  const handleVerifyProvider = async (providerId: string) => {
    try {
      await supabase
        .from('providers')
        .update({ is_verified: true, verification_date: new Date().toISOString() })
        .eq('id', providerId);
      loadProviders();
    } catch (error) {
      console.error('Error verifying provider:', error);
    }
  };

  const handleBulkVerify = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('providers', ids, {
        is_verified: true,
        verification_date: new Date().toISOString(),
      });
      loadProviders();
    } catch (error) {
      console.error('Error bulk verifying:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('providers', ids, true);
      loadProviders();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'user_id',
      label: 'Name',
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium">Dr. {row.user_profiles?.first_name} {row.user_profiles?.last_name}</div>
          <div className="text-sm text-gray-500">{row.user_profiles?.email}</div>
        </div>
      ),
    },
    { key: 'specialty', label: 'Specialty', sortable: true, render: (value: any) => value || 'Not specified' },
    { key: 'license_number', label: 'License #', sortable: true },
    {
      key: 'is_verified',
      label: 'Status',
      render: (value: any) => <AdminStatusBadge status={value ? 'Verified' : 'Pending'} variant={value ? 'success' : 'warning'} />,
    },
    {
      key: 'accepting_new_patients',
      label: 'Accepting Patients',
      render: (value: any) => <AdminStatusBadge status={value ? 'Yes' : 'No'} variant={value ? 'success' : 'default'} />,
    },
    { key: 'created_at', label: 'Registered', sortable: true, render: (value: any) => new Date(value).toLocaleDateString() },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => { setSelectedProvider(row); setShowDetailView(true); },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => { setSelectedProvider(row); setShowEditModal(true); },
    },
    {
      label: 'Verify',
      icon: <Shield size={16} />,
      onClick: (row) => handleVerifyProvider(row.id),
    },
    {
      label: 'View Schedule',
      icon: <Calendar size={16} />,
      onClick: (row) => navigate(`/dashboard/admin/clinic/providers/${row.id}/schedule`),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => { setSelectedProvider(row); setShowDeleteModal(true); },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    { label: 'Verify Selected', icon: <CheckCircle size={16} />, onClick: handleBulkVerify, variant: 'success', requiresConfirmation: true },
    { label: 'Delete Selected', icon: <Trash2 size={16} />, onClick: handleBulkDelete, variant: 'danger', requiresConfirmation: true },
  ];

  const createFields: FormField[] = [
    { name: 'provider_type', label: 'Provider Type', type: 'text', required: true },
    { name: 'professional_title', label: 'Professional Title', type: 'text' },
    { name: 'specialty', label: 'Specialty', type: 'text', required: true },
    { name: 'license_number', label: 'License Number', type: 'text', required: true },
    { name: 'license_province', label: 'License Province', type: 'select', required: true, options: PROVINCES },
    { name: 'years_of_experience', label: 'Years of Experience', type: 'number' },
    { name: 'bio', label: 'Biography', type: 'textarea', rows: 4 },
    { name: 'accepting_new_patients', label: 'Accepting Patients', type: 'checkbox', defaultValue: true },
  ];

  const renderAppointmentsList = () => {
    if (providerAppointments.length === 0) {
      return <p className="text-gray-500">No recent appointments found.</p>;
    }
    return (
      <div className="space-y-2">
        {providerAppointments.map((apt) => (
          <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">
                {apt.user_profiles?.first_name} {apt.user_profiles?.last_name}
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

  return (
    <>
      <AdminCRUDTemplate
        title="Provider Management"
        description="Manage healthcare providers, verify credentials, and monitor performance"
        icon={<Stethoscope size={32} className="text-blue-500" />}
        data={providers}
        columns={columns}
        loading={loading}
        onRefresh={loadProviders}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => { setSelectedProvider(row); setShowDetailView(true); }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, email, license number..."
        createButtonLabel="Add Provider"
        emptyMessage="No providers found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Provider"
        fields={createFields}
        onSubmit={handleCreateProvider}
        submitLabel="Create Provider"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedProvider(null); }}
        title="Edit Provider"
        fields={createFields.map(field => ({ ...field, defaultValue: selectedProvider?.[field.name] }))}
        onSubmit={handleUpdateProvider}
        submitLabel="Update Provider"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedProvider(null); }}
        onConfirm={handleDeleteProvider}
        title="Delete Provider"
        message="Are you sure you want to delete this provider? This action will soft-delete the provider and they can be restored later."
        itemName={selectedProvider ? `Dr. ${selectedProvider.user_profiles?.first_name || ''} ${selectedProvider.user_profiles?.last_name || ''}` : ''}
        cascadeWarning={[
          'All appointments will be reassigned or cancelled',
          'Patient records will be preserved',
          'Billing history will remain accessible',
        ]}
      />

      {selectedProvider && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => { setShowDetailView(false); setSelectedProvider(null); }}
          title={`Dr. ${selectedProvider.user_profiles?.first_name || ''} ${selectedProvider.user_profiles?.last_name || ''}`}
          subtitle={selectedProvider.specialty}
          tabs={[
            {
              id: 'profile',
              label: 'Profile',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <p>Email: {selectedProvider.user_profiles?.email}</p>
                    <p>Phone: {selectedProvider.user_profiles?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">License Details</h4>
                    <p>License Number: {selectedProvider.license_number}</p>
                    <p>Province: {selectedProvider.license_province}</p>
                    <p>Verification Status: {selectedProvider.is_verified ? 'Verified' : 'Pending'}</p>
                    {selectedProvider.verification_date && (
                      <p>Verified On: {new Date(selectedProvider.verification_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Practice Info</h4>
                    <p>Specialty: {selectedProvider.specialty || 'Not specified'}</p>
                    <p>Provider Type: {selectedProvider.provider_type || 'N/A'}</p>
                    <p>Years of Experience: {selectedProvider.years_of_experience || 'N/A'}</p>
                    <p>Accepting Patients: {selectedProvider.accepting_new_patients ? 'Yes' : 'No'}</p>
                  </div>
                  {selectedProvider.bio && (
                    <div>
                      <h4 className="font-semibold mb-2">Biography</h4>
                      <p className="text-sm">{selectedProvider.bio}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'appointments',
              label: 'Recent Appointments',
              badge: providerAppointments.length,
              content: renderAppointmentsList(),
            },
          ]}
          onEdit={() => { setShowDetailView(false); setShowEditModal(true); }}
          onDelete={() => { setShowDetailView(false); setShowDeleteModal(true); }}
        />
      )}
    </>
  );
}
