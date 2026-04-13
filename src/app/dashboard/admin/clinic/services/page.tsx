import { useState, useEffect } from 'react';
import { Stethoscope, CreditCard as Edit, Trash2, Eye, Power } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { medicalServicesService } from '../../../../../services/medicalServicesService';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await medicalServicesService.getAllServices(true);
      setServices(data);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async (data: any) => {
    try {
      await medicalServicesService.createService(data);
      setShowCreateModal(false);
      loadServices();
    } catch (error) {
      console.error('Error creating service:', error);
    }
  };

  const handleUpdateService = async (data: any) => {
    try {
      await medicalServicesService.updateService(selectedService.id, data);
      setShowEditModal(false);
      setSelectedService(null);
      loadServices();
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const handleDeleteService = async () => {
    try {
      await medicalServicesService.deleteService(selectedService.id);
      setShowDeleteModal(false);
      setSelectedService(null);
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleToggleStatus = async (serviceId: string, isActive: boolean) => {
    try {
      await medicalServicesService.toggleServiceStatus(serviceId, !isActive);
      loadServices();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('medical_services', ids, true);
      loadServices();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'service_name',
      label: 'Service Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.service_code || 'No code'}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (value) => value || 'Uncategorized',
    },
    {
      key: 'duration_minutes',
      label: 'Duration',
      sortable: true,
      render: (value) => `${value} min`,
    },
    {
      key: 'is_telemedicine_eligible',
      label: 'Telemedicine',
      render: (value) => (
        <AdminStatusBadge
          status={value ? 'Eligible' : 'In-person only'}
          variant={value ? 'success' : 'default'}
          size="sm"
        />
      ),
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
        setSelectedService(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedService(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Toggle Status',
      icon: <Power size={16} />,
      onClick: (row) => handleToggleStatus(row.id, row.is_active),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedService(row);
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
    { name: 'service_name', label: 'Service Name', type: 'text', required: true },
    { name: 'service_code', label: 'Service Code (CPT)', type: 'text', helperText: 'Billing code' },
    { name: 'category', label: 'Category', type: 'select', options: [
      { value: 'consultation', label: 'Consultation' },
      { value: 'diagnostic', label: 'Diagnostic' },
      { value: 'procedure', label: 'Procedure' },
      { value: 'preventive', label: 'Preventive' },
      { value: 'therapeutic', label: 'Therapeutic' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', defaultValue: 30 },
    { name: 'requires_lab_work', label: 'Requires Lab Work', type: 'checkbox', defaultValue: false },
    { name: 'is_telemedicine_eligible', label: 'Telemedicine Eligible', type: 'checkbox', defaultValue: true },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Service Management"
        description="Manage medical services catalog. Providers set their own pricing for each service."
        icon={<Stethoscope size={32} className="text-blue-500" />}
        data={services}
        columns={columns}
        loading={loading}
        onRefresh={loadServices}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedService(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by service name, code, category..."
        createButtonLabel="Add Service"
        emptyMessage="No services found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Service"
        fields={formFields}
        onSubmit={handleCreateService}
        submitLabel="Create Service"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedService(null);
        }}
        title="Edit Service"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: selectedService?.[field.name],
        }))}
        onSubmit={handleUpdateService}
        submitLabel="Update Service"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedService(null);
        }}
        onConfirm={handleDeleteService}
        title="Delete Service"
        message="Are you sure you want to delete this service?"
        itemName={selectedService?.service_name}
        cascadeWarning={[
          'Provider pricing configurations will be removed',
          'Historical service records will be preserved',
        ]}
      />

      {selectedService && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedService(null);
          }}
          title={selectedService.service_name}
          subtitle={selectedService.service_code}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Service Information</h4>
                    <p>Category: {selectedService.category || 'Uncategorized'}</p>
                    <p>Duration: {selectedService.duration_minutes} minutes</p>
                    <p>Telemedicine: {selectedService.is_telemedicine_eligible ? 'Eligible' : 'In-person only'}</p>
                    <p>Lab Work: {selectedService.requires_lab_work ? 'Required' : 'Not required'}</p>
                  </div>
                  {selectedService.description && (
                    <div>
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p>{selectedService.description}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'pricing',
              label: 'Provider Pricing',
              content: (
                <div>
                  <p className="text-sm text-gray-600">Providers set their own pricing for this service. View individual provider profiles to see their rates.</p>
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
