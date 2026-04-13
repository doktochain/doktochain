import { useState, useEffect } from 'react';
import { MapPin, Edit, Trash2, Eye, Power } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { locationService } from '../../../../../services/locationService';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const data = await locationService.getAllLocations(true);
      setLocations(data);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async (data: any) => {
    try {
      await locationService.createLocation(data);
      setShowCreateModal(false);
      loadLocations();
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  const handleUpdateLocation = async (data: any) => {
    try {
      await locationService.updateLocation(selectedLocation.id, data);
      setShowEditModal(false);
      setSelectedLocation(null);
      loadLocations();
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleDeleteLocation = async () => {
    try {
      await locationService.deleteLocation(selectedLocation.id);
      setShowDeleteModal(false);
      setSelectedLocation(null);
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const handleToggleStatus = async (locationId: string, isActive: boolean) => {
    try {
      await locationService.toggleLocationStatus(locationId, !isActive);
      loadLocations();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('clinic_locations', ids, true);
      loadLocations();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'location_name',
      label: 'Location Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.phone}</div>
        </div>
      ),
    },
    {
      key: 'address_line1',
      label: 'Address',
      render: (_, row) => (
        <div>
          <div>{row.address_line1}</div>
          <div className="text-sm text-gray-500">
            {row.city}, {row.province} {row.postal_code}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
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
        setSelectedLocation(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedLocation(row);
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
        setSelectedLocation(row);
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
    { name: 'location_name', label: 'Location Name', type: 'text', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'address_line1', label: 'Address Line 1', type: 'text', required: true },
    { name: 'address_line2', label: 'Address Line 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'province', label: 'Province', type: 'select', required: true, options: [
      { value: 'ON', label: 'Ontario' },
      { value: 'QC', label: 'Quebec' },
      { value: 'BC', label: 'British Columbia' },
      { value: 'AB', label: 'Alberta' },
      { value: 'MB', label: 'Manitoba' },
      { value: 'SK', label: 'Saskatchewan' },
    ]},
    { name: 'postal_code', label: 'Postal Code', type: 'text', required: true },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Location Management"
        description="Manage clinic locations, operating hours, and provider assignments"
        icon={<MapPin size={32} className="text-red-500" />}
        data={locations}
        columns={columns}
        loading={loading}
        onRefresh={loadLocations}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedLocation(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, city, postal code..."
        createButtonLabel="Add Location"
        emptyMessage="No locations found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Location"
        fields={formFields}
        onSubmit={handleCreateLocation}
        submitLabel="Create Location"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedLocation(null);
        }}
        title="Edit Location"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: selectedLocation?.[field.name],
        }))}
        onSubmit={handleUpdateLocation}
        submitLabel="Update Location"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedLocation(null);
        }}
        onConfirm={handleDeleteLocation}
        title="Delete Location"
        message="Are you sure you want to delete this location?"
        itemName={selectedLocation?.location_name}
        cascadeWarning={[
          'All provider assignments will be removed',
          'Appointments at this location may be affected',
        ]}
      />

      {selectedLocation && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedLocation(null);
          }}
          title={selectedLocation.location_name}
          subtitle={`${selectedLocation.city}, ${selectedLocation.province}`}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <p>Phone: {selectedLocation.phone}</p>
                    <p>Email: {selectedLocation.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Address</h4>
                    <p>{selectedLocation.address_line1}</p>
                    {selectedLocation.address_line2 && <p>{selectedLocation.address_line2}</p>}
                    <p>{selectedLocation.city}, {selectedLocation.province} {selectedLocation.postal_code}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'providers',
              label: 'Providers',
              content: (
                <div>
                  <p>Assigned providers will be displayed here</p>
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
