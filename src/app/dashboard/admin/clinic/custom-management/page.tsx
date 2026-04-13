import { useState, useEffect } from 'react';
import { Settings, Plus, CreditCard as Edit, Trash2, Eye, Database, Table as TableIcon, Archive, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../../lib/supabase';
import { ConfirmDialog } from '../../../../../components/ui/confirm-dialog';
import TableCreationWizard from '../../../../../components/admin/TableCreationWizard';
import { customTableService, type ColumnDefinition } from '../../../../../services/customTableService';

interface TableInfo {
  table_name: string;
  row_count: number;
  display_name?: string;
  icon?: string;
  color?: string;
  is_custom?: boolean;
}

interface ColumnInfo {
  column_name: string;
  display_label?: string;
  data_type: string;
  is_nullable: string;
  ui_input_type?: string;
  help_text?: string;
  is_required?: boolean;
}

export default function CustomManagementPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [tableMetadata, setTableMetadata] = useState<any>(null);

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableData();
      loadTableColumns();

      // Set up real-time subscription for the selected table
      const tableChannel = supabase
        .channel(`${selectedTable}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: selectedTable,
          },
          (payload) => {
            console.log(`${selectedTable} change detected:`, payload);
            loadTableData();
          }
        )
        .subscribe();

      // Cleanup subscription when table changes or component unmounts
      return () => {
        supabase.removeChannel(tableChannel);
      };
    }
  }, [selectedTable]);

  const loadTables = async () => {
    try {
      const customTables = await customTableService.listCustomTables();

      const customTableInfos: TableInfo[] = customTables
        .filter(t => t.status === 'active')
        .map(t => ({
          table_name: t.table_name,
          row_count: 0,
          display_name: t.display_name,
          icon: t.icon,
          color: t.color,
          is_custom: true
        }));

      const { data, error } = await supabase
        .rpc('get_table_list', {});

      if (error) throw error;

      const systemTables = (data || []).map((t: any) => ({
        ...t,
        is_custom: false
      }));

      setTables([...customTableInfos, ...systemTables]);
    } catch (error) {
      console.error('Error loading tables:', error);
      const commonTables = [
        { table_name: 'medical_services', row_count: 0, is_custom: false },
        { table_name: 'clinic_locations', row_count: 0, is_custom: false },
        { table_name: 'specialties_master', row_count: 0, is_custom: false },
        { table_name: 'procedure_codes', row_count: 0, is_custom: false },
      ];
      setTables(commonTables);
    }
  };

  const loadTableColumns = async () => {
    if (!selectedTable) return;

    try {
      const metadata = await customTableService.getTableByName(selectedTable);

      if (metadata) {
        setTableMetadata(metadata);
        const cols: ColumnInfo[] = metadata.columns.map((col: ColumnDefinition) => ({
          column_name: col.column_name,
          display_label: col.display_label,
          data_type: col.data_type,
          is_nullable: col.is_required ? 'NO' : 'YES',
          ui_input_type: col.ui_input_type,
          help_text: col.help_text,
          is_required: col.is_required
        }));
        setColumns(cols);
      } else {
        setTableMetadata(null);
        const { data, error } = await supabase
          .from(selectedTable)
          .select('*')
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const cols = Object.keys(data[0]).map(key => ({
            column_name: key,
            data_type: typeof data[0][key],
            is_nullable: 'YES'
          }));
          setColumns(cols);
        }
      }
    } catch (error) {
      console.error('Error loading columns:', error);
    }
  };

  const loadTableData = async () => {
    if (!selectedTable) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from(selectedTable)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTableData(data || []);
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTable) return;

    try {
      const { error } = await supabase
        .from(selectedTable)
        .insert(formData);

      if (error) throw error;

      setShowCreateModal(false);
      setFormData({});
      loadTableData();
    } catch (error) {
      console.error('Error creating record:', error);
      toast.error('Error creating record. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedTable) return;

    try {
      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadTableData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Error deleting record. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Custom Management System</h1>
              <p className="text-gray-600">Create and manage any database table with flexible CRUD operations</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Copy size={20} />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>Create New Table</span>
            </button>
          </div>
        </div>

        {/* Table Selector */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Table to Manage
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a table...</option>
            {tables.map((table) => (
              <option key={table.table_name} value={table.table_name}>
                {table.is_custom && '⭐ '}
                {table.display_name || table.table_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {table.row_count > 0 && ` (${table.row_count} records)`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      {selectedTable && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Actions Bar */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedTable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadTableData}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={20} />
                <span>Add Record</span>
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading data...</p>
              </div>
            ) : tableData.length === 0 ? (
              <div className="text-center py-12">
                <Database className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">No records found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Add your first record
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.slice(0, 6).map((col) => (
                      <th
                        key={col.column_name}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {col.column_name.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-gray-50">
                      {columns.slice(0, 6).map((col) => (
                        <td key={col.column_name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {renderCellValue(row[col.column_name])}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setConfirmDeleteId(row.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Record</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {columns
                  .filter(col => !['id', 'created_at', 'updated_at', 'deleted_at', 'created_by'].includes(col.column_name))
                  .map((col) => (
                    <div key={col.column_name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {col.display_label || col.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {col.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {col.help_text && (
                        <p className="text-xs text-gray-500 mb-1">{col.help_text}</p>
                      )}
                      {renderFormField(col, formData, setFormData)}
                    </div>
                  ))}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title="Delete Record"
        description="Are you sure you want to delete this record?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteId) {
            handleDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
      />

      {/* Table Creation Wizard */}
      <TableCreationWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => {
          loadTables();
          setShowWizard(false);
        }}
      />

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Table Templates</h2>
                  <p className="text-sm text-gray-600">Choose a pre-built template to get started quickly</p>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customTableService.getCommonTableTemplates().map((template) => (
                  <div
                    key={template.table_name}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer group"
                    onClick={() => {
                      setShowTemplates(false);
                      setShowWizard(true);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: template.color + '20' }}
                      >
                        <span style={{ color: template.color }}>{template.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                          {template.display_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                          <span>{template.columns.length} columns</span>
                          <span>•</span>
                          <span className="capitalize">{template.category}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCellValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
  if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
  return String(value);
}

function renderFormField(col: ColumnInfo, formData: any, setFormData: (data: any) => void) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [col.column_name]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    });
  };

  const inputType = col.ui_input_type || 'text';

  if (inputType === 'checkbox' || col.data_type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={formData[col.column_name] || false}
        onChange={handleChange}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
    );
  }

  if (inputType === 'textarea' || col.column_name.includes('description') || col.column_name.includes('notes')) {
    return (
      <textarea
        value={formData[col.column_name] || ''}
        onChange={handleChange}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  }

  if (inputType === 'number' || col.data_type === 'integer' || col.data_type === 'decimal') {
    return (
      <input
        type="number"
        value={formData[col.column_name] || ''}
        onChange={handleChange}
        step={col.data_type === 'decimal' ? '0.01' : '1'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  }

  if (inputType === 'date' || col.data_type === 'date') {
    return (
      <input
        type="date"
        value={formData[col.column_name] || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  }

  if (inputType === 'email') {
    return (
      <input
        type="email"
        value={formData[col.column_name] || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  }

  if (inputType === 'tel') {
    return (
      <input
        type="tel"
        value={formData[col.column_name] || ''}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  }

  return (
    <input
      type="text"
      value={formData[col.column_name] || ''}
      onChange={handleChange}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}
