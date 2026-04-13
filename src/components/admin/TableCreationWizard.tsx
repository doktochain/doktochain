import { useState } from 'react';
import { X, Plus, Trash2, ArrowLeft, ArrowRight, Check, Database, Columns, Shield, Eye } from 'lucide-react';
import { customTableService, type ColumnDefinition, type TablePermission, type CustomTableSchema } from '../../services/customTableService';

interface TableCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: CustomTableSchema;
}

const ICONS = [
  'Database', 'Table', 'FileText', 'Users', 'Package', 'Heart', 'Activity',
  'Calendar', 'Clipboard', 'FileCheck', 'Folder', 'Settings', 'Shield'
];

const COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Gray', value: '#6b7280' }
];

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'timestamptz', label: 'Timestamp' },
  { value: 'uuid', label: 'UUID' },
  { value: 'jsonb', label: 'JSON' }
];

const UI_INPUT_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number Input' },
  { value: 'email', label: 'Email Input' },
  { value: 'tel', label: 'Phone Input' },
  { value: 'date', label: 'Date Picker' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Dropdown' }
];

const CATEGORIES = [
  'General', 'HR', 'Clinical', 'Operations', 'Finance', 'Marketing', 'IT', 'Other'
];

export default function TableCreationWizard({ isOpen, onClose, onSuccess, template }: TableCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tableInfo, setTableInfo] = useState({
    table_name: template?.table_name || '',
    display_name: template?.display_name || '',
    description: template?.description || '',
    icon: template?.icon || 'Database',
    color: template?.color || '#6366f1',
    category: template?.category || 'general'
  });

  const [columns, setColumns] = useState<ColumnDefinition[]>(
    template?.columns || [
      {
        column_name: '',
        display_label: '',
        data_type: 'text',
        is_required: false,
        is_unique: false,
        default_value: '',
        validation_rules: {},
        ui_input_type: 'text',
        help_text: '',
        column_order: 1,
        is_visible: true
      }
    ]
  );

  const [permissions, setPermissions] = useState<TablePermission[]>(
    template?.permissions || [
      { role_name: 'admin', can_view: true, can_create: true, can_update: true, can_delete: true }
    ]
  );

  const totalSteps = 5;

  const handleTableNameChange = (value: string) => {
    const snakeCaseName = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    setTableInfo({ ...tableInfo, table_name: snakeCaseName, display_name: value });
  };

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        column_name: '',
        display_label: '',
        data_type: 'text',
        is_required: false,
        is_unique: false,
        default_value: '',
        validation_rules: {},
        ui_input_type: 'text',
        help_text: '',
        column_order: columns.length + 1,
        is_visible: true
      }
    ]);
  };

  const removeColumn = (index: number) => {
    if (columns.length > 1) {
      setColumns(columns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: any) => {
    const newColumns = [...columns];
    newColumns[index] = { ...newColumns[index], [field]: value };

    if (field === 'display_label') {
      const snakeCaseName = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      newColumns[index].column_name = snakeCaseName;
    }

    setColumns(newColumns);
  };

  const updatePermission = (roleName: string, field: keyof TablePermission, value: any) => {
    const existingIndex = permissions.findIndex(p => p.role_name === roleName);

    if (existingIndex >= 0) {
      const newPermissions = [...permissions];
      newPermissions[existingIndex] = { ...newPermissions[existingIndex], [field]: value };
      setPermissions(newPermissions);
    } else {
      setPermissions([
        ...permissions,
        {
          role_name: roleName,
          can_view: field === 'can_view' ? value : false,
          can_create: field === 'can_create' ? value : false,
          can_update: field === 'can_update' ? value : false,
          can_delete: field === 'can_delete' ? value : false
        }
      ]);
    }
  };

  const getPermission = (roleName: string): TablePermission | undefined => {
    return permissions.find(p => p.role_name === roleName);
  };

  const handleNext = () => {
    setError(null);

    if (step === 1) {
      if (!tableInfo.table_name || !tableInfo.display_name) {
        setError('Please fill in all required fields');
        return;
      }
    }

    if (step === 2) {
      const hasEmptyColumns = columns.some(col => !col.column_name || !col.display_label);
      if (hasEmptyColumns) {
        setError('Please fill in all column fields');
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const schema: CustomTableSchema = {
        ...tableInfo,
        columns: columns.map((col, index) => ({ ...col, column_order: index + 1 })),
        permissions: permissions.filter(p => p.can_view || p.can_create || p.can_update || p.can_delete)
      };

      const result = await customTableService.createTable(schema);

      if (!result.success) {
        setError(result.error || 'Failed to create table');
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create Custom Table</h2>
              <p className="text-sm text-gray-600">Step {step} of {totalSteps}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full mx-1 ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Basic Info</span>
            <span>Columns</span>
            <span>Standard</span>
            <span>Permissions</span>
            <span>Review</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tableInfo.display_name}
                  onChange={(e) => handleTableNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Staff Directory"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Database name: {tableInfo.table_name || 'will_be_generated'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={tableInfo.description}
                  onChange={(e) => setTableInfo({ ...tableInfo, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What is this table used for?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={tableInfo.category}
                  onChange={(e) => setTableInfo({ ...tableInfo, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setTableInfo({ ...tableInfo, icon })}
                        className={`p-3 border-2 rounded-lg flex items-center justify-center ${
                          tableInfo.icon === icon
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-lg">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setTableInfo({ ...tableInfo, color: color.value })}
                        className={`p-3 border-2 rounded-lg flex items-center justify-center ${
                          tableInfo.color === color.value
                            ? 'border-gray-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {tableInfo.color === color.value && (
                          <Check size={16} className="text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Definition */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Columns className="text-blue-600" size={20} />
                  <h3 className="text-lg font-semibold text-gray-900">Define Columns</h3>
                </div>
                <button
                  onClick={addColumn}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={16} />
                  <span>Add Column</span>
                </button>
              </div>

              <div className="space-y-4">
                {columns.map((column, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Column {index + 1}</span>
                      {columns.length > 1 && (
                        <button
                          onClick={() => removeColumn(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Display Label <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={column.display_label}
                          onChange={(e) => updateColumn(index, 'display_label', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Full Name"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Data Type
                        </label>
                        <select
                          value={column.data_type}
                          onChange={(e) => updateColumn(index, 'data_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {DATA_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Input Type
                        </label>
                        <select
                          value={column.ui_input_type}
                          onChange={(e) => updateColumn(index, 'ui_input_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {UI_INPUT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Default Value
                        </label>
                        <input
                          type="text"
                          value={column.default_value || ''}
                          onChange={(e) => updateColumn(index, 'default_value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="Optional"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Help Text
                        </label>
                        <input
                          type="text"
                          value={column.help_text || ''}
                          onChange={(e) => updateColumn(index, 'help_text', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="Helper text for users"
                        />
                      </div>

                      <div className="col-span-2 flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={column.is_required}
                            onChange={(e) => updateColumn(index, 'is_required', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={column.is_unique}
                            onChange={(e) => updateColumn(index, 'is_unique', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Unique</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={column.is_visible}
                            onChange={(e) => updateColumn(index, 'is_visible', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Visible</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Standard Columns */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Standard Columns</h3>
              </div>

              <p className="text-gray-600 mb-4">
                These standard columns will be automatically added to your table for consistency and best practices.
              </p>

              <div className="space-y-3">
                {[
                  { name: 'id', type: 'uuid', desc: 'Unique identifier (Primary Key)' },
                  { name: 'created_at', type: 'timestamptz', desc: 'When the record was created' },
                  { name: 'updated_at', type: 'timestamptz', desc: 'When the record was last updated' },
                  { name: 'deleted_at', type: 'timestamptz', desc: 'For soft deletes (nullable)' },
                  { name: 'created_by', type: 'uuid', desc: 'User who created the record' }
                ].map((col) => (
                  <div key={col.name} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-semibold text-gray-900">{col.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{col.type}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{col.desc}</p>
                      </div>
                      <Check className="text-green-600" size={20} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  These columns follow database best practices and enable features like audit trails, soft deletes, and user tracking.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Permissions */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Access Permissions</h3>
              </div>

              <p className="text-gray-600 mb-4">
                Configure which user roles can access this table. Row Level Security policies will be automatically created.
              </p>

              <div className="space-y-3">
                {['admin', 'provider', 'pharmacy', 'patient'].map((role) => {
                  const perm = getPermission(role);
                  return (
                    <div key={role} className="p-4 border border-gray-200 rounded-lg">
                      <div className="font-medium text-gray-900 mb-3 capitalize">{role}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={perm?.can_view || false}
                            onChange={(e) => updatePermission(role, 'can_view', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">View</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={perm?.can_create || false}
                            onChange={(e) => updatePermission(role, 'can_create', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Create</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={perm?.can_update || false}
                            onChange={(e) => updatePermission(role, 'can_update', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Update</span>
                        </label>

                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={perm?.can_delete || false}
                            onChange={(e) => updatePermission(role, 'can_delete', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Delete</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="text-blue-600" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">Review & Create</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Table Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">Display Name:</div>
                    <div className="font-medium">{tableInfo.display_name}</div>
                    <div className="text-gray-600">Database Name:</div>
                    <div className="font-mono text-xs">{tableInfo.table_name}</div>
                    <div className="text-gray-600">Category:</div>
                    <div className="capitalize">{tableInfo.category}</div>
                    <div className="text-gray-600">Description:</div>
                    <div>{tableInfo.description || 'N/A'}</div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Columns ({columns.length + 5})</h4>
                  <div className="space-y-1 text-sm">
                    {columns.map((col, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-mono text-xs">{col.column_name}</span>
                        <span className="text-gray-600">{col.data_type}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-300 text-gray-500">
                      + 5 standard columns (id, created_at, updated_at, deleted_at, created_by)
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Permissions</h4>
                  <div className="space-y-1 text-sm">
                    {permissions
                      .filter(p => p.can_view || p.can_create || p.can_update || p.can_delete)
                      .map((perm) => (
                        <div key={perm.role_name} className="capitalize">
                          <span className="font-medium">{perm.role_name}:</span>{' '}
                          {[
                            perm.can_view && 'View',
                            perm.can_create && 'Create',
                            perm.can_update && 'Update',
                            perm.can_delete && 'Delete'
                          ].filter(Boolean).join(', ')}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Your table is ready to be created. Row Level Security policies and real-time subscriptions will be automatically configured.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              {step > 1 && <ArrowLeft size={16} />}
              <span>{step === 1 ? 'Cancel' : 'Back'}</span>
            </div>
          </button>

          <button
            onClick={step === totalSteps ? handleSubmit : handleNext}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <span>{step === totalSteps ? 'Create Table' : 'Next'}</span>
                {step < totalSteps && <ArrowRight size={16} />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
