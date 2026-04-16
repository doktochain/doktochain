import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, CreditCard as Edit, Trash2, Eye } from 'lucide-react';
import AdminCRUDTemplate from '../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../components/admin/AdminDetailView';
import { TableColumn, TableAction } from '../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../components/admin/AdminBulkActions';
import { adminCRUDService } from '../../../../services/adminCRUDService';

const TEMPLATE_TYPE_OPTIONS = [
  { value: 'soap', label: 'SOAP' },
  { value: 'dap', label: 'DAP' },
  { value: 'birp', label: 'BIRP' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'progress', label: 'Progress' },
];

const DEFAULT_STRUCTURES: Record<string, any> = {
  soap: {
    sections: [
      { key: 'subjective', label: 'Subjective' },
      { key: 'objective', label: 'Objective' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ],
  },
  dap: {
    sections: [
      { key: 'data', label: 'Data' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ],
  },
  birp: {
    sections: [
      { key: 'behavior', label: 'Behavior' },
      { key: 'intervention', label: 'Intervention' },
      { key: 'response', label: 'Response' },
      { key: 'plan', label: 'Plan' },
    ],
  },
};

const TABLE = 'clinical_templates';

export default function AdminClinicalTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await adminCRUDService.getAll(TABLE);
      setTemplates(data);
    } catch (error: any) {
      console.error('Error loading clinical templates:', error);
      toast.error(`Failed to load templates: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseStructure = (raw: any) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const handleCreate = async (data: any) => {
    try {
      const structure =
        parseStructure(data.template_structure) ||
        DEFAULT_STRUCTURES[data.template_type] ||
        DEFAULT_STRUCTURES.soap;

      await adminCRUDService.create(TABLE, {
        template_name: data.template_name,
        template_type: data.template_type,
        specialty: data.specialty || null,
        description: data.description || null,
        template_structure: structure,
        is_system_template: true,
        is_active: data.is_active !== false,
        usage_count: 0,
      });

      setShowCreateModal(false);
      await loadTemplates();
      toast.success('Master template created');
    } catch (error: any) {
      console.error('Error creating template:', error);
      toast.error(`Failed to create template: ${error.message}`);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      const structure =
        parseStructure(data.template_structure) ||
        selectedTemplate?.template_structure ||
        DEFAULT_STRUCTURES[data.template_type] ||
        DEFAULT_STRUCTURES.soap;

      await adminCRUDService.update(
        TABLE,
        selectedTemplate.id,
        {
          template_name: data.template_name,
          template_type: data.template_type,
          specialty: data.specialty || null,
          description: data.description || null,
          template_structure: structure,
          is_active: data.is_active !== false,
        },
        selectedTemplate
      );

      setShowEditModal(false);
      setSelectedTemplate(null);
      await loadTemplates();
      toast.success('Master template updated');
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error(`Failed to update template: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    try {
      await adminCRUDService.softDelete(TABLE, selectedTemplate.id);
      setShowDeleteModal(false);
      setSelectedTemplate(null);
      await loadTemplates();
      toast.success('Template deleted');
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(`Failed to delete template: ${error.message}`);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete(TABLE, ids, true);
      await loadTemplates();
      toast.success('Templates deleted');
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      toast.error(`Failed to bulk delete: ${error.message}`);
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'template_name',
      label: 'Template Name',
      sortable: true,
      render: (value) => <div className="font-medium">{value}</div>,
    },
    {
      key: 'template_type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded uppercase">
          {value}
        </span>
      ),
    },
    {
      key: 'specialty',
      label: 'Specialty',
      render: (value) => value || '—',
    },
    {
      key: 'is_system_template',
      label: 'Master',
      render: (value) => (value ? 'Yes' : 'No'),
    },
    {
      key: 'usage_count',
      label: 'Usage',
      sortable: true,
      render: (value) => value || 0,
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedTemplate(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedTemplate(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedTemplate(row);
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
    { name: 'template_name', label: 'Template Name', type: 'text', required: true },
    {
      name: 'template_type',
      label: 'Type',
      type: 'select',
      required: true,
      options: TEMPLATE_TYPE_OPTIONS,
      defaultValue: 'soap',
    },
    { name: 'specialty', label: 'Specialty', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    {
      name: 'template_structure',
      label: 'Template Structure (JSON, optional)',
      type: 'textarea',
      rows: 6,
      helperText:
        'Provide JSON for sections, e.g. {"sections":[{"key":"subjective","label":"Subjective"}]}. Leave blank to use the default for the selected type.',
    },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Clinical Note Master Templates"
        description="Manage system-wide master templates for clinical notes (SOAP, DAP, BIRP, etc.)"
        icon={<FileText size={32} className="text-blue-500" />}
        data={templates}
        columns={columns}
        loading={loading}
        onRefresh={loadTemplates}
        onCreate={() => setShowCreateModal(true)}
        onRowClick={(row) => {
          setSelectedTemplate(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search templates..."
        createButtonLabel="Add Master Template"
        emptyMessage="No clinical templates found"
      />

      <AdminFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Master Template"
        fields={formFields}
        onSubmit={handleCreate}
        submitLabel="Create Template"
        size="lg"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTemplate(null);
        }}
        title="Edit Master Template"
        fields={formFields.map((field) => ({
          ...field,
          defaultValue:
            field.name === 'template_structure'
              ? selectedTemplate?.template_structure
                ? JSON.stringify(selectedTemplate.template_structure, null, 2)
                : ''
              : selectedTemplate?.[field.name] ?? field.defaultValue,
        }))}
        onSubmit={handleUpdate}
        submitLabel="Update Template"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTemplate(null);
        }}
        onConfirm={handleDelete}
        title="Delete Master Template"
        message="Are you sure you want to delete this master template?"
        itemName={selectedTemplate?.template_name}
      />

      {selectedTemplate && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedTemplate(null);
          }}
          title={selectedTemplate.template_name}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Type</h4>
                    <p className="uppercase">{selectedTemplate.template_type}</p>
                  </div>
                  {selectedTemplate.specialty && (
                    <div>
                      <h4 className="font-semibold mb-1">Specialty</h4>
                      <p>{selectedTemplate.specialty}</p>
                    </div>
                  )}
                  {selectedTemplate.description && (
                    <div>
                      <h4 className="font-semibold mb-1">Description</h4>
                      <p>{selectedTemplate.description}</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              id: 'structure',
              label: 'Structure',
              content: (
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                  {JSON.stringify(selectedTemplate.template_structure || {}, null, 2)}
                </pre>
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
