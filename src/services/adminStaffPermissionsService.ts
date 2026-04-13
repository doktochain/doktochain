import { supabase } from '../lib/supabase';
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
  /**
   * Get all admin staff roles (excluding system roles for management)
   */
  async getAllStaffRoles(): Promise<StaffRole[]> {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('role_type', 'admin_staff')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all roles including system roles (for display/reference)
   */
  async getAllRoles(): Promise<StaffRole[]> {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .order('is_system_role', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<StaffRole | null> {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new staff role
   */
  async createStaffRole(role: Partial<StaffRole>): Promise<StaffRole> {
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('custom_roles')
      .insert({
        ...role,
        role_type: 'admin_staff',
        is_system_role: false,
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update staff role
   */
  async updateStaffRole(roleId: string, updates: Partial<StaffRole>): Promise<StaffRole> {
    const { data, error } = await supabase
      .from('custom_roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roleId)
      .eq('role_type', 'admin_staff')
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete staff role (only non-system roles)
   */
  async deleteStaffRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_roles')
      .delete()
      .eq('id', roleId)
      .eq('is_system_role', false)
      .eq('role_type', 'admin_staff');

    if (error) throw error;
  }

  /**
   * Get all permissions for a role with menu resource details
   */
  async getRolePermissions(roleId: string): Promise<StaffPermission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Set permissions for a role from menu resources
   */
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
    // First, delete existing permissions for this role
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // Insert new permissions
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

      const { error } = await supabase
        .from('role_permissions')
        .insert(permissionsToInsert);

      if (error) throw error;
    }
  }

  /**
   * Update a single permission
   */
  async updatePermission(
    roleId: string,
    resourceId: string,
    updates: Partial<Omit<StaffPermission, 'id' | 'role_id' | 'resource'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('role_id', roleId)
      .eq('resource', resourceId);

    if (error) throw error;
  }

  /**
   * Create or update a permission
   */
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
    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role_id: roleId,
        resource: resource.id,
        resource_path: resource.path,
        resource_category: resource.section,
        parent_resource: resource.parentMenu,
        ...permissions,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'role_id,resource',
      });

    if (error) throw error;
  }

  /**
   * Get all staff users
   */
  async getStaffUsers(): Promise<StaffUser[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'staff')
      .order('first_name');

    if (error) throw error;

    // Map to expected format
    return (data || []).map(user => ({
      id: user.id,
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      email: user.email,
      role: user.role
    }));
  }

  /**
   * Assign role to staff user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('user_custom_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        assigned_by: userData.user?.id,
      });

    if (error) throw error;
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const { error } = await supabase
      .from('user_custom_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) throw error;
  }

  /**
   * Get all roles assigned to a user
   */
  async getUserRoles(userId: string): Promise<UserRoleAssignment[]> {
    const { data, error } = await supabase
      .from('user_custom_roles')
      .select(`
        *,
        role:custom_roles(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all admin menu resources from the scanner
   */
  getAdminMenuResources(): MenuResource[] {
    return scanAdminMenuResources();
  }

  /**
   * Get resources grouped by section
   */
  getResourcesBySection(): Record<string, MenuResource[]> {
    return getResourcesBySection();
  }

  /**
   * Check if user has permission for a specific action
   */
  async checkUserPermission(
    userId: string,
    resourcePath: string,
    action: 'view' | 'create' | 'edit' | 'delete'
  ): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('check_user_permission', {
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

  /**
   * Get all accessible paths for a user
   */
  async getUserAccessiblePaths(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .rpc('get_user_accessible_paths', {
        p_user_id: userId,
      });

    if (error) {
      console.error('Error getting accessible paths:', error);
      return [];
    }

    return (data || []).map((row: any) => row.resource_path);
  }

  async getUserViewablePaths(userId: string): Promise<Set<string>> {
    const { data: assignments } = await supabase
      .from('user_custom_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (!assignments || assignments.length === 0) return new Set();

    const roleIds = assignments.map(a => a.role_id);
    const { data: perms } = await supabase
      .from('role_permissions')
      .select('resource_path')
      .in('role_id', roleIds)
      .eq('can_view', true);

    return new Set((perms || []).map(p => p.resource_path));
  }

  async detectNewMenus(): Promise<MenuResource[]> {
    const allResources = this.getAdminMenuResources();
    const { data: existingPermissions } = await supabase
      .from('role_permissions')
      .select('resource');

    const existingResourceIds = existingPermissions?.map((p) => p.resource) || [];
    return allResources.filter((r) => !existingResourceIds.includes(r.id));
  }
}

export const adminStaffPermissionsService = new AdminStaffPermissionsService();
