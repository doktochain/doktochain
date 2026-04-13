import { useState, useEffect } from 'react';
import { HelpCircle, Edit, Trash2 } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { cmsService, CMSFAQ, CMSFAQCategory } from '../../../../../services/cmsService';

export default function CMSFAQsPage() {
  const [faqs, setFaqs] = useState<CMSFAQ[]>([]);
  const [categories, setCategories] = useState<CMSFAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<CMSFAQ | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [faqsData, categoriesData] = await Promise.all([
      cmsService.getFAQs(),
      cmsService.getFAQCategories(),
    ]);
    setFaqs(faqsData);
    setCategories(categoriesData);
    setLoading(false);
  };

  const handleCreateFAQ = async (data: any) => {
    await cmsService.createFAQ(data);
    setShowCreateModal(false);
    loadData();
  };

  const handleUpdateFAQ = async (data: any) => {
    if (!selectedFAQ) return;
    await cmsService.updateFAQ(selectedFAQ.id, data);
    setShowEditModal(false);
    setSelectedFAQ(null);
    loadData();
  };

  const handleDeleteFAQ = async () => {
    if (!selectedFAQ) return;
    await cmsService.deleteFAQ(selectedFAQ.id);
    setShowDeleteModal(false);
    setSelectedFAQ(null);
    loadData();
  };

  const columns: TableColumn[] = [
    {
      key: 'question',
      label: 'Question',
      sortable: true,
      render: (value) => (
        <div className="max-w-md">{value}</div>
      ),
    },
    {
      key: 'answer',
      label: 'Answer',
      render: (value) => (
        <div className="max-w-md truncate">{value}</div>
      ),
    },
    {
      key: 'helpful_count',
      label: 'Helpful',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          👍 {value} / 👎 {row.not_helpful_count}
        </div>
      ),
    },
    {
      key: 'is_featured',
      label: 'Featured',
      render: (value) => (value ? '⭐' : ''),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <AdminStatusBadge
          status={value === 'published' ? 'Published' : 'Draft'}
          variant={value === 'published' ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'display_order',
      label: 'Order',
      sortable: true,
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedFAQ(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedFAQ(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const formFields: FormField[] = [
    {
      name: 'category_id',
      label: 'Category',
      type: 'select',
      options: categories.map((cat) => ({ value: cat.id, label: cat.name })),
    },
    { name: 'question', label: 'Question', type: 'text', required: true },
    { name: 'answer', label: 'Answer', type: 'textarea', rows: 4, required: true },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
      defaultValue: 'published',
    },
    { name: 'is_featured', label: 'Featured', type: 'checkbox', defaultValue: false },
    { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="FAQs Management"
        description="Manage frequently asked questions and categories"
        icon={<HelpCircle size={32} className="text-orange-500" />}
        data={faqs}
        columns={columns}
        loading={loading}
        onRefresh={loadData}
        onCreate={() => setShowCreateModal(true)}
        actions={actions}
        searchPlaceholder="Search by question..."
        createButtonLabel="Add FAQ"
        emptyMessage="No FAQs found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New FAQ"
        fields={formFields}
        onSubmit={handleCreateFAQ}
        submitLabel="Create FAQ"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedFAQ(null);
        }}
        title="Edit FAQ"
        fields={formFields.map((field) => ({
          ...field,
          defaultValue: selectedFAQ?.[field.name as keyof CMSFAQ],
        }))}
        onSubmit={handleUpdateFAQ}
        submitLabel="Update FAQ"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedFAQ(null);
        }}
        onConfirm={handleDeleteFAQ}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ?"
        itemName={selectedFAQ?.question}
      />
    </>
  );
}
