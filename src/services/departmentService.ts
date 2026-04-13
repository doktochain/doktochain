import { supabase } from '../lib/supabase';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head_user_id?: string;
  parent_department_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  head_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  parent_department?: {
    id: string;
    name: string;
  };
}

export interface Designation {
  id: string;
  title: string;
  code: string;
  department_id?: string;
  level: 'entry' | 'mid' | 'senior' | 'executive' | 'leadership';
  description?: string;
  responsibilities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
  };
}

export const departmentService = {
  async getAllDepartments(includeInactive = false) {
    let query = supabase
      .from('departments')
      .select(`
        *,
        head_user:user_profiles!departments_head_user_id_fkey(id, full_name, email),
        parent_department:departments!departments_parent_department_id_fkey(id, name)
      `)
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Department[];
  },

  async getDepartmentById(id: string) {
    const { data, error } = await supabase
      .from('departments')
      .select(`
        *,
        head_user:user_profiles!departments_head_user_id_fkey(id, full_name, email),
        parent_department:departments!departments_parent_department_id_fkey(id, name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Department | null;
  },

  async createDepartment(department: Partial<Department>) {
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: department.name,
        code: department.code,
        description: department.description,
        head_user_id: department.head_user_id,
        parent_department_id: department.parent_department_id,
        is_active: department.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDepartment(id: string, updates: Partial<Department>) {
    const { data, error } = await supabase
      .from('departments')
      .update({
        name: updates.name,
        code: updates.code,
        description: updates.description,
        head_user_id: updates.head_user_id,
        parent_department_id: updates.parent_department_id,
        is_active: updates.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDepartment(id: string) {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getDepartmentHierarchy() {
    const departments = await this.getAllDepartments();

    const buildTree = (parentId: string | null = null): any[] => {
      return departments
        .filter(dept => dept.parent_department_id === parentId)
        .map(dept => ({
          ...dept,
          children: buildTree(dept.id)
        }));
    };

    return buildTree(null);
  },

  async getAllDesignations(includeInactive = false) {
    let query = supabase
      .from('designations')
      .select(`
        *,
        department:departments(id, name)
      `)
      .order('title');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Designation[];
  },

  async getDesignationById(id: string) {
    const { data, error } = await supabase
      .from('designations')
      .select(`
        *,
        department:departments(id, name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Designation | null;
  },

  async createDesignation(designation: Partial<Designation>) {
    const { data, error } = await supabase
      .from('designations')
      .insert({
        title: designation.title,
        code: designation.code,
        department_id: designation.department_id,
        level: designation.level,
        description: designation.description,
        responsibilities: designation.responsibilities || [],
        is_active: designation.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDesignation(id: string, updates: Partial<Designation>) {
    const { data, error } = await supabase
      .from('designations')
      .update({
        title: updates.title,
        code: updates.code,
        department_id: updates.department_id,
        level: updates.level,
        description: updates.description,
        responsibilities: updates.responsibilities,
        is_active: updates.is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteDesignation(id: string) {
    const { error } = await supabase
      .from('designations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getDesignationsByDepartment(departmentId: string) {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .order('title');

    if (error) throw error;
    return data as Designation[];
  },
};
