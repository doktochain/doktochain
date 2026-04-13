import { vi } from 'vitest';

type Row = Record<string, any>;

class InMemoryTable {
  private rows: Row[] = [];
  private autoIncrement = 1;

  insert(data: Row | Row[]): Row[] {
    const items = Array.isArray(data) ? data : [data];
    const inserted = items.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
      block_number: item.block_number ?? this.autoIncrement++,
    }));
    this.rows.push(...inserted);
    return inserted;
  }

  select(filters: Record<string, any> = {}): Row[] {
    return this.rows.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (key.endsWith('_neq')) return row[key.replace('_neq', '')] !== value;
        if (key.endsWith('_gte')) return row[key.replace('_gte', '')] >= value;
        if (key.endsWith('_lte')) return row[key.replace('_lte', '')] <= value;
        if (key.endsWith('_in')) return (value as any[]).includes(row[key.replace('_in', '')]);
        return row[key] === value;
      });
    });
  }

  update(filters: Record<string, any>, updates: Record<string, any>): Row[] {
    const updated: Row[] = [];
    this.rows = this.rows.map((row) => {
      const matches = Object.entries(filters).every(([key, value]) => {
        if (key.endsWith('_neq')) return row[key.replace('_neq', '')] !== value;
        if (key.endsWith('_gte')) return row[key.replace('_gte', '')] >= value;
        if (key.endsWith('_lte')) return row[key.replace('_lte', '')] <= value;
        if (key.endsWith('_in')) return (value as any[]).includes(row[key.replace('_in', '')]);
        return row[key] === value;
      });
      if (matches) {
        const updatedRow = { ...row, ...updates, updated_at: new Date().toISOString() };
        updated.push(updatedRow);
        return updatedRow;
      }
      return row;
    });
    return updated;
  }

  delete(filters: Record<string, any>): Row[] {
    const deleted: Row[] = [];
    this.rows = this.rows.filter((row) => {
      const matches = Object.entries(filters).every(([k, v]) => row[k] === v);
      if (matches) deleted.push(row);
      return !matches;
    });
    return deleted;
  }

  getAll(): Row[] {
    return [...this.rows];
  }

  clear(): void {
    this.rows = [];
    this.autoIncrement = 1;
  }
}

export class MockDatabase {
  private tables: Map<string, InMemoryTable> = new Map();

  getTable(name: string): InMemoryTable {
    if (!this.tables.has(name)) {
      this.tables.set(name, new InMemoryTable());
    }
    return this.tables.get(name)!;
  }

  clear(): void {
    this.tables.forEach((table) => table.clear());
    this.tables.clear();
  }

  seed(tableName: string, rows: Row[]): void {
    const table = this.getTable(tableName);
    rows.forEach((row) => table.insert(row));
  }
}

export function createSupabaseMock(db: MockDatabase) {
  function createQueryBuilder(tableName: string) {
    let filters: Record<string, any> = {};
    let pendingInsert: Row | Row[] | null = null;
    let pendingUpdate: Record<string, any> | null = null;
    let isDelete = false;
    let selectColumns = '*';
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;

    const builder: any = {
      select: vi.fn((cols?: string) => {
        selectColumns = cols || '*';
        return builder;
      }),
      insert: vi.fn((data: Row | Row[]) => {
        pendingInsert = data;
        return builder;
      }),
      update: vi.fn((data: Record<string, any>) => {
        pendingUpdate = data;
        return builder;
      }),
      delete: vi.fn(() => {
        isDelete = true;
        return builder;
      }),
      eq: vi.fn((col: string, val: any) => {
        filters[col] = val;
        return builder;
      }),
      neq: vi.fn((col: string, val: any) => {
        filters[col + '_neq'] = val;
        return builder;
      }),
      in: vi.fn((col: string, vals: any[]) => {
        filters[col + '_in'] = vals;
        return builder;
      }),
      gte: vi.fn((col: string, val: any) => {
        filters[col + '_gte'] = val;
        return builder;
      }),
      lte: vi.fn((col: string, val: any) => {
        filters[col + '_lte'] = val;
        return builder;
      }),
      gt: vi.fn((col: string, val: any) => {
        filters[col + '_gte'] = val;
        return builder;
      }),
      lt: vi.fn((col: string, val: any) => {
        filters[col + '_lte'] = val;
        return builder;
      }),
      or: vi.fn(() => builder),
      is: vi.fn(() => builder),
      not: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      contains: vi.fn(() => builder),
      order: vi.fn((col: string, opts?: { ascending?: boolean }) => {
        orderCol = col;
        orderAsc = opts?.ascending ?? true;
        return builder;
      }),
      limit: vi.fn((n: number) => {
        limitCount = n;
        return builder;
      }),
      range: vi.fn(() => builder),
      single: vi.fn(() => {
        return resolveQuery(true);
      }),
      maybeSingle: vi.fn(() => {
        return resolveQuery(true);
      }),
      then: (resolve: (val: any) => any, reject?: (err: any) => any) => {
        const result = resolveQuerySync(false);
        return Promise.resolve(result).then(resolve, reject);
      },
    };

    function resolveQuerySync(singleMode: boolean) {
      const table = db.getTable(tableName);

      if (pendingInsert) {
        const inserted = table.insert(pendingInsert as any);
        pendingInsert = null;
        if (singleMode) {
          return { data: inserted[0] || null, error: null };
        }
        return { data: inserted, error: null, count: inserted.length };
      }

      if (pendingUpdate) {
        const updated = table.update(filters, pendingUpdate);
        pendingUpdate = null;
        if (singleMode) {
          return { data: updated[0] || null, error: null };
        }
        return { data: updated, error: null };
      }

      if (isDelete) {
        const deleted = table.delete(filters);
        isDelete = false;
        return { data: deleted, error: null };
      }

      let rows = table.select(filters);

      if (orderCol) {
        rows.sort((a, b) => {
          const aVal = a[orderCol!];
          const bVal = b[orderCol!];
          if (aVal < bVal) return orderAsc ? -1 : 1;
          if (aVal > bVal) return orderAsc ? 1 : -1;
          return 0;
        });
      }

      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }

      if (singleMode) {
        return { data: rows[0] || null, error: rows.length === 0 ? null : null };
      }

      return { data: rows, error: null, count: rows.length };
    }

    function resolveQuery(singleMode: boolean) {
      return Promise.resolve(resolveQuerySync(singleMode));
    }

    return builder;
  }

  return {
    from: vi.fn((tableName: string) => createQueryBuilder(tableName)),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { id: 'test-user-id' },
          },
        },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.storage/file.pdf' } }),
      })),
    },
  };
}
