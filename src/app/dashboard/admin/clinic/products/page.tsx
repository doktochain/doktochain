import { useState, useEffect } from 'react';
import { Package, Edit, Trash2, Eye, CheckCircle } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { supabase } from '../../../../../lib/supabase';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    loadProducts();

    // Set up real-time subscription for products
    const productsChannel = supabase
      .channel('products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products_master',
        },
        (payload) => {
          console.log('Products change detected:', payload);
          loadProducts();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(productsChannel);
    };
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_master')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (data: any) => {
    try {
      await adminCRUDService.create('products_master', data);
      setShowCreateModal(false);
      loadProducts();
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handleUpdateProduct = async (data: any) => {
    try {
      await adminCRUDService.update('products_master', selectedProduct.id, data, selectedProduct);
      setShowEditModal(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      await adminCRUDService.softDelete('products_master', selectedProduct.id);
      setShowDeleteModal(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleBulkActivate = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('products_master', ids, { is_active: true });
      loadProducts();
    } catch (error) {
      console.error('Error bulk activating:', error);
    }
  };

  const handleBulkDeactivate = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('products_master', ids, { is_active: false });
      loadProducts();
    } catch (error) {
      console.error('Error bulk deactivating:', error);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'product_name',
      label: 'Product Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.generic_name && (
            <div className="text-sm text-gray-500">{row.generic_name}</div>
          )}
          {row.din_number && (
            <div className="text-xs text-gray-400">DIN: {row.din_number}</div>
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
      key: 'dosage_form',
      label: 'Form',
      sortable: true,
    },
    {
      key: 'strength',
      label: 'Strength',
      sortable: true,
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      sortable: true,
    },
    {
      key: 'suggested_retail_price_cents',
      label: 'Retail Price',
      render: (value) => value ? `$${(value / 100).toFixed(2)}` : 'N/A',
    },
    {
      key: 'requires_prescription',
      label: 'Type',
      render: (value) => (
        <AdminStatusBadge
          status={value ? 'Rx' : 'OTC'}
          variant={value ? 'warning' : 'info'}
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
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedProduct(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedProduct(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedProduct(row);
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
    { name: 'product_name', label: 'Product Name', type: 'text', required: true },
    { name: 'generic_name', label: 'Generic Name', type: 'text' },
    { name: 'brand_name', label: 'Brand Name', type: 'text' },
    { name: 'din_number', label: 'DIN Number', type: 'text' },
    { name: 'ndc_code', label: 'NDC Code', type: 'text' },
    { name: 'upc_code', label: 'UPC Code', type: 'text' },
    { name: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Analgesics', label: 'Analgesics' },
      { value: 'Antibiotics', label: 'Antibiotics' },
      { value: 'Antihypertensives', label: 'Antihypertensives' },
      { value: 'Antidiabetics', label: 'Antidiabetics' },
      { value: 'Vitamins & Supplements', label: 'Vitamins & Supplements' },
      { value: 'Over-the-Counter', label: 'Over-the-Counter' },
      { value: 'Medical Supplies', label: 'Medical Supplies' },
      { value: 'Personal Care', label: 'Personal Care' },
    ]},
    { name: 'subcategory', label: 'Subcategory', type: 'text' },
    { name: 'dosage_form', label: 'Dosage Form', type: 'select', options: [
      { value: '', label: 'Select Form' },
      { value: 'Tablet', label: 'Tablet' },
      { value: 'Capsule', label: 'Capsule' },
      { value: 'Liquid', label: 'Liquid' },
      { value: 'Injection', label: 'Injection' },
      { value: 'Cream', label: 'Cream' },
      { value: 'Ointment', label: 'Ointment' },
      { value: 'Inhaler', label: 'Inhaler' },
      { value: 'Patch', label: 'Patch' },
    ]},
    { name: 'strength', label: 'Strength', type: 'text' },
    { name: 'unit_size', label: 'Unit Size', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { name: 'drug_class', label: 'Drug Class', type: 'text' },
    { name: 'therapeutic_category', label: 'Therapeutic Category', type: 'text' },
    { name: 'suggested_retail_price_cents', label: 'Suggested Retail Price (cents)', type: 'number' },
    { name: 'wholesale_price_cents', label: 'Wholesale Price (cents)', type: 'number' },
    { name: 'manufacturer_price_cents', label: 'Manufacturer Price (cents)', type: 'number' },
    { name: 'reorder_level', label: 'Reorder Level', type: 'number', defaultValue: 10 },
    { name: 'reorder_quantity', label: 'Reorder Quantity', type: 'number', defaultValue: 50 },
    { name: 'storage_instructions', label: 'Storage Instructions', type: 'textarea', rows: 2 },
    { name: 'requires_prescription', label: 'Requires Prescription', type: 'checkbox', defaultValue: true },
    { name: 'is_controlled_substance', label: 'Controlled Substance', type: 'checkbox', defaultValue: false },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    { name: 'is_featured', label: 'Featured Product', type: 'checkbox', defaultValue: false },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Product Management"
        description="Manage master catalog of medications and products for pharmacies"
        icon={<Package size={32} className="text-green-500" />}
        data={products}
        columns={columns}
        loading={loading}
        onRefresh={loadProducts}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedProduct(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, DIN, NDC, manufacturer..."
        createButtonLabel="Add Product"
        emptyMessage="No products found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Product"
        fields={formFields}
        onSubmit={handleCreateProduct}
        submitLabel="Create Product"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        title="Edit Product"
        fields={formFields.map(field => ({
          ...field,
          defaultValue: selectedProduct?.[field.name],
        }))}
        onSubmit={handleUpdateProduct}
        submitLabel="Update Product"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product? Pharmacies will no longer be able to add it to their inventory."
        itemName={selectedProduct?.product_name}
      />

      {selectedProduct && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedProduct(null);
          }}
          title={selectedProduct.product_name}
          subtitle={selectedProduct.generic_name}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Product Information</h4>
                    <p><strong>Brand Name:</strong> {selectedProduct.brand_name || 'N/A'}</p>
                    <p><strong>Generic Name:</strong> {selectedProduct.generic_name || 'N/A'}</p>
                    <p><strong>DIN:</strong> {selectedProduct.din_number || 'N/A'}</p>
                    <p><strong>Category:</strong> {selectedProduct.category}</p>
                    <p><strong>Manufacturer:</strong> {selectedProduct.manufacturer || 'N/A'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Form & Strength</h4>
                    <p><strong>Dosage Form:</strong> {selectedProduct.dosage_form || 'N/A'}</p>
                    <p><strong>Strength:</strong> {selectedProduct.strength || 'N/A'}</p>
                    <p><strong>Unit Size:</strong> {selectedProduct.unit_size || 'N/A'}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'pricing',
              label: 'Pricing',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Price Guidance</h4>
                    <p><strong>Retail:</strong> ${selectedProduct.suggested_retail_price_cents ? (selectedProduct.suggested_retail_price_cents / 100).toFixed(2) : 'N/A'}</p>
                    <p><strong>Wholesale:</strong> ${selectedProduct.wholesale_price_cents ? (selectedProduct.wholesale_price_cents / 100).toFixed(2) : 'N/A'}</p>
                    <p><strong>Manufacturer:</strong> ${selectedProduct.manufacturer_price_cents ? (selectedProduct.manufacturer_price_cents / 100).toFixed(2) : 'N/A'}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'inventory',
              label: 'Inventory Settings',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Reorder Settings</h4>
                    <p><strong>Reorder Level:</strong> {selectedProduct.reorder_level}</p>
                    <p><strong>Reorder Quantity:</strong> {selectedProduct.reorder_quantity}</p>
                    <p><strong>Storage:</strong> {selectedProduct.storage_instructions || 'N/A'}</p>
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
