import { api } from './api-client';
import { supabase } from './supabase';

const USE_API_GATEWAY = !!import.meta.env.VITE_API_URL;

type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'contains' | 'containedBy' | 'overlaps';

interface Filter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

interface QueryOptions {
  select?: string;
  filters?: Filter[];
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  offset?: number;
  single?: boolean;
  maybeSingle?: boolean;
}

interface QueryResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

class QueryBuilder<T = unknown> {
  private tableName: string;
  private selectColumns = '*';
  private filters: Filter[] = [];
  private orderClauses: { column: string; ascending: boolean }[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private isSingle = false;
  private isMaybeSingle = false;
  private orClauses: string[] = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, operator: 'gt', value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, operator: 'lt', value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, operator: 'lte', value });
    return this;
  }

  like(column: string, value: string) {
    this.filters.push({ column, operator: 'like', value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, operator: 'ilike', value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  contains(column: string, value: unknown) {
    this.filters.push({ column, operator: 'contains', value });
    return this;
  }

  containedBy(column: string, value: unknown) {
    this.filters.push({ column, operator: 'containedBy', value });
    return this;
  }

  overlaps(column: string, value: unknown) {
    this.filters.push({ column, operator: 'overlaps', value });
    return this;
  }

  or(clause: string) {
    this.orClauses.push(clause);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderClauses.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(resolve: (value: QueryResult<T>) => void) {
    const result = await this.execute();
    resolve(result);
  }

  private buildParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.selectColumns !== '*') params.select = this.selectColumns;
    if (this.limitValue) params.limit = String(this.limitValue);
    if (this.offsetValue) params.offset = String(this.offsetValue);
    if (this.orderClauses.length > 0) {
      params.order = this.orderClauses.map(o => `${o.column}.${o.ascending ? 'asc' : 'desc'}`).join(',');
    }
    this.filters.forEach(f => {
      params[`${f.column}`] = `${f.operator}.${f.value}`;
    });
    if (this.orClauses.length > 0) {
      params.or = this.orClauses.join(',');
    }
    if (this.isSingle) params.single = 'true';
    if (this.isMaybeSingle) params.maybeSingle = 'true';
    return params;
  }

  async execute(): Promise<QueryResult<T>> {
    const params = this.buildParams();
    const { data, error } = await api.get<T>(`/data/${this.tableName}`, { params });
    return {
      data: data ?? null,
      error: error ? { message: error.message, code: error.code } : null,
    };
  }
}

class MutationBuilder<T = unknown> {
  private tableName: string;
  private operation: 'insert' | 'update' | 'upsert' | 'delete';
  private body: unknown;
  private filters: Filter[] = [];
  private selectColumns?: string;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string, operation: 'insert' | 'update' | 'upsert' | 'delete', body?: unknown) {
    this.tableName = tableName;
    this.operation = operation;
    this.body = body;
  }

  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, operator: 'is', value });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(resolve: (value: QueryResult<T>) => void) {
    const result = await this.execute();
    resolve(result);
  }

  async execute(): Promise<QueryResult<T>> {
    const params: Record<string, string> = {};
    this.filters.forEach(f => {
      params[`${f.column}`] = `${f.operator}.${f.value}`;
    });
    if (this.selectColumns) params.select = this.selectColumns;
    if (this.isSingle) params.single = 'true';
    if (this.isMaybeSingle) params.maybeSingle = 'true';

    let result;
    switch (this.operation) {
      case 'insert':
        result = await api.post<T>(`/data/${this.tableName}`, this.body, { params });
        break;
      case 'update':
        result = await api.patch<T>(`/data/${this.tableName}`, this.body, { params });
        break;
      case 'upsert':
        result = await api.put<T>(`/data/${this.tableName}`, this.body, { params });
        break;
      case 'delete':
        result = await api.delete<T>(`/data/${this.tableName}`, { params });
        break;
    }

    return {
      data: result.data ?? null,
      error: result.error ? { message: result.error.message, code: result.error.code } : null,
    };
  }
}

class TableClient {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    const builder = new QueryBuilder(this.tableName);
    return builder.select(columns);
  }

  insert(data: unknown) {
    return new MutationBuilder(this.tableName, 'insert', data);
  }

  update(data: unknown) {
    return new MutationBuilder(this.tableName, 'update', data);
  }

  upsert(data: unknown) {
    return new MutationBuilder(this.tableName, 'upsert', data);
  }

  delete() {
    return new MutationBuilder(this.tableName, 'delete');
  }
}

export const dataClient = {
  from(tableName: string) {
    if (USE_API_GATEWAY) {
      return new TableClient(tableName);
    }
    return supabase.from(tableName);
  },

  rpc(functionName: string, params?: Record<string, unknown>) {
    if (USE_API_GATEWAY) {
      return api.post(`/rpc/${functionName}`, params);
    }
    return supabase.rpc(functionName, params);
  },
};

export function getSupabaseClient() {
  return supabase;
}
