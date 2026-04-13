import { api } from '../lib/api-client';
import { scanAdminMenuResources, getResourcesBySection, MenuResource } from './adminMenuScanner';

export interface StaffRole {
  id: string;
  name: string;
  description: string | null;
  role_type: string;
  is_system_role: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPermission {
  id: string;
  role_id: string;
  resource: string;
  resource_path: string;
  resource_category: string;
  parent_resource: string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role?: StaffRole;
}

class AdminStaffPermissionsService {
  async getAllStaffRoles(): Promise<StaffRole[]> {
    const { data, error } = await api.get<StaffRole[]>('/custom-roles', {
      params: { role_type: 'admin_staff', order: 'name' },
    });

    if (error) throw error;
    return data || [];
  }

  async getAllRoles(): Promise<StaffRole[]> {
    const { data, error } = await api.get<StaffRole[]>('/custom-roles', {
      params: { order: 'is_system_role.desc,name' },
    });

    if (error) throw error;
    return data || [];
  }

  async getRoleById(roleId: string): Promise<StaffRole | null> {
    const { data, error } = await api.get<StaffRole>(`/custom-roles/${roleId}`);

    if (error) throw error;
    return data;
  }

  async createStaffRole(role: Partial<StaffRole>): Promise<StaffRole> {
    const { data, error } = await api.post<StaffRole>('/custom-roles', {
      ...role,
      role_type: 'admin_staff',
      is_system_role: false,
    });

    if (error) throw error;
    return data!;
  }

  async updateStaffRole(roleId: string, updates: Partial<StaffRole>): Promise<StaffRole> {
    const { data, error } = await api.put<StaffRole>(`/custom-roles/${roleId}`, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    return data!;
  }

  async deleteStaffRole(roleId: string): Promise<void> {
    const { error } = await api.delete(`/custom-roles/${roleId}`);

    if (error) throw error;
  }

  async getRolePermissions(roleId: string): Promise<StaffPermission[]> {
    const { data, error } = await api.get<StaffPermission[]>('/role-permissions', {
      params: { role_id: roleId },
    });

    if (error) throw error;
    return data || [];
  }

  async setRolePermissionsFromResources(
    roleId: string,
    permissions: Array<{
      resource: MenuResource;
      can_view: boolean;
      can_create: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }>
  ): Promise<void> {
    await api.delete(`/role-permissions`, {
      params: { role_id: roleId },
    });

    if (permissions.length > 0) {
      const permissionsToInsert = permissions.map((p) => ({
        role_id: roleId,
        resource: p.resource.id,
        resource_path: p.resource.path,
        resource_category: p.resource.section,
        parent_resource: p.resource.parentMenu,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      }));

      const { error } = await api.post('/role-permissions', permissionsToInsert);

      if (error) throw error;
    }
  }

  async updatePermission(
    roleId: string,
    resourceId: string,
    updates: Partial<Omit<StaffPermission, 'id' | 'role_id' | 'resource'>>
  ): Promise<void> {
    const { error } = await api.put('/role-permissions', {
      ...updates,
      updated_at: new Date().toISOString(),
      _filter: { role_id: roleId, resource: resourceId },
    });

    if (error) throw error;
  }

  async upsertPermission(
    roleId: string,
    resource: MenuResource,
    permissions: {
      can_view: boolean;
      can_create: boolean;
      can_edit: boolean;
      can_delete: boolean;
    }
  ): Promise<void> {
    const { error } = await api.post('/role-permissions', {
      role_id: roleId,
      resource: resource.id,
      resource_path: resource.path,
      resource_category: resource.section,
      parent_resource: resource.parentMenu,
      ...permissions,
      updated_at: new Date().toISOString(),
      _upsert: true,
    });

    if (error) throw error;
  }

  async getStaffUsers(): Promise<StaffUser[]> {
    const { data, error } = await api.get<any[]>('/user-profiles', {
      params: { role: 'staff', order: 'first_name' },
    });

    if (error) throw error;

    return (data || []).map(user => ({
      id: user.id,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      email: user.email,
      role: user.role
    }));
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const { error } = await api.post('/user-custom-roles', {
      user_id: userId,
      role_id: roleId,
    });

    if (error) throw error;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const { error } = await api.delete('/user-custom-roles', {
      params: { user_id: userId, role_id: roleId },
    });

    if (error) throw error;
  }

  async getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await api.get<UserRoleAssignment[]>('/user-custom-roles', {
      params: { user_id: userId, include: 'role' },
    });

    if (error) throw error;
    return data || [];
  }

  getAdminMenuResources(): MenuResource[] {
    return scanAdminMenuResources();
  }

  getResourcesBySection(): Record<string, MenuResource[]> {
    return getResourcesBySection();
  }

  async checkUserPermission(
    userId: string,
    resourcePath: string,
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    const { data, error } = await api.post<boolean>('/rpc/check_user_permission', {
      p_user_id: userId,
      p_resource_path: resourcePath,
      p_action: action,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data || false;
  }

  async getUserAccessiblePaths(userId: string): Promise<string[]> {
    const { data, error } = await api.post<any[]>('/rpc/get_user_accessible_paths', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error getting accessible paths:', error);
      return [];
    }

    return (data || []).map((row: any) => row.resource_path);
  }

  async getUserViewablePaths(userId: string): Promise<Set<string>> {
    const { data: assignments } = await api.get<any[]>('/user-custom-roles', {
      params: { user_id: userId },
    });

    if (!assignments || assignments.length === 0) return new Set();

    const roleIds = assignments.map(a => a.role_id);
    const { data: perms } = await api.get<any[]>('/role-permissions', {
      params: { role_id: roleIds, can_view: true },
    });

    return new Set((perms || []).map(p => p.resource_path));
  }

  async detectNewMenus(): Promise<MenuResource[]> {
    const allResources = this.getAdminMenuResources();
    const { data: existingPermissions } = await api.get<any[]>('/role-permissions', {
      params: { select: 'resource' },
    });

    const existingResourceIds = existingPermissions?.map((p) => p.resource) || [];
    return allResources.filter((r) => !existingResourceIds.includes(r.id));
  }
}

export const adminStaffPermissionsService = new AdminStaffPermissionsService();
