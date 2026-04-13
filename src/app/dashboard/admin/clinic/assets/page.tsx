import { useState, useEffect } from 'react';
import { Package, Edit, Trash2, Eye, Wrench } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { assetService } from '../../../../../services/assetService';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await assetService.getAllAssets(true);
      setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (data: any) => {
    try {
      await assetService.createAsset(data);
      setShowCreateModal(false);
      loadAssets();
    } catch (error) {
      console.error('Error creating asset:', error);
    }
  };

  const handleUpdateAsset = async (data: any) => {
    try {
      await assetService.updateAsset(selectedAsset.id, data);
      setShowEditModal(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (error) {
      console.error('Error updating asset:', error);
    }
  };

  const handleDeleteAsset = async () => {
    try {
      await assetService.deleteAsset(selectedAsset.id);
      setShowDeleteModal(false);
      setSelectedAsset(null);
      loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('medical_assets', ids, true);
      loadAssets();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'retired':
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'asset_name',
      label: 'Asset Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.asset_type}</div>
        </div>
      ),
    },
    {
      key: 'serial_number',
      label: 'Serial Number',
      sortable: true,
      render: (value) => value || 'N/A',
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
      render: (value, row) => (
        <div>
          <div>{value || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{row.model || ''}</div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (value) => value?.location_name || 'Unassigned',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <AdminStatusBadge
          status={value}
          variant={getStatusVariant(value)}
        />
      ),
    },
    {
      key: 'next_maintenance',
      label: 'Next Maintenance',
      sortable: true,
      render: (value) => {
        if (!value) return 'Not scheduled';
        const date = new Date(value);
        const isOverdue = date < new Date();
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {date.toLocaleDateString()}
            {isOverdue && ' (Overdue)'}
          </span>
        );
      },
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedAsset(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedAsset(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Record Maintenance',
      icon: <Wrench size={16} />,
      onClick: (row) => console.log('Record maintenance for', row.id),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedAsset(row);
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
    { name: 'asset_name', label: 'Asset Name', type: 'text', required: true },
    { name: 'asset_type', label: 'Asset Type', type: 'select', required: true, options: [
      { value: 'diagnostic', label: 'Diagnostic Equipment' },
      { value: 'treatment', label: 'Treatment Equipment' },
      { value: 'monitoring', label: 'Monitoring Device' },
      { value: 'furniture', label: 'Furniture' },
      { value: 'computer', label: 'Computer/IT' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'serial_number', label: 'Serial Number', type: 'text' },
    { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { name: 'model', label: 'Model', type: 'text' },
    { name: 'purchase_date', label: 'Purchase Date', type: 'date' },
    { name: 'warranty_expiry', label: 'Warranty Expiry', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [
      { value: 'active', label: 'Active' },
      { value: 'maintenance', label: 'In Maintenance' },
      { value: 'retired', label: 'Retired' },
    ]},
    { name: 'last_maintenance', label: 'Last Maintenance', type: 'date' },
    { name: 'next_maintenance', label: 'Next Maintenance', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Asset Management"
        description="Manage medical equipment, track maintenance schedules, and monitor asset lifecycle"
        icon={<Package size={32} className="text-orange-500" />}
        data={assets}
        columns={columns}
        loading={loading}
        onRefresh={loadAssets}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedAsset(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, serial number, manufacturer..."
        createButtonLabel="Add Asset"
        emptyMessage="No assets found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Asset"
        fields={formFields}
        onSubmit={handleCreateAsset}
        submitLabel="Create Asset"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAsset(null);
        }}
        title="Edit Asset"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: selectedAsset?.[field.name],
        }))}
        onSubmit={handleUpdateAsset}
        submitLabel="Update Asset"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAsset(null);
        }}
        onConfirm={handleDeleteAsset}
        title="Delete Asset"
        message="Are you sure you want to delete this asset?"
        itemName={selectedAsset?.asset_name}
      />

      {selectedAsset && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedAsset(null);
          }}
          title={selectedAsset.asset_name}
          subtitle={selectedAsset.asset_type}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Equipment Information</h4>
                    <p>Type: {selectedAsset.asset_type}</p>
                    <p>Serial Number: {selectedAsset.serial_number || 'N/A'}</p>
                    <p>Manufacturer: {selectedAsset.manufacturer || 'Unknown'}</p>
                    <p>Model: {selectedAsset.model || 'Unknown'}</p>
                    <p>Status: {selectedAsset.status}</p>
                  </div>
                  {selectedAsset.location && (
                    <div>
                      <h4 className="font-semibold mb-2">Location</h4>
                      <p>{selectedAsset.location.location_name}</p>
                      <p className="text-sm text-gray-600">
                        {selectedAsset.location.city}, {selectedAsset.location.province}
                      </p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Purchase & Warranty</h4>
                    <p>Purchase Date: {selectedAsset.purchase_date ? new Date(selectedAsset.purchase_date).toLocaleDateString() : 'Unknown'}</p>
                    <p>Warranty Expiry: {selectedAsset.warranty_expiry ? new Date(selectedAsset.warranty_expiry).toLocaleDateString() : 'Unknown'}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'maintenance',
              label: 'Maintenance',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Maintenance Schedule</h4>
                    <p>Last Maintenance: {selectedAsset.last_maintenance ? new Date(selectedAsset.last_maintenance).toLocaleDateString() : 'Never'}</p>
                    <p>Next Maintenance: {selectedAsset.next_maintenance ? new Date(selectedAsset.next_maintenance).toLocaleDateString() : 'Not scheduled'}</p>
                  </div>
                  {selectedAsset.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p>{selectedAsset.notes}</p>
                    </div>
                  )}
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
