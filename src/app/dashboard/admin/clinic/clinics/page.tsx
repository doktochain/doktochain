import { useState, useEffect } from 'react';
import { Building2, CheckCircle, CreditCard as Edit, Trash2, Eye, Shield, AlertCircle, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { clinicService, Clinic } from '../../../../../services/clinicService';
import { api } from '../../../../../lib/api-client';

type ClinicUser = { id: string; first_name: string; last_name: string; email: string };

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
  const [unassignedUsers, setUnassignedUsers] = useState<ClinicUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<ClinicUser | null>(null);
  const [assignName, setAssignName] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = async () => {
    await Promise.all([loadClinics(), loadClinicOwners()]);
  };

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await clinicService.getAllClinics();
      const ownerIds = Array.from(new Set(data.map((c: any) => c.owner_id).filter(Boolean)));
      let ownersById = new Map<string, any>();
      if (ownerIds.length > 0) {
        const { data: owners } = await api.get<any[]>('/user-profiles', {
          params: { id_in: ownerIds.join(','), limit: ownerIds.length },
        });
        if (Array.isArray(owners)) {
          ownersById = new Map(owners.map((o: any) => [o.id, o]));
        }
      }
      setClinics(
        data.map((c: any) => ({
          ...c,
          user_profiles: c.owner_id ? ownersById.get(c.owner_id) : undefined,
        }))
      );
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClinicOwners = async () => {
    try {
      const { data: users } = await api.get<ClinicUser[]>('/user-profiles', {
        params: { role: 'clinic', limit: 500 },
      });
      const { data: existingClinics } = await api.get<any[]>('/clinics', {
        params: { limit: 500 },
      });
      const owners = Array.isArray(users) ? users : [];
      const assigned = new Set(
        (Array.isArray(existingClinics) ? existingClinics : [])
          .filter((c: any) => !c.deleted_at)
          .map((c: any) => c.owner_id)
          .filter(Boolean)
      );
      setClinicOwners(
        owners.map(u => ({
          value: u.id,
          label: `${u.first_name || ''} ${u.last_name || ''} (${u.email})`.trim(),
        }))
      );
      setUnassignedUsers(owners.filter(u => !assigned.has(u.id)));
    } catch (err) {
      console.warn('Failed to load clinic owners', err);
      setClinicOwners([]);
      setUnassignedUsers([]);
    }
  };

  const openAssignModal = (user: ClinicUser) => {
    setAssignTarget(user);
    setAssignName(`${user.first_name || ''} ${user.last_name || ''}`.trim() + ' Clinic');
  };

  const handleAssignCreate = async () => {
    if (!assignTarget) return;
    if (!assignName.trim()) { toast.error('Enter a clinic name'); return; }
    setAssigning(true);
    try {
      await clinicService.createClinic({
        owner_id: assignTarget.id,
        name: assignName.trim(),
        email: assignTarget.email,
        onboarding_status: 'pending' as any,
        is_active: false,
        is_verified: false,
      });
      toast.success(`Clinic created for ${assignTarget.first_name} ${assignTarget.last_name}`);
      setAssignTarget(null);
      setAssignName('');
      await refreshAll();
    } catch (err: any) {
      console.error('Failed to create clinic for user', err);
      toast.error(err?.message || 'Failed to create clinic');
    } finally {
      setAssigning(false);
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
      {unassignedUsers.length > 0 && (
        <div className="mb-4 border border-amber-200 bg-amber-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                {unassignedUsers.length} clinic-role {unassignedUsers.length === 1 ? 'user has' : 'users have'} no clinic record yet
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                These users signed up with the <strong>clinic</strong> role but a clinic profile was never created for them. They currently see an onboarding prompt in the portal. Create a clinic profile for them here or let them self-onboard.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unassignedUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => openAssignModal(u)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-sm font-medium text-amber-900"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {u.first_name || u.email} {u.last_name || ''}
                    <span className="text-xs text-amber-700/80">· {u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <AdminCRUDTemplate
        title="Clinic Management"
        description="Manage clinic tenants, verify applications, and monitor operations"
        icon={<Building2 size={32} className="text-blue-500" />}
        data={clinics}
        columns={columns}
        loading={loading}
        onRefresh={refreshAll}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row: any) => { setSelectedClinic(row); setShowDetailView(true); }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, city, owner..."
        createButtonLabel="Add Clinic"
        emptyMessage="No clinics found"
      />

      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-5 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create clinic profile</h3>
                <p className="text-sm text-gray-500 mt-1">
                  For <strong>{assignTarget.first_name} {assignTarget.last_name}</strong> · {assignTarget.email}
                </p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic name *</label>
                <input
                  type="text"
                  value={assignName}
                  onChange={e => setAssignName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                The clinic will be created in <strong>pending</strong> onboarding status. The owner can complete the rest from their portal.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setAssignTarget(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCreate}
                disabled={assigning || !assignName.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {assigning ? 'Creating...' : 'Create clinic'}
              </button>
            </div>
          </div>
        </div>
      )}

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
