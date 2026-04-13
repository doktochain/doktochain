import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase');

const { customTableService } = await import('../customTableService');

function createThenableChain(resolveValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    then: (resolve: any) => resolve(resolveValue),
  };
  Object.keys(chain).forEach((key) => {
    if (key !== 'then') chain[key].mockReturnValue(chain);
  });
  return chain;
}

function baseColumn(overrides: Record<string, any> = {}) {
  return {
    column_name: 'test_col',
    display_label: 'Test',
    data_type: 'text',
    is_required: false,
    is_unique: false,
    ui_input_type: 'text',
    column_order: 1,
    is_visible: true,
    ...overrides,
  };
}

describe('customTableService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTableSchema', () => {
    function mockNoExistingTable() {
      const chain = createThenableChain({ data: null, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    }

    it('accepts a valid table name', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'patient_notes',
        display_name: 'Patient Notes',
        columns: [baseColumn()],
        permissions: [],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects table name starting with a number', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: '123table',
        display_name: 'Bad Table',
        columns: [baseColumn()],
        permissions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('lowercase letter');
    });

    it('rejects table name with uppercase letters', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'MyTable',
        display_name: 'My Table',
        columns: [baseColumn()],
        permissions: [],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects table name with special characters', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'my-table!',
        display_name: 'Bad',
        columns: [baseColumn()],
        permissions: [],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects table name exceeding 63 characters', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'a'.repeat(64),
        display_name: 'Long',
        columns: [baseColumn()],
        permissions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('63 characters'))).toBe(true);
    });

    it('rejects reserved SQL keywords as table names', async () => {
      mockNoExistingTable();
      const reservedWords = ['user', 'group', 'order', 'table', 'column', 'index', 'primary', 'foreign'];
      for (const word of reservedWords) {
        const result = await customTableService.validateTableSchema({
          table_name: word,
          display_name: word,
          columns: [baseColumn()],
          permissions: [],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.some((e: string) => e.includes('reserved'))).toBe(true);
      }
    });

    it('rejects duplicate column names', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'test_table',
        display_name: 'Test',
        columns: [
          baseColumn({ column_name: 'name', column_order: 1 }),
          baseColumn({ column_name: 'name', column_order: 2 }),
        ],
        permissions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('Duplicate'))).toBe(true);
    });

    it('rejects reserved keyword as column name', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'test_table',
        display_name: 'Test',
        columns: [baseColumn({ column_name: 'order' })],
        permissions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('reserved keyword'))).toBe(true);
    });

    it('rejects schema with no columns', async () => {
      mockNoExistingTable();
      const result = await customTableService.validateTableSchema({
        table_name: 'empty_table',
        display_name: 'Empty',
        columns: [],
        permissions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('at least one'))).toBe(true);
    });

    it('rejects when table already exists', async () => {
      const chain = createThenableChain({ data: { id: 'existing-id' }, error: null });
      (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);

      const result = await customTableService.validateTableSchema({
        table_name: 'existing_table',
        display_name: 'Existing',
        columns: [baseColumn()],
        permissions: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('already exists'))).toBe(true);
    });
  });

  describe('generateCreateTableSQL', () => {
    it('generates SQL with sanitized table and column names', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'patient_notes',
        display_name: 'Patient Notes',
        columns: [
          baseColumn({ column_name: 'note_text', data_type: 'text' }),
          baseColumn({ column_name: 'severity', data_type: 'integer', column_order: 2 }),
        ],
        permissions: [],
      });

      expect(sql).toContain('CREATE TABLE patient_notes');
      expect(sql).toContain('note_text text');
      expect(sql).toContain('severity integer');
      expect(sql).toContain('id uuid PRIMARY KEY');
      expect(sql).toContain('created_at timestamptz');
      expect(sql).toContain('idx_patient_notes_created_at');
    });

    it('sanitizes malicious characters from table name in SQL', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'users; DROP TABLE users;--',
        display_name: 'Evil',
        columns: [baseColumn()],
        permissions: [],
      });

      expect(sql).toContain('CREATE TABLE usersusers (');
      expect(sql).not.toContain('; DROP');
    });

    it('sanitizes malicious characters from column names', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'safe_table',
        display_name: 'Safe',
        columns: [
          baseColumn({ column_name: "col'; DROP TABLE users;--" }),
        ],
        permissions: [],
      });

      expect(sql).not.toContain("'");
      expect(sql).not.toContain('DROP');
    });

    it('falls back to text for unknown data types', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'test_table',
        display_name: 'Test',
        columns: [
          baseColumn({ column_name: 'evil_col', data_type: 'text; DROP TABLE users' }),
        ],
        permissions: [],
      });

      expect(sql).toContain('evil_col text');
      expect(sql).not.toContain('DROP');
    });

    it('accepts all valid data types', () => {
      const validTypes = [
        'text', 'integer', 'bigint', 'boolean', 'date', 'timestamptz',
        'numeric', 'uuid', 'jsonb', 'real', 'double precision',
      ];

      validTypes.forEach((type) => {
        const sql = customTableService.generateCreateTableSQL({
          table_name: 'type_test',
          display_name: 'Types',
          columns: [baseColumn({ column_name: 'col', data_type: type })],
          permissions: [],
        });
        expect(sql).toContain(`col ${type}`);
      });
    });

    it('generates NOT NULL and UNIQUE constraints', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'constrained_table',
        display_name: 'Constrained',
        columns: [
          baseColumn({ column_name: 'email', is_required: true, is_unique: true }),
        ],
        permissions: [],
      });

      expect(sql).toContain('NOT NULL');
      expect(sql).toContain('UNIQUE');
    });

    it('sanitizes quotes and semicolons from default values', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'defaults_table',
        display_name: 'Defaults',
        columns: [
          baseColumn({
            column_name: 'status',
            default_value: "'active'; DROP TABLE users;--",
          }),
        ],
        permissions: [],
      });

      expect(sql).toContain('DEFAULT');
      expect(sql).not.toContain("'active'");
      expect(sql).not.toContain("; DROP");
    });

    it('generates foreign key references with sanitized names', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'ref_table',
        display_name: 'Refs',
        columns: [
          baseColumn({
            column_name: 'user_id',
            data_type: 'uuid',
            foreign_key_table: 'auth.users; DROP--',
            foreign_key_column: 'id',
          }),
        ],
        permissions: [],
      });

      expect(sql).toContain('REFERENCES');
      expect(sql).not.toContain('DROP');
      expect(sql).toContain('REFERENCES authusers(id)');
    });

    it('creates indexes for the table', () => {
      const sql = customTableService.generateCreateTableSQL({
        table_name: 'indexed_table',
        display_name: 'Indexed',
        columns: [baseColumn()],
        permissions: [],
      });

      expect(sql).toContain('CREATE INDEX idx_indexed_table_created_at');
      expect(sql).toContain('CREATE INDEX idx_indexed_table_deleted_at');
    });
  });

  describe('generateRLSPolicies', () => {
    it('enables RLS on the table', () => {
      const sql = customTableService.generateRLSPolicies('test_table', []);
      expect(sql).toContain('ALTER TABLE test_table ENABLE ROW LEVEL SECURITY');
    });

    it('generates SELECT policy for view permission', () => {
      const sql = customTableService.generateRLSPolicies('test_table', [
        { role_name: 'admin', can_view: true, can_create: false, can_update: false, can_delete: false },
      ]);

      expect(sql).toContain('admin_can_view_test_table');
      expect(sql).toContain('FOR SELECT');
      expect(sql).toContain('TO authenticated');
    });

    it('generates INSERT policy for create permission', () => {
      const sql = customTableService.generateRLSPolicies('test_table', [
        { role_name: 'provider', can_view: false, can_create: true, can_update: false, can_delete: false },
      ]);

      expect(sql).toContain('provider_can_create_test_table');
      expect(sql).toContain('FOR INSERT');
      expect(sql).toContain('WITH CHECK');
    });

    it('generates UPDATE policy with both USING and WITH CHECK', () => {
      const sql = customTableService.generateRLSPolicies('test_table', [
        { role_name: 'admin', can_view: false, can_create: false, can_update: true, can_delete: false },
      ]);

      expect(sql).toContain('FOR UPDATE');
      expect(sql).toContain('USING');
      expect(sql).toContain('WITH CHECK');
    });

    it('generates DELETE policy', () => {
      const sql = customTableService.generateRLSPolicies('test_table', [
        { role_name: 'admin', can_view: false, can_create: false, can_update: false, can_delete: true },
      ]);

      expect(sql).toContain('admin_can_delete_test_table');
      expect(sql).toContain('FOR DELETE');
    });

    it('skips invalid role names', () => {
      const sql = customTableService.generateRLSPolicies('test_table', [
        { role_name: 'hacker; DROP TABLE', can_view: true, can_create: true, can_update: true, can_delete: true },
      ]);

      expect(sql).not.toContain('DROP');
      expect(sql).not.toContain('hacker');
      expect(sql).not.toContain('FOR SELECT');
    });

    it('uses anon role for public permissions', () => {
      const sql = customTableService.generateRLSPolicies('test_table', [
        { role_name: 'public', can_view: true, can_create: false, can_update: false, can_delete: false },
      ]);

      expect(sql).toContain('TO anon');
      expect(sql).toContain('USING (true)');
    });

    it('sanitizes table name in policy output', () => {
      const sql = customTableService.generateRLSPolicies('evil; DROP TABLE users;--', [
        { role_name: 'admin', can_view: true, can_create: false, can_update: false, can_delete: false },
      ]);

      expect(sql).not.toContain('DROP');
      expect(sql).toContain('ALTER TABLE evilusers ENABLE ROW LEVEL SECURITY');
    });

    it('generates all four policies for full CRUD permission', () => {
      const sql = customTableService.generateRLSPolicies('crud_table', [
        { role_name: 'admin', can_view: true, can_create: true, can_update: true, can_delete: true },
      ]);

      expect(sql).toContain('FOR SELECT');
      expect(sql).toContain('FOR INSERT');
      expect(sql).toContain('FOR UPDATE');
      expect(sql).toContain('FOR DELETE');
    });
  });

  describe('getCommonTableTemplates', () => {
    it('returns predefined templates', () => {
      const templates = customTableService.getCommonTableTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
    });

    it('templates have valid table names', () => {
      const templates = customTableService.getCommonTableTemplates();
      templates.forEach((t) => {
        expect(t.table_name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it('templates have at least one column', () => {
      const templates = customTableService.getCommonTableTemplates();
      templates.forEach((t) => {
        expect(t.columns.length).toBeGreaterThan(0);
      });
    });

    it('templates have valid column names', () => {
      const templates = customTableService.getCommonTableTemplates();
      templates.forEach((t) => {
        t.columns.forEach((col) => {
          expect(col.column_name).toMatch(/^[a-z][a-z0-9_]*$/);
        });
      });
    });
  });
});
