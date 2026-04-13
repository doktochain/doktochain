import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Award, CreditCard as Edit, Trash2, Eye } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { supabase } from '../../../../../lib/supabase';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminSpecializationsPage() {
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState<any>(null);

  useEffect(() => {
    loadSpecializations();
  }, []);

  const loadSpecializations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('specialties_master')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSpecializations(data || []);
    } catch (error) {
      console.error('Error loading specializations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpecialization = async (data: any) => {
    try {
      const { error } = await supabase.from('specialties_master').insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
        long_description: data.long_description || null,
        category: data.category || null,
        icon: data.icon || null,
        is_active: data.is_active !== false,
      });

      if (error) throw error;

      setShowCreateModal(false);
      loadSpecializations();
      toast.success('Specialization created successfully!');
    } catch (error: any) {
      console.error('Error creating specialization:', error);
      toast.error(`Failed to create specialization: ${error.message}`);
    }
  };

  const handleUpdateSpecialization = async (data: any) => {
    try {
      const { error } = await supabase
        .from('specialties_master')
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description,
          long_description: data.long_description || null,
          category: data.category || null,
          icon: data.icon || null,
          is_active: data.is_active !== false,
        })
        .eq('id', selectedSpecialization.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedSpecialization(null);
      loadSpecializations();
      toast.success('Specialization updated successfully!');
    } catch (error: any) {
      console.error('Error updating specialization:', error);
      toast.error(`Failed to update specialization: ${error.message}`);
    }
  };

  const handleDeleteSpecialization = async () => {
    try {
      const { error } = await supabase
        .from('specialties_master')
        .delete()
        .eq('id', selectedSpecialization.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedSpecialization(null);
      loadSpecializations();
    } catch (error) {
      console.error('Error deleting specialization:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('specialties_master')
        .delete()
        .in('id', ids);

      if (error) throw error;

      loadSpecializations();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Specialization',
      sortable: true,
      render: (value) => (
        <div className="font-medium">{value}</div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => value || 'No description',
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
        setSelectedSpecialization(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedSpecialization(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedSpecialization(row);
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
    { name: 'name', label: 'Specialization Name', type: 'text', required: true },
    { name: 'slug', label: 'URL Slug', type: 'text', required: true },
    { name: 'description', label: 'Short Description', type: 'textarea', rows: 2, required: true },
    { name: 'long_description', label: 'Long Description', type: 'textarea', rows: 4 },
    { name: 'category', label: 'Category', type: 'text' },
    { name: 'icon', label: 'Icon (emoji or text)', type: 'text' },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Specialization Management"
        description="Manage medical specializations and provider certifications"
        icon={<Award size={32} className="text-yellow-500" />}
        data={specializations}
        columns={columns}
        loading={loading}
        onRefresh={loadSpecializations}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedSpecialization(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search specializations..."
        createButtonLabel="Add Specialization"
        emptyMessage="No specializations found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Specialization"
        fields={formFields}
        onSubmit={handleCreateSpecialization}
        submitLabel="Create Specialization"
        size="md"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSpecialization(null);
        }}
        title="Edit Specialization"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: selectedSpecialization?.[field.name],
        }))}
        onSubmit={handleUpdateSpecialization}
        submitLabel="Update Specialization"
        size="md"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedSpecialization(null);
        }}
        onConfirm={handleDeleteSpecialization}
        title="Delete Specialization"
        message="Are you sure you want to delete this specialization?"
        itemName={selectedSpecialization?.name}
        cascadeWarning={[
          'Providers with this specialization will need to be reassigned',
        ]}
      />

      {selectedSpecialization && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedSpecialization(null);
          }}
          title={selectedSpecialization.name}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p>{selectedSpecialization.description || 'No description available'}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'providers',
              label: 'Providers',
              content: (
                <div>
                  <p>Providers with this specialization will be displayed here</p>
                </div>
              ),
            },
          ]}
          onEdit={() => {
            setShowDetailView(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            setShowDetailView(false);
            setShowDeleteModal(true);
          }}
        />
      )}
    </>
  );
}
