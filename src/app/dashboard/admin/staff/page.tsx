import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Users, Plus, Shield, Activity, Search, X, MoreVertical, Eye, CreditCard as Edit, Trash2, UserPlus, ChevronDown } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { adminStaffPermissionsService, StaffRole } from '../../../../services/adminStaffPermissionsService';
import { useAuth } from '../../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  avatar_url: string | null;
  assigned_roles: { id: string; role_id: string; role: StaffRole | null }[];
}

export default function StaffManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignRoleModal, setShowAssignRoleModal] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [removeRoleConfirm, setRemoveRoleConfirm] = useState<{ userId: string; roleId: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, usersResult] = await Promise.all([
        adminStaffPermissionsService.getAllStaffRoles(),
        supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email, role, phone, is_active, created_at, last_login_at, avatar_url')
          .in('role', ['admin', 'staff'])
          .order('created_at', { ascending: false }),
      ]);

      setRoles(rolesData);

      const profileData = usersResult.data || [];

      const userIds = profileData.map(u => u.id);
      let assignmentMap: Record<string, any[]> = {};

      if (userIds.length > 0) {
        const { data: assignments } = await supabase
          .from('user_custom_roles')
          .select('*, role:custom_roles(*)')
          .in('user_id', userIds);

        (assignments || []).forEach(a => {
          if (!assignmentMap[a.user_id]) assignmentMap[a.user_id] = [];
          assignmentMap[a.user_id].push(a);
        });
      }

      const enriched: AdminUser[] = profileData.map(u => ({
        ...u,
        assigned_roles: assignmentMap[u.id] || [],
      }));

      setUsers(enriched);
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      await loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const handleAssignRole = async (userId: string) => {
    if (!selectedRoleId) return;
    try {
      await adminStaffPermissionsService.assignRoleToUser(userId, selectedRoleId);
      setShowAssignRoleModal(null);
      setSelectedRoleId('');
      await loadData();
    } catch (error) {
      toast.error('Failed to assign role. User may already have this role.');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      await adminStaffPermissionsService.removeRoleFromUser(userId, roleId);
      await loadData();
    } catch (error) {
      toast.error('Failed to remove role.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      !searchTerm ||
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'no-role' && u.assigned_roles.length === 0) ||
      u.assigned_roles.some(ar => ar.role_id === roleFilter);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active !== false) ||
      (statusFilter === 'inactive' && u.is_active === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active !== false).length,
    inactive: users.filter(u => u.is_active === false).length,
    withRoles: users.filter(u => u.assigned_roles.length > 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">
            Manage admin and staff users, assign roles and permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/admin/permissions"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Manage Roles
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-teal-600" />}
          label="Total Staff"
          value={stats.total}
          bg="bg-teal-50"
        />
        <StatCard
          icon={<Activity className="w-6 h-6 text-emerald-600" />}
          label="Active"
          value={stats.active}
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<Shield className="w-6 h-6 text-blue-600" />}
          label="With Roles"
          value={stats.withRoles}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-amber-600" />}
          label="No Role Assigned"
          value={stats.total - stats.withRoles}
          bg="bg-amber-50"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="no-role">No Role Assigned</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Staff Member</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">System Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned Roles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No staff members found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(staffUser => (
                  <tr key={staffUser.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm flex-shrink-0">
                          {staffUser.first_name?.[0]?.toUpperCase() || ''}{staffUser.last_name?.[0]?.toUpperCase() || ''}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {staffUser.first_name} {staffUser.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{staffUser.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        staffUser.role === 'admin'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {staffUser.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {staffUser.assigned_roles.length === 0 ? (
                          <span className="text-sm text-gray-400 italic">None</span>
                        ) : (
                          staffUser.assigned_roles.map(ar => (
                            <span
                              key={ar.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
                            >
                              {ar.role?.name || 'Unknown'}
                              <button
                                onClick={() => setRemoveRoleConfirm({ userId: staffUser.id, roleId: ar.role_id })}
                                className="hover:text-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                        <button
                          onClick={() => {
                            setShowAssignRoleModal(staffUser.id);
                            setSelectedRoleId('');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(staffUser.id, staffUser.is_active !== false)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          staffUser.is_active !== false
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {staffUser.is_active !== false ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(staffUser.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === staffUser.id ? null : staffUser.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuOpen === staffUser.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)} />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                              <button
                                onClick={() => {
                                  setShowAssignRoleModal(staffUser.id);
                                  setSelectedRoleId('');
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <UserPlus className="w-4 h-4" />
                                Assign Role
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleStatus(staffUser.id, staffUser.is_active !== false);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Activity className="w-4 h-4" />
                                {staffUser.is_active !== false ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} staff members
          </p>
        </div>
      </div>

      {showAssignRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-gray-900">Assign Role</h2>
              <button
                onClick={() => setShowAssignRoleModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select a role to assign</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Choose role...</option>
                  {roles.filter(r => r.is_active).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              {roles.length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  No roles created yet. Go to Permissions & Roles to create one first.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => handleAssignRole(showAssignRoleModal)}
                disabled={!selectedRoleId}
                className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 transition-colors font-medium"
              >
                Assign Role
              </button>
              <button
                onClick={() => setShowAssignRoleModal(null)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeRoleConfirm !== null}
        onOpenChange={(open) => { if (!open) setRemoveRoleConfirm(null); }}
        title="Remove Role"
        description="Remove this role from the staff member?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (removeRoleConfirm) {
            handleRemoveRole(removeRoleConfirm.userId, removeRoleConfirm.roleId);
            setRemoveRoleConfirm(null);
          }
        }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${bg} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}
