import { useState, useEffect } from 'react';
import { MessageSquareQuote, CreditCard as Edit, Trash2, Star } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { cmsService, CMSTestimonial } from '../../../../../services/cmsService';

export default function CMSTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<CMSTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<CMSTestimonial | null>(null);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    setLoading(true);
    const data = await cmsService.getTestimonials();
    setTestimonials(data);
    setLoading(false);
  };

  const handleCreateTestimonial = async (data: any) => {
    await cmsService.createTestimonial(data);
    setShowCreateModal(false);
    loadTestimonials();
  };

  const handleUpdateTestimonial = async (data: any) => {
    if (!selectedTestimonial) return;
    await cmsService.updateTestimonial(selectedTestimonial.id, data);
    setShowEditModal(false);
    setSelectedTestimonial(null);
    loadTestimonials();
  };

  const handleDeleteTestimonial = async () => {
    if (!selectedTestimonial) return;
    await cmsService.deleteTestimonial(selectedTestimonial.id);
    setShowDeleteModal(false);
    setSelectedTestimonial(null);
    loadTestimonials();
  };

  const columns: TableColumn[] = [
    {
      key: 'author_name',
      label: 'Author',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.author_location}</div>
        </div>
      ),
    },
    {
      key: 'content',
      label: 'Content',
      render: (value) => (
        <div className="max-w-md truncate">{value}</div>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => (
        <div className="flex items-center gap-1">
          {Array.from({ length: value }).map((_, i) => (
            <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
          approved: { label: 'Approved', variant: 'success' },
          pending: { label: 'Pending', variant: 'warning' },
          rejected: { label: 'Rejected', variant: 'danger' },
        };
        const config = statusMap[value] || statusMap.pending;
        return <AdminStatusBadge status={config.label} variant={config.variant} />;
      },
    },
    {
      key: 'is_featured',
      label: 'Featured',
      render: (value) => (value ? '⭐' : ''),
    },
    {
      key: 'is_verified',
      label: 'Verified',
      render: (value) => (value ? '✓' : ''),
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedTestimonial(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedTestimonial(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const formFields: FormField[] = [
    { name: 'author_name', label: 'Author Name', type: 'text', required: true },
    { name: 'author_title', label: 'Author Title/Role', type: 'text' },
    { name: 'author_location', label: 'Location', type: 'text' },
    { name: 'author_image_url', label: 'Author Image URL', type: 'text' },
    { name: 'content', label: 'Testimonial Content', type: 'textarea', rows: 4, required: true },
    {
      name: 'rating',
      label: 'Rating',
      type: 'select',
      required: true,
      options: [
        { value: '5', label: '5 Stars' },
        { value: '4', label: '4 Stars' },
        { value: '3', label: '3 Stars' },
        { value: '2', label: '2 Stars' },
        { value: '1', label: '1 Star' },
      ],
      defaultValue: '5',
    },
    { name: 'category', label: 'Category', type: 'text' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
      defaultValue: 'pending',
    },
    { name: 'is_featured', label: 'Featured', type: 'checkbox', defaultValue: false },
    { name: 'is_verified', label: 'Verified', type: 'checkbox', defaultValue: false },
    { name: 'source', label: 'Source', type: 'text' },
    { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Testimonials Management"
        description="Manage customer testimonials and reviews"
        icon={<MessageSquareQuote size={32} className="text-teal-500" />}
        data={testimonials}
        columns={columns}
        loading={loading}
        onRefresh={loadTestimonials}
        onCreate={() => setShowCreateModal(true)}
        actions={actions}
        searchPlaceholder="Search by author name..."
        createButtonLabel="Add Testimonial"
        emptyMessage="No testimonials found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Testimonial"
        fields={formFields}
        onSubmit={handleCreateTestimonial}
        submitLabel="Create Testimonial"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTestimonial(null);
        }}
        title="Edit Testimonial"
        fields={formFields.map((field) => ({
          ...field,
          defaultValue: selectedTestimonial?.[field.name as keyof CMSTestimonial],
        }))}
        onSubmit={handleUpdateTestimonial}
        submitLabel="Update Testimonial"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTestimonial(null);
        }}
        onConfirm={handleDeleteTestimonial}
        title="Delete Testimonial"
        message="Are you sure you want to delete this testimonial?"
        itemName={selectedTestimonial?.author_name}
      />
    </>
  );
}
