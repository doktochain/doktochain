import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Building2, Plus, CreditCard as Edit, Trash2, Users } from 'lucide-react';
import { departmentService, Department, Designation } from '../../../../../services/departmentService';
import { ConfirmDialog } from '../../../../../components/ui/confirm-dialog';
import { DepartmentModal } from '../../../../../components/hrm/DepartmentModal';
import { DesignationModal } from '../../../../../components/hrm/DesignationModal';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showDesigModal, setShowDesigModal] = useState(false);
  const [confirmDeleteDeptId, setConfirmDeleteDeptId] = useState<string | null>(null);
  const [confirmDeleteDesigId, setConfirmDeleteDesigId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'departments' | 'designations'>('departments');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depts, desigs] = await Promise.all([
        departmentService.getAllDepartments(true),
        departmentService.getAllDesignations(true),
      ]);
      setDepartments(depts);
      setDesignations(desigs);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await departmentService.deleteDepartment(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

  const handleDeleteDesignation = async (id: string) => {
    try {
      await departmentService.deleteDesignation(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error('Failed to delete designation');
    }
  };

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
            <Building2 className="w-6 h-6" />
            Departments & Designations
          </h1>
          <p className="text-gray-600 mt-1">
            Manage organizational structure and job roles
          </p>
        </div>

        <button
          onClick={() => activeTab === 'departments' ? setShowDeptModal(true) : setShowDesigModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'departments' ? 'Department' : 'Designation'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'departments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Departments ({departments.length})
            </button>
            <button
              onClick={() => setActiveTab('designations')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'designations'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Designations ({designations.length})
            </button>
          </div>
        </div>

        {activeTab === 'departments' ? (
          <div className="p-6">
            {departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No departments found</p>
                <button
                  onClick={() => setShowDeptModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Add your first department
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => (
                  <div
                    key={dept.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{dept.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteDeptId(dept.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {dept.description && (
                      <p className="text-sm text-gray-600 mb-3">{dept.description}</p>
                    )}

                    {dept.head_user && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                        <Users className="w-4 h-4" />
                        <span>Head: {dept.head_user.full_name}</span>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        dept.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            {designations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No designations found</p>
                <button
                  onClick={() => setShowDesigModal(true)}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Add your first designation
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {designations.map(desig => (
                      <tr key={desig.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{desig.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {desig.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {desig.department?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {desig.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            desig.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {desig.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteDesigId(desig.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <DepartmentModal
        isOpen={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        onSuccess={loadData}
      />

      <DesignationModal
        isOpen={showDesigModal}
        onClose={() => setShowDesigModal(false)}
        onSuccess={loadData}
      />

      <ConfirmDialog
        open={!!confirmDeleteDeptId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteDeptId(null); }}
        title="Delete Department"
        description="Are you sure you want to delete this department?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteDeptId) {
            handleDeleteDepartment(confirmDeleteDeptId);
            setConfirmDeleteDeptId(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteDesigId}
        onOpenChange={(open) => { if (!open) setConfirmDeleteDesigId(null); }}
        title="Delete Designation"
        description="Are you sure you want to delete this designation?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (confirmDeleteDesigId) {
            handleDeleteDesignation(confirmDeleteDesigId);
            setConfirmDeleteDesigId(null);
          }
        }}
      />
    </div>
  );
}
