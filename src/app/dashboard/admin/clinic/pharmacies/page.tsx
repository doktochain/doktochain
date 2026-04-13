import { useState, useEffect } from 'react';
import { Store, Edit, Trash2, Eye, CheckCircle, Package, Shield } from 'lucide-react';
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

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [pharmacyOrders, setPharmacyOrders] = useState<any[]>([]);
  const [pharmacyInventory, setPharmacyInventory] = useState<any[]>([]);

  useEffect(() => {
    loadPharmacies();
  }, []);

  useEffect(() => {
    if (selectedPharmacy && showDetailView) {
      loadPharmacyDetails(selectedPharmacy.id);
    }
  }, [selectedPharmacy, showDetailView]);

  const loadPharmacies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*, user_profiles(first_name, last_name, email)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error('Error loading pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacyDetails = async (pharmacyId: string) => {
    try {
      const [ordersRes, inventoryRes] = await Promise.all([
        supabase
          .from('pharmacy_orders')
          .select('id, status, total_amount, created_at, user_profiles(first_name, last_name)')
          .eq('pharmacy_id', pharmacyId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('pharmacy_inventory')
          .select('id, medication_name, quantity, unit_price, reorder_level, status')
          .eq('pharmacy_id', pharmacyId)
          .order('medication_name', { ascending: true })
          .limit(20),
      ]);
      setPharmacyOrders(ordersRes.data || []);
      setPharmacyInventory(inventoryRes.data || []);
    } catch {
      setPharmacyOrders([]);
      setPharmacyInventory([]);
    }
  };

  const handleCreatePharmacy = async (data: any) => {
    try {
      await adminCRUDService.create('pharmacies', data);
      setShowCreateModal(false);
      loadPharmacies();
    } catch (error) {
      console.error('Error creating pharmacy:', error);
    }
  };

  const handleUpdatePharmacy = async (data: any) => {
    try {
      await adminCRUDService.update('pharmacies', selectedPharmacy.id, data, selectedPharmacy);
      setShowEditModal(false);
      setSelectedPharmacy(null);
      loadPharmacies();
    } catch (error) {
      console.error('Error updating pharmacy:', error);
    }
  };

  const handleDeletePharmacy = async () => {
    try {
      await adminCRUDService.softDelete('pharmacies', selectedPharmacy.id);
      setShowDeleteModal(false);
      setSelectedPharmacy(null);
      loadPharmacies();
    } catch (error) {
      console.error('Error deleting pharmacy:', error);
    }
  };

  const handleVerifyPharmacy = async (pharmacyId: string) => {
    try {
      await supabase.from('pharmacies').update({ is_verified: true }).eq('id', pharmacyId);
      loadPharmacies();
    } catch (error) {
      console.error('Error verifying pharmacy:', error);
    }
  };

  const handleBulkVerify = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('pharmacies', ids, { is_verified: true });
      loadPharmacies();
    } catch (error) {
      console.error('Error bulk verifying:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('pharmacies', ids, true);
      loadPharmacies();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'pharmacy_name',
      label: 'Pharmacy Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    { key: 'license_number', label: 'License #', sortable: true },
    { key: 'phone', label: 'Phone', sortable: true },
    {
      key: 'city',
      label: 'Location',
      sortable: true,
      render: (_, row) => row.city && row.province ? `${row.city}, ${row.province}` : 'Not provided',
    },
    {
      key: 'is_verified',
      label: 'Status',
      render: (value) => <AdminStatusBadge status={value ? 'Verified' : 'Pending'} variant={value ? 'success' : 'warning'} />,
    },
    {
      key: 'delivery_available',
      label: 'Delivery',
      render: (value) => <AdminStatusBadge status={value ? 'Available' : 'Not Available'} variant={value ? 'info' : 'default'} />,
    },
    { key: 'created_at', label: 'Registered', sortable: true, render: (value) => new Date(value).toLocaleDateString() },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => { setSelectedPharmacy(row); setShowDetailView(true); },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => { setSelectedPharmacy(row); setShowEditModal(true); },
    },
    {
      label: 'Verify',
      icon: <Shield size={16} />,
      onClick: (row) => handleVerifyPharmacy(row.id),
    },
    {
      label: 'View Inventory',
      icon: <Package size={16} />,
      onClick: (row) => { setSelectedPharmacy(row); setShowDetailView(true); },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => { setSelectedPharmacy(row); setShowDeleteModal(true); },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    { label: 'Verify Selected', icon: <CheckCircle size={16} />, onClick: handleBulkVerify, variant: 'success', requiresConfirmation: true },
    { label: 'Delete Selected', icon: <Trash2 size={16} />, onClick: handleBulkDelete, variant: 'danger', requiresConfirmation: true },
  ];

  const createFields: FormField[] = [
    { name: 'pharmacy_name', label: 'Pharmacy Name', type: 'text', required: true },
    { name: 'license_number', label: 'License Number', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'address_line1', label: 'Address Line 1', type: 'text', required: true },
    { name: 'address_line2', label: 'Address Line 2', type: 'text' },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'province', label: 'Province', type: 'select', required: true, options: PROVINCES },
    { name: 'postal_code', label: 'Postal Code', type: 'text', required: true },
    { name: 'delivery_available', label: 'Delivery Available', type: 'checkbox', defaultValue: false },
    { name: 'website', label: 'Website', type: 'text' },
  ];

  const renderOrdersList = () => {
    if (pharmacyOrders.length === 0) {
      return <p className="text-gray-500">No recent orders found.</p>;
    }
    return (
      <div className="space-y-2">
        {pharmacyOrders.map((order) => (
          <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">
                {order.user_profiles?.first_name} {order.user_profiles?.last_name}
              </p>
              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              {order.total_amount && <span className="text-sm font-medium">${Number(order.total_amount).toFixed(2)}</span>}
              <AdminStatusBadge
                status={order.status || 'pending'}
                variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInventoryList = () => {
    if (pharmacyInventory.length === 0) {
      return <p className="text-gray-500">No inventory items found.</p>;
    }
    return (
      <div className="space-y-2">
        {pharmacyInventory.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{item.medication_name}</p>
              <p className="text-sm text-gray-500">
                Qty: {item.quantity} | Reorder at: {item.reorder_level || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {item.unit_price && <span className="text-sm">${Number(item.unit_price).toFixed(2)}/unit</span>}
              <AdminStatusBadge
                status={item.quantity <= (item.reorder_level || 0) ? 'Low Stock' : 'In Stock'}
                variant={item.quantity <= (item.reorder_level || 0) ? 'warning' : 'success'}
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
        title="Pharmacy Management"
        description="Manage pharmacy partners, verify credentials, and monitor operations"
        icon={<Store size={32} className="text-teal-500" />}
        data={pharmacies}
        columns={columns}
        loading={loading}
        onRefresh={loadPharmacies}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => { setSelectedPharmacy(row); setShowDetailView(true); }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, license, location..."
        createButtonLabel="Add Pharmacy"
        emptyMessage="No pharmacies found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Pharmacy"
        fields={createFields}
        onSubmit={handleCreatePharmacy}
        submitLabel="Create Pharmacy"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedPharmacy(null); }}
        title="Edit Pharmacy"
        fields={createFields.map(field => ({ ...field, defaultValue: selectedPharmacy?.[field.name] }))}
        onSubmit={handleUpdatePharmacy}
        submitLabel="Update Pharmacy"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedPharmacy(null); }}
        onConfirm={handleDeletePharmacy}
        title="Delete Pharmacy"
        message="Are you sure you want to delete this pharmacy? This action will soft-delete the pharmacy."
        itemName={selectedPharmacy?.pharmacy_name}
        cascadeWarning={[
          'All pending orders will be reassigned',
          'Prescription history will be preserved',
          'Inventory records will remain accessible',
        ]}
      />

      {selectedPharmacy && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => { setShowDetailView(false); setSelectedPharmacy(null); }}
          title={selectedPharmacy.pharmacy_name}
          subtitle={selectedPharmacy.email}
          tabs={[
            {
              id: 'profile',
              label: 'Profile',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <p>Email: {selectedPharmacy.email}</p>
                    <p>Phone: {selectedPharmacy.phone}</p>
                    <p>Website: {selectedPharmacy.website || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Address</h4>
                    <p>{selectedPharmacy.address_line1 || 'N/A'}</p>
                    {selectedPharmacy.address_line2 && <p>{selectedPharmacy.address_line2}</p>}
                    <p>
                      {selectedPharmacy.city || ''}{selectedPharmacy.province ? `, ${selectedPharmacy.province}` : ''} {selectedPharmacy.postal_code || ''}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">License Details</h4>
                    <p>License Number: {selectedPharmacy.license_number}</p>
                    <p>Verification Status: {selectedPharmacy.is_verified ? 'Verified' : 'Pending'}</p>
                    <p>Delivery: {selectedPharmacy.delivery_available ? 'Available' : 'Not Available'}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'orders',
              label: 'Orders',
              badge: pharmacyOrders.length,
              content: renderOrdersList(),
            },
            {
              id: 'inventory',
              label: 'Inventory',
              badge: pharmacyInventory.length,
              content: renderInventoryList(),
            },
          ]}
          onEdit={() => { setShowDetailView(false); setShowEditModal(true); }}
          onDelete={() => { setShowDetailView(false); setShowDeleteModal(true); }}
        />
      )}
    </>
  );
}
