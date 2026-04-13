import { useState, useEffect } from 'react';
import { Stethoscope, Edit, Trash2, Eye, CheckCircle } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { supabase } from '../../../../../lib/supabase';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminProceduresPage() {
  const [procedures, setProcedures] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<any>(null);

  useEffect(() => {
    loadProcedures();
    loadSpecialties();

    // Set up real-time subscription for procedures
    const proceduresChannel = supabase
      .channel('procedures_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'procedures_master',
        },
        (payload) => {
          console.log('Procedures change detected:', payload);
          loadProcedures();
        }
      )
      .subscribe();

    // Set up real-time subscription for specialties
    const specialtiesChannel = supabase
      .channel('specialties_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'specialties_master',
        },
        (payload) => {
          console.log('Specialties change detected:', payload);
          loadSpecialties();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(proceduresChannel);
      supabase.removeChannel(specialtiesChannel);
    };
  }, []);

  const loadSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from('specialties_master')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSpecialties(data || []);
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  };

  const loadProcedures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedures_master')
        .select('*, specialties_master(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProcedures(data || []);
    } catch (error) {
      console.error('Error loading procedures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcedure = async (data: any) => {
    try {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await adminCRUDService.create('procedures_master', { ...data, slug });
      setShowCreateModal(false);
      loadProcedures();
    } catch (error) {
      console.error('Error creating procedure:', error);
    }
  };

  const handleUpdateProcedure = async (data: any) => {
    try {
      await adminCRUDService.update('procedures_master', selectedProcedure.id, data, selectedProcedure);
      setShowEditModal(false);
      setSelectedProcedure(null);
      loadProcedures();
    } catch (error) {
      console.error('Error updating procedure:', error);
    }
  };

  const handleDeleteProcedure = async () => {
    try {
      await adminCRUDService.softDelete('procedures_master', selectedProcedure.id);
      setShowDeleteModal(false);
      setSelectedProcedure(null);
      loadProcedures();
    } catch (error) {
      console.error('Error deleting procedure:', error);
    }
  };

  const handleBulkActivate = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('procedures_master', ids, { is_active: true });
      loadProcedures();
    } catch (error) {
      console.error('Error bulk activating:', error);
    }
  };

  const handleBulkDeactivate = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('procedures_master', ids, { is_active: false });
      loadProcedures();
    } catch (error) {
      console.error('Error bulk deactivating:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'name',
      label: 'Procedure Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.cpt_code && (
            <div className="text-sm text-gray-500">CPT: {row.cpt_code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
    },
    {
      key: 'specialties_master',
      label: 'Specialty',
      render: (value) => value?.name || 'N/A',
    },
    {
      key: 'average_duration_minutes',
      label: 'Duration',
      sortable: true,
      render: (value) => value ? `${value} min` : 'N/A',
    },
    {
      key: 'typical_cost_min',
      label: 'Cost Range',
      render: (_, row) => {
        if (!row.typical_cost_min && !row.typical_cost_max) return 'N/A';
        return `$${row.typical_cost_min || 0} - $${row.typical_cost_max || 0}`;
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <AdminStatusBadge
          status={value ? 'Active' : 'Inactive'}
          variant={value ? 'success' : 'default'}
        />
      ),
    },
    {
      key: 'is_common',
      label: 'Featured',
      render: (value) => value ? '⭐' : '',
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedProcedure(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedProcedure(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedProcedure(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: 'Activate Selected',
      icon: <CheckCircle size={16} />,
      onClick: handleBulkActivate,
      variant: 'success',
      requiresConfirmation: true,
    },
    {
      label: 'Deactivate Selected',
      icon: <Trash2 size={16} />,
      onClick: handleBulkDeactivate,
      variant: 'warning',
      requiresConfirmation: true,
    },
  ];

  const formFields: FormField[] = [
    { name: 'name', label: 'Procedure Name', type: 'text', required: true },
    { name: 'cpt_code', label: 'CPT Code', type: 'text' },
    { name: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Preventive Care', label: 'Preventive Care' },
      { value: 'Screening', label: 'Screening' },
      { value: 'Diagnostic', label: 'Diagnostic' },
      { value: 'Imaging', label: 'Imaging' },
      { value: 'Telemedicine', label: 'Telemedicine' },
      { value: 'Surgical', label: 'Surgical' },
      { value: 'Therapeutic', label: 'Therapeutic' },
    ]},
    { name: 'specialty_id', label: 'Specialty', type: 'select', options: [
      { value: '', label: 'Select Specialty' },
      ...specialties.map(s => ({ value: s.id, label: s.name }))
    ]},
    { name: 'description', label: 'Short Description', type: 'textarea', required: true, rows: 2 },
    { name: 'long_description', label: 'Detailed Description', type: 'textarea', rows: 4 },
    { name: 'average_duration_minutes', label: 'Duration (minutes)', type: 'number' },
    { name: 'typical_cost_min', label: 'Minimum Cost ($)', type: 'number' },
    { name: 'typical_cost_max', label: 'Maximum Cost ($)', type: 'number' },
    { name: 'preparation_info', label: 'Preparation Instructions', type: 'textarea', rows: 3 },
    { name: 'recovery_info', label: 'Recovery Information', type: 'textarea', rows: 3 },
    { name: 'what_to_expect', label: 'What to Expect', type: 'textarea', rows: 3 },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    { name: 'is_common', label: 'Feature as Common', type: 'checkbox', defaultValue: false },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Procedures Management"
        description="Manage medical procedures available to patients through providers"
        icon={<Stethoscope size={32} className="text-blue-500" />}
        data={procedures}
        columns={columns}
        loading={loading}
        onRefresh={loadProcedures}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedProcedure(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, CPT code, category..."
        createButtonLabel="Add Procedure"
        emptyMessage="No procedures found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Procedure"
        fields={formFields}
        onSubmit={handleCreateProcedure}
        submitLabel="Create Procedure"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProcedure(null);
        }}
        title="Edit Procedure"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: selectedProcedure?.[field.name],
        }))}
        onSubmit={handleUpdateProcedure}
        submitLabel="Update Procedure"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProcedure(null);
        }}
        onConfirm={handleDeleteProcedure}
        title="Delete Procedure"
        message="Are you sure you want to delete this procedure?"
        itemName={selectedProcedure?.name}
      />

      {selectedProcedure && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedProcedure(null);
          }}
          title={selectedProcedure.name}
          subtitle={selectedProcedure.category}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Basic Information</h4>
                    <p><strong>CPT Code:</strong> {selectedProcedure.cpt_code || 'N/A'}</p>
                    <p><strong>Category:</strong> {selectedProcedure.category}</p>
                    <p><strong>Duration:</strong> {selectedProcedure.average_duration_minutes || 'N/A'} minutes</p>
                    <p><strong>Description:</strong> {selectedProcedure.description}</p>
                  </div>
                  {selectedProcedure.long_description && (
                    <div>
                      <h4 className="font-semibold mb-2">Detailed Description</h4>
                      <p>{selectedProcedure.long_description}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'instructions',
              label: 'Instructions',
              content: (
                <div className="space-y-4">
                  {selectedProcedure.preparation_info && (
                    <div>
                      <h4 className="font-semibold mb-2">Preparation</h4>
                      <p>{selectedProcedure.preparation_info}</p>
                    </div>
                  )}
                  {selectedProcedure.what_to_expect && (
                    <div>
                      <h4 className="font-semibold mb-2">What to Expect</h4>
                      <p>{selectedProcedure.what_to_expect}</p>
                    </div>
                  )}
                  {selectedProcedure.recovery_info && (
                    <div>
                      <h4 className="font-semibold mb-2">Recovery</h4>
                      <p>{selectedProcedure.recovery_info}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'pricing',
              label: 'Pricing',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Cost Range</h4>
                    <p><strong>Minimum:</strong> ${selectedProcedure.typical_cost_min || 0}</p>
                    <p><strong>Maximum:</strong> ${selectedProcedure.typical_cost_max || 0}</p>
                  </div>
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
