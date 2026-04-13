import { useState, useEffect } from 'react';
import { BookOpen, Edit, Trash2 } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { cmsService, CMSBlog } from '../../../../../services/cmsService';

export default function CMSBlogsPage() {
  const [blogs, setBlogs] = useState<CMSBlog[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<CMSBlog | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [blogsData, categoriesData] = await Promise.all([
      cmsService.getBlogs(),
      cmsService.getFAQCategories(),
    ]);
    setBlogs(blogsData);
    setCategories(categoriesData);
    setLoading(false);
  };

  const handleCreateBlog = async (data: any) => {
    const slug = data.slug || cmsService.generateSlug(data.title);
    await cmsService.createBlog({ ...data, slug });
    setShowCreateModal(false);
    loadData();
  };

  const handleUpdateBlog = async (data: any) => {
    if (!selectedBlog) return;
    await cmsService.updateBlog(selectedBlog.id, data);
    setShowEditModal(false);
    setSelectedBlog(null);
    loadData();
  };

  const handleDeleteBlog = async () => {
    if (!selectedBlog) return;
    await cmsService.deleteBlog(selectedBlog.id);
    setShowDeleteModal(false);
    setSelectedBlog(null);
    loadData();
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
      key: 'is_featured',
      label: 'Featured',
      render: (value) => (value ? '⭐' : ''),
    },
    {
      key: 'views_count',
      label: 'Views',
      sortable: true,
    },
    {
      key: 'reading_time_minutes',
      label: 'Read Time',
      render: (value) => (value ? `${value} min` : 'N/A'),
    },
    {
      key: 'published_at',
      label: 'Published',
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'Not published'),
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedBlog(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedBlog(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const formFields: FormField[] = [
    { name: 'title', label: 'Blog Title', type: 'text', required: true },
    { name: 'slug', label: 'URL Slug', type: 'text', placeholder: 'auto-generated if empty' },
    { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2 },
    { name: 'content', label: 'Blog Content', type: 'textarea', rows: 15, required: true },
    { name: 'featured_image_url', label: 'Featured Image URL', type: 'text' },
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
    { name: 'is_featured', label: 'Featured Post', type: 'checkbox', defaultValue: false },
    { name: 'allow_comments', label: 'Allow Comments', type: 'checkbox', defaultValue: true },
    { name: 'reading_time_minutes', label: 'Reading Time (minutes)', type: 'number' },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Blog Management"
        description="Create and manage blog posts with categories and tags"
        icon={<BookOpen size={32} className="text-green-500" />}
        data={blogs}
        columns={columns}
        loading={loading}
        onRefresh={loadData}
        onCreate={() => setShowCreateModal(true)}
        actions={actions}
        searchPlaceholder="Search by title..."
        createButtonLabel="Add Blog Post"
        emptyMessage="No blog posts found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Blog Post"
        fields={formFields}
        onSubmit={handleCreateBlog}
        submitLabel="Create Post"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBlog(null);
        }}
        title="Edit Blog Post"
        fields={formFields.map((field) => ({
          ...field,
          defaultValue: selectedBlog?.[field.name as keyof CMSBlog],
        }))}
        onSubmit={handleUpdateBlog}
        submitLabel="Update Post"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedBlog(null);
        }}
        onConfirm={handleDeleteBlog}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post?"
        itemName={selectedBlog?.title}
      />
    </>
  );
}
