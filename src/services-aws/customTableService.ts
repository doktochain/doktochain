import { api } from '../lib/api-client';
import { isValidRoleName, sanitizeSqlIdentifier } from '../lib/security';

export interface ColumnDefinition {
  column_name: string;
  display_label: string;
  data_type: string;
  is_required: boolean;
  is_unique: boolean;
  default_value?: string;
  validation_rules?: Record<string, any>;
  ui_input_type: string;
  help_text?: string;
  column_order: number;
  is_visible: boolean;
  foreign_key_table?: string;
  foreign_key_column?: string;
}

export interface TablePermission {
  role_name: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface CustomTableSchema {
  table_name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  is_public?: boolean;
  columns: ColumnDefinition[];
  permissions: TablePermission[];
}

export interface CustomTable {
  id: string;
  table_name: string;
  display_name: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  status: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

class CustomTableService {
  async validateTableSchema(schema: CustomTableSchema): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!/^[a-z][a-z0-9_]*$/.test(schema.table_name)) {
      errors.push('Table name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores');
    }

    if (schema.table_name.length > 63) {
      errors.push('Table name cannot exceed 63 characters');
    }

    const reservedWords = ['user', 'group', 'order', 'table', 'column', 'index', 'primary', 'foreign'];
    if (reservedWords.includes(schema.table_name)) {
      errors.push('Table name cannot be a reserved SQL keyword');
    }

    const { data: existingTable } = await api.get<any>('/custom-tables-registry', {
      params: { table_name: schema.table_name, single: true },
    });

    if (existingTable) {
      errors.push('A table with this name already exists');
    }

    if (schema.columns.length === 0) {
      errors.push('Table must have at least one custom column');
    }

