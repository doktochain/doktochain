import { api } from '../lib/api-client';

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
    const params: Record<string, any> = {};
    if (!includeInactive) {
      params.is_active = true;
    }

    const { data, error } = await api.get<Department[]>('/departments', { params });
    if (error) throw error;
    return data as Department[];
  },

  async getDepartmentById(id: string) {
    const { data, error } = await api.get<Department>(`/departments/${id}`);
    if (error) throw error;
    return data as Department | null;
  },

  async createDepartment(department: Partial<Department>) {
    const { data, error } = await api.post<Department>('/departments', {
      name: department.name,
      code: department.code,
      description: department.description,
      head_user_id: department.head_user_id,
      parent_department_id: department.parent_department_id,
      is_active: department.is_active ?? true,
    });

    if (error) throw error;
    return data;
  },

  async updateDepartment(id: string, updates: Partial<Department>) {
    const { data, error } = await api.put<Department>(`/departments/${id}`, {
      name: updates.name,
      code: updates.code,
      description: updates.description,
      head_user_id: updates.head_user_id,
      parent_department_id: updates.parent_department_id,
      is_active: updates.is_active,
    });

    if (error) throw error;
    return data;
  },

  async deleteDepartment(id: string) {
    const { error } = await api.delete(`/departments/${id}`);
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
    const params: Record<string, any> = {};
    if (!includeInactive) {
      params.is_active = true;
    }

    const { data, error } = await api.get<Designation[]>('/designations', { params });
    if (error) throw error;
    return data as Designation[];
  },

  async getDesignationById(id: string) {
    const { data, error } = await api.get<Designation>(`/designations/${id}`);
    if (error) throw error;
    return data as Designation | null;
  },

  async createDesignation(designation: Partial<Designation>) {
    const { data, error } = await api.post<Designation>('/designations', {
      title: designation.title,
      code: designation.code,
      department_id: designation.department_id,
      level: designation.level,
      description: designation.description,
      responsibilities: designation.responsibilities || [],
      is_active: designation.is_active ?? true,
    });

    if (error) throw error;
    return data;
  },

  async updateDesignation(id: string, updates: Partial<Designation>) {
    const { data, error } = await api.put<Designation>(`/designations/${id}`, {
      title: updates.title,
      code: updates.code,
      department_id: updates.department_id,
      level: updates.level,
      description: updates.description,
      responsibilities: updates.responsibilities,
      is_active: updates.is_active,
    });

    if (error) throw error;
    return data;
  },

  async deleteDesignation(id: string) {
    const { error } = await api.delete(`/designations/${id}`);
    if (error) throw error;
  },

  async getDesignationsByDepartment(departmentId: string) {
    const { data, error } = await api.get<Designation[]>('/designations', {
      params: { department_id: departmentId, is_active: true },
    });

    if (error) throw error;
    return data as Designation[];
  },
};
