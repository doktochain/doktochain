import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, CreditCard as Edit, Trash2, Eye, Upload } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { supabase } from '../../../../../lib/supabase';
import { storageService } from '../../../../../services/storageService';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminInsuranceProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await adminCRUDService.getAll('insurance_providers_master', false);
      setProviders(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading insurance providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
      const filePath = `insurance-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleCreateProvider = async (data: any) => {
    try {
      let logoUrl = null;

      if (data.logo_file instanceof File) {
        logoUrl = await handleLogoUpload(data.logo_file);
      }

      await adminCRUDService.create('insurance_providers_master', {
        name: data.name,
        slug: data.slug,
        logo_url: logoUrl,
        provider_type: data.provider_type || 'private',
        description: data.description || null,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        website_url: data.website_url || null,
        provinces_covered: data.provinces_covered ? data.provinces_covered.split(',').map((p: string) => p.trim()) : [],
        is_active: data.is_active !== false,
      });

      setShowCreateModal(false);
      loadProviders();
      toast.success('Insurance provider created successfully!');
    } catch (error: any) {
      console.error('Error creating insurance provider:', error);
      toast.error(`Failed to create insurance provider: ${error.message}`);
    }
  };

  const handleUpdateProvider = async (data: any) => {
    try {
      let logoUrl = selectedProvider.logo_url;

      if (data.logo_file instanceof File) {
        logoUrl = await handleLogoUpload(data.logo_file);
      }

      await adminCRUDService.update('insurance_providers_master', selectedProvider.id, {
        name: data.name,
        slug: data.slug,
        logo_url: logoUrl,
        provider_type: data.provider_type || 'private',
        description: data.description || null,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        website_url: data.website_url || null,
        provinces_covered: data.provinces_covered ? data.provinces_covered.split(',').map((p: string) => p.trim()) : [],
        is_active: data.is_active !== false,
      });

      setShowEditModal(false);
      setSelectedProvider(null);
      loadProviders();
      toast.success('Insurance provider updated successfully!');
    } catch (error: any) {
      console.error('Error updating insurance provider:', error);
      toast.error(`Failed to update insurance provider: ${error.message}`);
    }
  };

  const handleDeleteProvider = async () => {
    try {
      await adminCRUDService.hardDelete('insurance_providers_master', selectedProvider.id);

      setShowDeleteModal(false);
      setSelectedProvider(null);
      loadProviders();
      toast.success('Insurance provider deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting insurance provider:', error);
      toast.error(`Failed to delete insurance provider: ${error.message}`);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('insurance_providers_master', ids, false);

      loadProviders();
      toast.success('Insurance providers deleted successfully!');
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      toast.error(`Failed to delete insurance providers: ${error.message}`);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Insurance Provider',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-3">
          {row.logo_url && (
            <img src={row.logo_url} alt={value} className="w-10 h-10 object-contain rounded" />
          )}
          <div className="font-medium">{value}</div>
        </div>
      ),
    },
    {
      key: 'provider_type',
      label: 'Type',
      render: (value) => {
        const typeLabels: Record<string, string> = { provincial: 'Provincial', private: 'Private', workers_comp: 'Workers Comp', other: 'Other' };
        return <AdminStatusBadge status={typeLabels[value] || value} />;
      },
    },
    {
      key: 'provinces_covered',
      label: 'Provinces',
      render: (value) => value?.length > 0 ? value.join(', ') : 'N/A',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <AdminStatusBadge status={value ? 'Active' : 'Inactive'} variant={value ? 'success' : 'default'} />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedProvider(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedProvider(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedProvider(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: 'Delete Selected',
      icon: <Trash2 size={16} />,
      onClick: handleBulkDelete,
      variant: 'danger',
      requiresConfirmation: true,
    },
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Provider Name', type: 'text', required: true },
    { name: 'slug', label: 'URL Slug', type: 'text', required: true },
    { name: 'logo_file', label: 'Logo Image', type: 'file' },
    {
      name: 'provider_type',
      label: 'Provider Type',
      type: 'select',
      required: true,
      options: [
        { value: 'provincial', label: 'Provincial' },
        { value: 'private', label: 'Private' },
        { value: 'workers_comp', label: 'Workers Compensation' },
        { value: 'other', label: 'Other' },
      ],
    },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'contact_phone', label: 'Contact Phone', type: 'tel' },
    { name: 'contact_email', label: 'Contact Email', type: 'email' },
    { name: 'website_url', label: 'Website URL', type: 'text' },
    {
      name: 'provinces_covered',
      label: 'Provinces Covered (comma-separated)',
      type: 'text',
      placeholder: 'ON, BC, AB, QC',
      helperText: 'Enter province codes separated by commas'
    },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Insurance Providers Master Data"
        description="Manage insurance provider listings and logos"
        icon={<Shield size={32} className="text-blue-500" />}
        data={providers}
        columns={columns}
        loading={loading}
        onRefresh={loadProviders}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedProvider(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search insurance providers..."
        createButtonLabel="Add Insurance Provider"
        emptyMessage="No insurance providers found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Insurance Provider"
        fields={formFields}
        onSubmit={handleCreateProvider}
        submitLabel="Create Provider"
        size="md"
        isLoading={uploading}
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProvider(null);
        }}
        title="Edit Insurance Provider"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: field.name === 'provinces_covered'
            ? selectedProvider?.provinces_covered?.join(', ')
            : selectedProvider?.[field.name],
        }))}
        onSubmit={handleUpdateProvider}
        submitLabel="Update Provider"
        size="md"
        isLoading={uploading}
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProvider(null);
        }}
        onConfirm={handleDeleteProvider}
        title="Delete Insurance Provider"
        message="Are you sure you want to delete this insurance provider?"
        itemName={selectedProvider?.name}
        cascadeWarning={[
          'Providers accepting this insurance will need to be updated',
        ]}
      />

      {selectedProvider && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedProvider(null);
          }}
          title={selectedProvider.name}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  {selectedProvider.logo_url && (
                    <div>
                      <h4 className="font-semibold mb-2">Logo</h4>
                      <img src={selectedProvider.logo_url} alt={selectedProvider.name} className="w-32 h-32 object-contain border rounded p-2" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p>{selectedProvider.description || 'No description available'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Provider Type</h4>
                    <p className="capitalize">{selectedProvider.provider_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Provinces Covered</h4>
                    <p>{selectedProvider.provinces_covered?.join(', ') || 'Not specified'}</p>
                  </div>
                  {selectedProvider.contact_phone && (
                    <div>
                      <h4 className="font-semibold mb-2">Contact Phone</h4>
                      <p>{selectedProvider.contact_phone}</p>
                    </div>
                  )}
                  {selectedProvider.contact_email && (
                    <div>
                      <h4 className="font-semibold mb-2">Contact Email</h4>
                      <p>{selectedProvider.contact_email}</p>
                    </div>
                  )}
                  {selectedProvider.website_url && (
                    <div>
                      <h4 className="font-semibold mb-2">Website</h4>
                      <a href={selectedProvider.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedProvider.website_url}
                      </a>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Status</h4>
                    <p>{selectedProvider.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
