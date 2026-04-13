import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Shield, Plus, CreditCard as Edit, Trash2, X, ChevronDown, ChevronRight, RefreshCw, Search, Users, CheckSquare } from 'lucide-react';
import {
  adminStaffPermissionsService,
  StaffRole,
  StaffPermission,
  StaffUser,
} from '../../../../services/adminStaffPermissionsService';
import { MenuResource } from '../../../../services/adminMenuScanner';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';

export default function AdminStaffPermissionsPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'assignments'>('roles');
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [newMenusDetected, setNewMenusDetected] = useState<MenuResource[]>([]);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<string | null>(null);

  const menuResources = adminStaffPermissionsService.getResourcesBySection();

  useEffect(() => {
    loadData();
    detectNewMenus();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadPermissions();
    }
  }, [selectedRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, usersData] = await Promise.all([
        adminStaffPermissionsService.getAllStaffRoles(),
        adminStaffPermissionsService.getStaffUsers(),
      ]);
      setRoles(rolesData);
      setStaffUsers(usersData);
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
      }
      return rolesData;
    } catch (error) {
      console.error('Error loading data:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!selectedRole) return;
    try {
      const perms = await adminStaffPermissionsService.getRolePermissions(selectedRole.id);
      setPermissions(perms);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const detectNewMenus = async () => {
    try {
      const newMenus = await adminStaffPermissionsService.detectNewMenus();
      setNewMenusDetected(newMenus);
    } catch (error) {
      console.error('Error detecting new menus:', error);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleEditRole = (role: StaffRole) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await adminStaffPermissionsService.deleteStaffRole(roleId);
      await loadData();
      if (selectedRole?.id === roleId) {
        setSelectedRole(roles[0] || null);
      }
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const handlePermissionChange = async (
    resource: MenuResource,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!selectedRole) return;

    try {
      const existingPerm = permissions.find(p => p.resource === resource.id);

      if (existingPerm) {
        await adminStaffPermissionsService.updatePermission(selectedRole.id, resource.id, {
          [action]: value,
        });
      } else {
        await adminStaffPermissionsService.upsertPermission(selectedRole.id, resource, {
          can_view: action === 'can_view' ? value : false,
          can_create: action === 'can_create' ? value : false,
          can_edit: action === 'can_edit' ? value : false,
          can_delete: action === 'can_delete' ? value : false,
        });
      }

      await loadPermissions();
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const getPermissionForResource = (resourceId: string) => {
    return permissions.find(p => p.resource === resourceId) || {
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAllCategories = () => {
    setExpandedCategories(new Set(Object.keys(menuResources)));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  const filteredMenuResources = Object.entries(menuResources).reduce((acc, [section, resources]) => {
    if (searchTerm) {
      const filtered = resources.filter(r =>
        r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.path.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[section] = filtered;
      }
    } else {
      acc[section] = resources;
    }
    return acc;
  }, {} as Record<string, MenuResource[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Admin Staff Permissions & Roles
          </h1>
          <p className="text-gray-600 mt-1">
            Create staff roles and assign granular permissions for admin portal menus
          </p>
        </div>

        <div className="flex items-center gap-3">
          {newMenusDetected.length > 0 && (
            <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <span className="font-medium text-yellow-800">{newMenusDetected.length} new menu(s) detected!</span>
            </div>
          )}
          <button
            onClick={handleCreateRole}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Staff Role
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'roles'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Roles & Permissions
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'assignments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Staff Assignments
            </button>
          </div>
        </div>

        {activeTab === 'roles' ? (
          <div className="grid grid-cols-12 divide-x">
            <div className="col-span-3 p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">STAFF ROLES ({roles.length})</h3>
              <div className="space-y-2">
                {roles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRole?.id === role.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 break-words">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRole(role);
                          }}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Edit role"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteRoleConfirm(role.id);
                          }}
                          className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                          title="Delete role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-9 p-6">
              {selectedRole ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedRole.name}</h3>
                      <p className="text-sm text-gray-600">{selectedRole.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={expandAllCategories}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Expand All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={collapseAllCategories}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search menus..."
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-2 pb-2 border-b bg-gray-50 p-3 rounded-lg font-medium text-sm text-gray-700 sticky top-0">
                      <div>Menu / Submenu</div>
                      <div className="text-center">View</div>
                      <div className="text-center">Create</div>
                      <div className="text-center">Edit</div>
                      <div className="text-center">Delete</div>
                    </div>

                    {Object.entries(filteredMenuResources).map(([section, resources]) => (
                      <div key={section} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(section)}
                          className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 flex items-center gap-2">
                            {expandedCategories.has(section) ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                            {section} ({resources.length})
                          </span>
                        </button>

                        {expandedCategories.has(section) && (
                          <div className="divide-y">
                            {resources.map(resource => {
                              const perm = getPermissionForResource(resource.id);
                              const isNewMenu = newMenusDetected.some(m => m.id === resource.id);
                              return (
                                <div
                                  key={resource.id}
                                  className={`grid grid-cols-5 gap-2 p-3 hover:bg-gray-50 ${isNewMenu ? 'bg-yellow-50' : ''}`}
                                >
                                  <div className={`text-sm ${resource.parentMenu ? 'ml-6' : 'font-medium'}`}>
                                    <div className="flex items-center gap-2">
                                      {resource.label}
                                      {isNewMenu && (
                                        <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">NEW</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{resource.path}</div>
                                  </div>
                                  <div className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={perm.can_view}
                                      onChange={(e) => handlePermissionChange(resource, 'can_view', e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={perm.can_create}
                                      onChange={(e) => handlePermissionChange(resource, 'can_create', e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={perm.can_edit}
                                      onChange={(e) => handlePermissionChange(resource, 'can_edit', e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                  <div className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={perm.can_delete}
                                      onChange={(e) => handlePermissionChange(resource, 'can_delete', e.target.checked)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a staff role to manage permissions</p>
                  <button
                    onClick={handleCreateRole}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                  >
                    Or create your first staff role
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            <StaffAssignmentsTab users={staffUsers} roles={roles} onUpdate={loadData} />
          </div>
        )}
      </div>

      {showRoleModal && (
        <StaffRoleModal
          role={editingRole}
          onClose={() => setShowRoleModal(false)}
          onSuccess={async (newRoleId?: string) => {
            const updatedRoles = await loadData();
            if (newRoleId && updatedRoles.length > 0) {
              const newRole = updatedRoles.find(r => r.id === newRoleId);
              if (newRole) {
                setSelectedRole(newRole);
              }
            }
            setShowRoleModal(false);
          }}
        />
      )}

      <ConfirmDialog
        open={deleteRoleConfirm !== null}
        onOpenChange={(open) => { if (!open) setDeleteRoleConfirm(null); }}
        title="Delete Staff Role"
        description="Are you sure you want to delete this staff role? All permissions and assignments will be removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteRoleConfirm) {
            handleDeleteRole(deleteRoleConfirm);
            setDeleteRoleConfirm(null);
          }
        }}
      />
    </div>
  );
}

function StaffAssignmentsTab({
  users,
  roles,
  onUpdate,
}: {
  users: StaffUser[];
  roles: StaffRole[];
  onUpdate: () => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;
    try {
      await adminStaffPermissionsService.assignRoleToUser(selectedUser, selectedRole);
      toast.success('Role assigned successfully!');
      onUpdate();
      setSelectedUser('');
      setSelectedRole('');
    } catch (error) {
      toast.error('Failed to assign role. The user may already have this role.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Assign Role to Staff Member
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Staff User</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name} ({user.email})
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Role</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleAssignRole}
            disabled={!selectedUser || !selectedRole}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            Assign Role
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Members ({users.length})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Roles</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <UserRolesList userId={user.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserRolesList({ userId }: { userId: string }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeRoleConfirm, setRemoveRoleConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, [userId]);

  const loadRoles = async () => {
    try {
      const data = await adminStaffPermissionsService.getUserRoles(userId);
      setRoles(data);
    } catch (error) {
      console.error('Error loading user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    try {
      await adminStaffPermissionsService.removeRoleFromUser(userId, roleId);
      await loadRoles();
    } catch (error) {
      toast.error('Failed to remove role');
    }
  };

  if (loading) {
    return <span className="text-gray-400">Loading...</span>;
  }

  if (roles.length === 0) {
    return <span className="text-gray-400">No roles assigned</span>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {roles.map(assignment => (
          <span
            key={assignment.id}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
          >
            {assignment.role?.name}
            <button
              onClick={() => setRemoveRoleConfirm(assignment.role_id)}
              className="hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <ConfirmDialog
        open={removeRoleConfirm !== null}
        onOpenChange={(open) => { if (!open) setRemoveRoleConfirm(null); }}
        title="Remove Role"
        description="Remove this role from user?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (removeRoleConfirm) {
            handleRemoveRole(removeRoleConfirm);
            setRemoveRoleConfirm(null);
          }
        }}
      />
    </>
  );
}

function StaffRoleModal({
  role,
  onClose,
  onSuccess,
}: {
  role: StaffRole | null;
  onClose: () => void;
  onSuccess: (newRoleId?: string) => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [isActive, setIsActive] = useState(role?.is_active ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let createdRoleId: string | undefined;
      if (role) {
        await adminStaffPermissionsService.updateStaffRole(role.id, { name, description, is_active: isActive });
        createdRoleId = role.id;
        toast.success('Role updated successfully! You can now assign permissions to it.');
      } else {
        const newRole = await adminStaffPermissionsService.createStaffRole({ name, description, is_active: isActive });
        createdRoleId = newRole.id;
        toast.success('Role created successfully! You can now assign permissions to it.');
      }
      onSuccess(createdRoleId);
    } catch (error) {
      toast.error('Failed to save role. Please try again.');
      console.error('Error saving role:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {role ? 'Edit Staff Role' : 'Create Staff Role'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Receptionist, HR Manager, Medical Records Officer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of responsibilities and access level"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              Active Role (users can be assigned to this role)
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
