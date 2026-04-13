import { useState, useEffect } from 'react';
import { FileText, Edit, Trash2, Eye, Plus } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { cmsService, CMSPage } from '../../../../../services/cmsService';

export default function CMSPagesPage() {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState<CMSPage | null>(null);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    const data = await cmsService.getPages();
    setPages(data);
    setLoading(false);
  };

  const handleCreatePage = async (data: any) => {
    const slug = data.slug || cmsService.generateSlug(data.title);
    await cmsService.createPage({ ...data, slug });
    setShowCreateModal(false);
    loadPages();
  };

  const handleUpdatePage = async (data: any) => {
    if (!selectedPage) return;
    await cmsService.updatePage(selectedPage.id, data);
    setShowEditModal(false);
    setSelectedPage(null);
    loadPages();
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;
    await cmsService.deletePage(selectedPage.id);
    setShowDeleteModal(false);
    setSelectedPage(null);
    loadPages();
  };

  const columns: TableColumn[] = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">/{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'template',
      label: 'Template',
      sortable: true,
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
      key: 'is_homepage',
      label: 'Homepage',
      render: (value) => (value ? '✓' : ''),
    },
    {
      key: 'show_in_nav',
      label: 'In Nav',
      render: (value) => (value ? '✓' : ''),
    },
    {
      key: 'views_count',
      label: 'Views',
      sortable: true,
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
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedPage(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedPage(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const formFields: FormField[] = [
    { name: 'title', label: 'Page Title', type: 'text', required: true },
    { name: 'slug', label: 'URL Slug', type: 'text', placeholder: 'auto-generated if empty' },
    { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2 },
    { name: 'content', label: 'Page Content', type: 'textarea', rows: 10 },
    { name: 'featured_image_url', label: 'Featured Image URL', type: 'text' },
    {
      name: 'template',
      label: 'Template',
      type: 'select',
      required: true,
      options: [
        { value: 'default', label: 'Default' },
        { value: 'landing', label: 'Landing Page' },
        { value: 'fullwidth', label: 'Full Width' },
      ],
      defaultValue: 'default',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
      ],
      defaultValue: 'draft',
    },
    { name: 'meta_title', label: 'Meta Title (SEO)', type: 'text' },
    { name: 'meta_description', label: 'Meta Description (SEO)', type: 'textarea', rows: 2 },
    { name: 'is_homepage', label: 'Set as Homepage', type: 'checkbox', defaultValue: false },
    { name: 'show_in_nav', label: 'Show in Navigation', type: 'checkbox', defaultValue: true },
    { name: 'nav_label', label: 'Navigation Label', type: 'text' },
    { name: 'display_order', label: 'Display Order', type: 'number', defaultValue: 0 },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Pages Management"
        description="Create and manage website pages with SEO and content"
        icon={<FileText size={32} className="text-blue-500" />}
        data={pages}
        columns={columns}
        loading={loading}
        onRefresh={loadPages}
        onCreate={() => setShowCreateModal(true)}
        actions={actions}
        searchPlaceholder="Search by title, slug..."
        createButtonLabel="Add Page"
        emptyMessage="No pages found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Page"
        fields={formFields}
        onSubmit={handleCreatePage}
        submitLabel="Create Page"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPage(null);
        }}
        title="Edit Page"
        fields={formFields.map((field) => ({
          ...field,
          defaultValue: selectedPage?.[field.name as keyof CMSPage],
        }))}
        onSubmit={handleUpdatePage}
        submitLabel="Update Page"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedPage(null);
        }}
        onConfirm={handleDeletePage}
        title="Delete Page"
        message="Are you sure you want to delete this page?"
        itemName={selectedPage?.title}
      />
    </>
  );
}