    const columnNames = new Set<string>();
    schema.columns.forEach((col, index) => {
      if (!/^[a-z][a-z0-9_]*$/.test(col.column_name)) {
        errors.push(`Column ${index + 1}: Column name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores`);
      }

      if (columnNames.has(col.column_name)) {
        errors.push(`Column ${index + 1}: Duplicate column name "${col.column_name}"`);
      }
      columnNames.add(col.column_name);

      if (reservedWords.includes(col.column_name)) {
        errors.push(`Column ${index + 1}: "${col.column_name}" is a reserved keyword`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  generateCreateTableSQL(schema: CustomTableSchema): string {
    const parts: string[] = [];
    const safeTable = sanitizeSqlIdentifier(schema.table_name);

    parts.push(`CREATE TABLE ${safeTable} (`);
    parts.push('  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),');

    const ALLOWED_DATA_TYPES = new Set([
      'text', 'integer', 'bigint', 'boolean', 'date', 'timestamptz',
      'numeric', 'uuid', 'jsonb', 'real', 'double precision',
    ]);

    schema.columns.forEach((col) => {
      const safeCol = sanitizeSqlIdentifier(col.column_name);
      const safeType = ALLOWED_DATA_TYPES.has(col.data_type) ? col.data_type : 'text';
      const constraints: string[] = [];

      if (col.is_required) {
        constraints.push('NOT NULL');
      }

      if (col.is_unique) {
        constraints.push('UNIQUE');
      }

      if (col.default_value) {
        const safeDefault = col.default_value.replace(/[;'"\\]/g, '');
        constraints.push(`DEFAULT ${safeDefault}`);
      }

      if (col.foreign_key_table && col.foreign_key_column) {
        const safeFkTable = sanitizeSqlIdentifier(col.foreign_key_table);
        const safeFkCol = sanitizeSqlIdentifier(col.foreign_key_column);
        constraints.push(`REFERENCES ${safeFkTable}(${safeFkCol})`);
      }

      const constraintStr = constraints.length > 0 ? ' ' + constraints.join(' ') : '';
      parts.push(`  ${safeCol} ${safeType}${constraintStr},`);
    });

    parts.push('  created_at timestamptz DEFAULT now(),');
    parts.push('  updated_at timestamptz DEFAULT now(),');
    parts.push('  deleted_at timestamptz,');
    parts.push('  created_by uuid REFERENCES auth.users(id)');
    parts.push(');');

    const sql = parts.join('\n');

    const indexSQL = `
CREATE INDEX idx_${safeTable}_created_at ON ${safeTable}(created_at DESC);
CREATE INDEX idx_${safeTable}_deleted_at ON ${safeTable}(deleted_at) WHERE deleted_at IS NOT NULL;`;

    return sql + '\n' + indexSQL;
  }

  generateRLSPolicies(tableName: string, permissions: TablePermission[]): string {
    const policies: string[] = [];
    const safeTable = sanitizeSqlIdentifier(tableName);

    policies.push(`ALTER TABLE ${safeTable} ENABLE ROW LEVEL SECURITY;`);
    policies.push('');

    permissions.forEach((perm) => {
      if (!isValidRoleName(perm.role_name)) return;

      const safeRole = sanitizeSqlIdentifier(perm.role_name);
      const roleCondition = safeRole === 'public'
        ? 'true'
        : `EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = '${safeRole}')`;

      if (perm.can_view) {
        policies.push(`CREATE POLICY "${safeRole}_can_view_${safeTable}"`);
        policies.push(`  ON ${safeTable} FOR SELECT`);
        policies.push(`  TO ${safeRole === 'public' ? 'anon' : 'authenticated'}`);
        policies.push(`  USING (${roleCondition});`);
        policies.push('');
      }

      if (perm.can_create) {
        policies.push(`CREATE POLICY "${safeRole}_can_create_${safeTable}"`);
        policies.push(`  ON ${safeTable} FOR INSERT`);
        policies.push(`  TO authenticated`);
        policies.push(`  WITH CHECK (${roleCondition});`);
        policies.push('');
      }

      if (perm.can_update) {
        policies.push(`CREATE POLICY "${safeRole}_can_update_${safeTable}"`);
        policies.push(`  ON ${safeTable} FOR UPDATE`);
        policies.push(`  TO authenticated`);
        policies.push(`  USING (${roleCondition})`);
        policies.push(`  WITH CHECK (${roleCondition});`);
        policies.push('');
      }

      if (perm.can_delete) {
        policies.push(`CREATE POLICY "${safeRole}_can_delete_${safeTable}"`);
        policies.push(`  ON ${safeTable} FOR DELETE`);
        policies.push(`  TO authenticated`);
        policies.push(`  USING (${roleCondition});`);
        policies.push('');
      }
    });

    return policies.join('\n');
  }

  async createTable(schema: CustomTableSchema): Promise<{ success: boolean; error?: string; tableId?: string }> {
    try {
      const validation = await this.validateTableSchema(schema);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }

      const { data: tableRegistry, error: registryError } = await api.post<any>('/custom-tables-registry', {
        table_name: schema.table_name,
        display_name: schema.display_name,
        description: schema.description,
        icon: schema.icon || 'Database',
        color: schema.color || '#6366f1',
        category: schema.category || 'general',
        is_public: schema.is_public || false,
        status: 'draft'
      });

      if (registryError) throw registryError;

      for (const column of schema.columns) {
        const { error: columnError } = await api.post('/custom-table-columns', {
          table_id: tableRegistry.id,
          ...column
        });

        if (columnError) throw columnError;
      }

      for (const permission of schema.permissions) {
        const { error: permError } = await api.post('/custom-table-permissions', {
          table_id: tableRegistry.id,
          ...permission
        });

        if (permError) throw permError;
      }

      const createTableSQL = this.generateCreateTableSQL(schema);
      const rlsPoliciesSQL = this.generateRLSPolicies(schema.table_name, schema.permissions);

      const fullSQL = createTableSQL + '\n\n' + rlsPoliciesSQL;

      const { data: result, error: ddlError } = await api.post<any>('/execute-ddl', {
        sql: fullSQL,
        table_id: tableRegistry.id
      });

      if (ddlError || !result?.success) {
        await api.post('/custom-table-audit-log', {
          table_id: tableRegistry.id,
          operation: 'create_table',
          sql_executed: fullSQL,
          success: false,
          error_message: ddlError?.message || result?.error,
        });

        return {
          success: false,
          error: ddlError?.message || result?.error
        };
      }

      await api.put(`/custom-tables-registry/${tableRegistry.id}`, {
        status: 'active',
      });

      await api.post('/custom-table-audit-log', {
        table_id: tableRegistry.id,
        operation: 'create_table',
        sql_executed: fullSQL,
        success: true,
      });

      return {
        success: true,
        tableId: tableRegistry.id
      };

    } catch (error: any) {
      console.error('Error creating custom table:', error);
      return {
        success: false,
        error: error.message || 'Failed to create table'
      };
    }
  }

  async listCustomTables(): Promise<CustomTable[]> {
    const { data, error } = await api.get<CustomTable[]>('/custom-tables-registry', {
      params: { deleted_at: 'null', order: 'created_at.desc' },
    });

    if (error) {
      console.error('Error listing custom tables:', error);
      return [];
    }

    return data || [];
  }

  async getTableMetadata(tableId: string): Promise<{ table: CustomTable; columns: ColumnDefinition[]; permissions: TablePermission[] } | null> {
    const { data: table, error: tableError } = await api.get<CustomTable>(`/custom-tables-registry/${tableId}`);

    if (tableError || !table) return null;

    const { data: columns } = await api.get<ColumnDefinition[]>('/custom-table-columns', {
      params: { table_id: tableId, order: 'column_order' },
    });

    const { data: permissions } = await api.get<TablePermission[]>('/custom-table-permissions', {
      params: { table_id: tableId },
    });

    return {
      table,
      columns: columns || [],
      permissions: permissions || []
    };
  }

  async getTableByName(tableName: string): Promise<{ table: CustomTable; columns: ColumnDefinition[]; permissions: TablePermission[] } | null> {
    const { data: table, error: tableError } = await api.get<CustomTable>('/custom-tables-registry', {
      params: { table_name: tableName, deleted_at: 'null', single: true },
    });

    if (tableError || !table) return null;

    const { data: columns } = await api.get<ColumnDefinition[]>('/custom-table-columns', {
      params: { table_id: table.id, order: 'column_order' },
    });

    const { data: permissions } = await api.get<TablePermission[]>('/custom-table-permissions', {
      params: { table_id: table.id },
    });

    return {
      table,
      columns: columns || [],
      permissions: permissions || []
    };
  }

  async archiveTable(tableId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await api.put(`/custom-tables-registry/${tableId}`, {
        status: 'archived',
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteTable(tableId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await api.put(`/custom-tables-registry/${tableId}`, {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAuditLog(tableId: string): Promise<any[]> {
    const { data, error } = await api.get<any[]>('/custom-table-audit-log', {
      params: { table_id: tableId, order: 'created_at.desc' },
    });

    if (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }

    return data || [];
  }

  getCommonTableTemplates(): CustomTableSchema[] {
    return [
      {
        table_name: 'staff_directory',
        display_name: 'Staff Directory',
        description: 'Manage staff members and their information',
        icon: 'Users',
        color: '#3b82f6',
        category: 'HR',
        columns: [
          {
            column_name: 'employee_id',
            display_label: 'Employee ID',
            data_type: 'text',
            is_required: true,
            is_unique: true,
            ui_input_type: 'text',
            column_order: 1,
            is_visible: true
          },
          {
            column_name: 'full_name',
            display_label: 'Full Name',
            data_type: 'text',
            is_required: true,
            is_unique: false,
            ui_input_type: 'text',
            column_order: 2,
            is_visible: true
          },
          {
            column_name: 'department',
            display_label: 'Department',
            data_type: 'text',
            is_required: false,
            is_unique: false,
            ui_input_type: 'text',
            column_order: 3,
            is_visible: true
          },
          {
            column_name: 'position',
            display_label: 'Position',
            data_type: 'text',
            is_required: false,
            is_unique: false,
            ui_input_type: 'text',
            column_order: 4,
            is_visible: true
          },
          {
            column_name: 'email',
            display_label: 'Email',
            data_type: 'text',
            is_required: true,
            is_unique: true,
            ui_input_type: 'email',
            column_order: 5,
            is_visible: true
          },
          {
            column_name: 'phone',
            display_label: 'Phone',
            data_type: 'text',
            is_required: false,
            is_unique: false,
            ui_input_type: 'tel',
            column_order: 6,
            is_visible: true
          },
          {
            column_name: 'hire_date',
            display_label: 'Hire Date',
            data_type: 'date',
            is_required: false,
            is_unique: false,
            ui_input_type: 'date',
            column_order: 7,
            is_visible: true
          },
          {
            column_name: 'is_active',
            display_label: 'Active',
            data_type: 'boolean',
            is_required: false,
            is_unique: false,
            default_value: 'true',
            ui_input_type: 'checkbox',
            column_order: 8,
            is_visible: true
          }
        ],
        permissions: [
          {
            role_name: 'admin',
            can_view: true,
            can_create: true,
            can_update: true,
            can_delete: true
          }
        ]
      },
      {
        table_name: 'equipment_inventory',
        display_name: 'Equipment Inventory',
        description: 'Track medical equipment and supplies',
        icon: 'Package',
        color: '#10b981',
        category: 'Operations',
        columns: [
          {
            column_name: 'equipment_name',
            display_label: 'Equipment Name',
            data_type: 'text',
            is_required: true,
            is_unique: false,
            ui_input_type: 'text',
            column_order: 1,
            is_visible: true
          },
          {
            column_name: 'equipment_id',
            display_label: 'Equipment ID',
            data_type: 'text',
            is_required: true,
            is_unique: true,
            ui_input_type: 'text',
            column_order: 2,
            is_visible: true
          },
          {
            column_name: 'category',
            display_label: 'Category',
            data_type: 'text',
            is_required: false,
            is_unique: false,
            ui_input_type: 'text',
            column_order: 3,
            is_visible: true
          },
          {
            column_name: 'quantity',
            display_label: 'Quantity',
            data_type: 'integer',
            is_required: true,
            is_unique: false,
            default_value: '1',
            ui_input_type: 'number',
            column_order: 4,
            is_visible: true
          },
          {
            column_name: 'location',
            display_label: 'Location',
            data_type: 'text',
            is_required: false,
            is_unique: false,
            ui_input_type: 'text',
            column_order: 5,
            is_visible: true
          },
          {
            column_name: 'purchase_date',
            display_label: 'Purchase Date',
            data_type: 'date',
            is_required: false,
            is_unique: false,
            ui_input_type: 'date',
            column_order: 6,
            is_visible: true
          },
          {
            column_name: 'maintenance_due',
            display_label: 'Maintenance Due',
            data_type: 'date',
            is_required: false,
            is_unique: false,
            ui_input_type: 'date',
            column_order: 7,
            is_visible: true
          },
          {
            column_name: 'status',
            display_label: 'Status',
            data_type: 'text',
            is_required: false,
            is_unique: false,
            default_value: "'available'",
            ui_input_type: 'text',
            column_order: 8,
            is_visible: true
          }
        ],
        permissions: [
          {
            role_name: 'admin',
            can_view: true,
            can_create: true,
            can_update: true,
            can_delete: true
          },
          {
            role_name: 'provider',
            can_view: true,
            can_create: false,
            can_update: false,
            can_delete: false
          }
        ]
      }
    ];
  }
}

export const customTableService = new CustomTableService();
