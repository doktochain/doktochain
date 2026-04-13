import { useState, useEffect } from 'react';
import { Building2, CheckCircle, CreditCard as Edit, Trash2, Eye, Shield } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { clinicService, Clinic } from '../../../../../services/clinicService';
import { supabase } from '../../../../../lib/supabase';

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

const SUBSCRIPTION_PLANS = [
  { value: 'basic', label: 'Basic' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const BILLING_MODELS = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed Fee' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [clinicOwners, setClinicOwners] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    loadClinics();
    loadClinicOwners();
  }, []);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await clinicService.getAllClinics();
      setClinics(data);
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClinicOwners = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'clinic');
      setClinicOwners(
        (data || []).map((u: any) => ({
          value: u.id,
          label: `${u.first_name} ${u.last_name} (${u.email})`,
        }))
      );
    } catch {
      setClinicOwners([]);
    }
  };

  const handleCreate = async (formData: any) => {
    try {
      await clinicService.createClinic(formData);
      setShowCreateModal(false);
      loadClinics();
    } catch (error) {
      console.error('Error creating clinic:', error);
    }
  };

  const handleUpdate = async (formData: any) => {
    if (!selectedClinic) return;
    try {
      await clinicService.updateClinic(selectedClinic.id, formData);
      setShowEditModal(false);
      setSelectedClinic(null);
      loadClinics();
    } catch (error) {
      console.error('Error updating clinic:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedClinic) return;
    try {
      await clinicService.softDeleteClinic(selectedClinic.id);
      setShowDeleteModal(false);
      setSelectedClinic(null);
      loadClinics();
    } catch (error) {
      console.error('Error deleting clinic:', error);
    }
  };

  const handleVerify = async (clinicId: string) => {
    try {
      await clinicService.verifyClinic(clinicId);
      loadClinics();
    } catch (error) {
      console.error('Error verifying clinic:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Clinic Name',
      sortable: true,
      render: (_: any, row: any) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-sm text-gray-500">{row.city}, {row.province}</div>
        </div>
      ),
    },
    {
      key: 'owner_id',
      label: 'Owner',
      render: (_: any, row: any) => (
        <span>{row.user_profiles?.first_name} {row.user_profiles?.last_name}</span>
      ),
    },
    {
      key: 'subscription_plan',
      label: 'Plan',
      sortable: true,
      render: (value: any) => (
        <span className="capitalize">{value || 'basic'}</span>
      ),
    },
    {
      key: 'is_verified',
      label: 'Status',
      render: (value: any) => (
        <AdminStatusBadge
          status={value ? 'Verified' : 'Pending'}
          variant={value ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'is_active',
      label: 'Active',
      render: (value: any) => (
        <AdminStatusBadge
          status={value ? 'Active' : 'Inactive'}
          variant={value ? 'success' : 'default'}
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: any) => new Date(value).toLocaleDateString(),
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row: any) => { setSelectedClinic(row); setShowDetailView(true); },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row: any) => { setSelectedClinic(row); setShowEditModal(true); },
    },
    {
      label: 'Verify',
      icon: <Shield size={16} />,
      onClick: (row: any) => handleVerify(row.id),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row: any) => { setSelectedClinic(row); setShowDeleteModal(true); },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: 'Verify Selected',
      icon: <CheckCircle size={16} />,
      onClick: async (ids: string[]) => {
        for (const id of ids) await handleVerify(id);
      },
      variant: 'success',
      requiresConfirmation: true,
    },
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Clinic Name', type: 'text', required: true },
    { name: 'owner_id', label: 'Owner', type: 'select', required: true, options: clinicOwners },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'website', label: 'Website', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'address_line1', label: 'Address Line 1', type: 'text' },
    { name: 'address_line2', label: 'Address Line 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'province', label: 'Province', type: 'select', options: PROVINCES },
    { name: 'postal_code', label: 'Postal Code', type: 'text' },
    { name: 'subscription_plan', label: 'Subscription Plan', type: 'select', options: SUBSCRIPTION_PLANS },
    { name: 'billing_model', label: 'Billing Model', type: 'select', options: BILLING_MODELS },
    { name: 'max_providers', label: 'Max Providers', type: 'number' },
    { name: 'platform_fee_percentage', label: 'Platform Fee %', type: 'number' },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Clinic Management"
        description="Manage clinic tenants, verify applications, and monitor operations"
        icon={<Building2 size={32} className="text-blue-500" />}
        data={clinics}
        columns={columns}
        loading={loading}
        onRefresh={loadClinics}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row: any) => { setSelectedClinic(row); setShowDetailView(true); }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, city, owner..."
        createButtonLabel="Add Clinic"
        emptyMessage="No clinics found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Clinic"
        fields={formFields}
        onSubmit={handleCreate}
        submitLabel="Create Clinic"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedClinic(null); }}
        title="Edit Clinic"
        fields={formFields.map(f => ({ ...f, defaultValue: selectedClinic?.[f.name as keyof Clinic] }))}
        onSubmit={handleUpdate}
        submitLabel="Update Clinic"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedClinic(null); }}
        onConfirm={handleDelete}
        title="Delete Clinic"
        message="Are you sure you want to delete this clinic? This will soft-delete the clinic and can be restored later."
        itemName={selectedClinic?.name || ''}
        cascadeWarning={[
          'Provider affiliations will be deactivated',
          'Clinic schedule will be removed',
          'Billing records will be preserved',
        ]}
      />

      {selectedClinic && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => { setShowDetailView(false); setSelectedClinic(null); }}
          title={selectedClinic.name}
          subtitle={`${selectedClinic.city}, ${selectedClinic.province}`}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <p>Email: {selectedClinic.email || 'N/A'}</p>
                    <p>Phone: {selectedClinic.phone || 'N/A'}</p>
                    <p>Website: {selectedClinic.website || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Address</h4>
                    <p>{selectedClinic.address_line1}</p>
                    {selectedClinic.address_line2 && <p>{selectedClinic.address_line2}</p>}
                    <p>{selectedClinic.city}, {selectedClinic.province} {selectedClinic.postal_code}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Owner</h4>
                    <p>{selectedClinic.user_profiles?.first_name} {selectedClinic.user_profiles?.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedClinic.user_profiles?.email}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Subscription</h4>
                    <p>Plan: <span className="capitalize">{selectedClinic.subscription_plan}</span></p>
                    <p>Billing Model: <span className="capitalize">{selectedClinic.billing_model}</span></p>
                    <p>Max Providers: {selectedClinic.max_providers}</p>
                    <p>Platform Fee: {selectedClinic.platform_fee_percentage}%</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Status</h4>
                    <p>Verified: {selectedClinic.is_verified ? 'Yes' : 'No'}</p>
                    <p>Active: {selectedClinic.is_active ? 'Yes' : 'No'}</p>
                    <p>Onboarding: <span className="capitalize">{selectedClinic.onboarding_status}</span></p>
                  </div>
                  {selectedClinic.description && (
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm">{selectedClinic.description}</p>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          onEdit={() => { setShowDetailView(false); setShowEditModal(true); }}
          onDelete={() => { setShowDetailView(false); setShowDeleteModal(true); }}
        />
      )}
    </>
  );
}
