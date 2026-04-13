import { MockDatabase, createSupabaseMock } from './mockDb';

export const db = new MockDatabase();
export const mockSupabase = createSupabaseMock(db);
