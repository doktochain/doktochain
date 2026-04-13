import { useState, useEffect } from 'react';
import { Calendar, Edit, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import AdminCRUDTemplate from '../../../../../components/admin/AdminCRUDTemplate';
import AdminFormModal, { FormField } from '../../../../../components/admin/AdminFormModal';
import AdminDeleteConfirmation from '../../../../../components/admin/AdminDeleteConfirmation';
import AdminDetailView from '../../../../../components/admin/AdminDetailView';
import AdminStatusBadge from '../../../../../components/admin/AdminStatusBadge';
import { TableColumn, TableAction } from '../../../../../components/admin/AdminDataTable';
import { BulkAction } from '../../../../../components/admin/AdminBulkActions';
import { supabase } from '../../../../../lib/supabase';
import { adminCRUDService } from '../../../../../services/adminCRUDService';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patient_id(first_name, last_name, email),
          provider:provider_id(first_name, last_name, specialization)
        `)
        .is('deleted_at', null)
        .order('appointment_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointment = async (data: any) => {
    try {
      await adminCRUDService.update('appointments', selectedAppointment.id, data, selectedAppointment);
      setShowEditModal(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const handleDeleteAppointment = async () => {
    try {
      await adminCRUDService.softDelete('appointments', selectedAppointment.id);
      setShowDeleteModal(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleBulkCancel = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkUpdate('appointments', ids, { status: 'cancelled' });
      loadAppointments();
    } catch (error) {
      console.error('Error bulk cancelling:', error);
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await adminCRUDService.bulkDelete('appointments', ids, true);
      loadAppointments();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'appointment_date',
      label: 'Date & Time',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">
            {new Date(value).toLocaleDateString()}
          </div>
          <div className="text-sm text-gray-500">
            {row.start_time} - {row.end_time}
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      label: 'Patient',
      render: (value) => (
        <div>
          <div className="font-medium">
            {value?.first_name} {value?.last_name}
          </div>
          <div className="text-sm text-gray-500">{value?.email}</div>
        </div>
      ),
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (value) => (
        <div>
          <div className="font-medium">
            Dr. {value?.first_name} {value?.last_name}
          </div>
          <div className="text-sm text-gray-500">{value?.specialization}</div>
        </div>
      ),
    },
    {
      key: 'appointment_type',
      label: 'Type',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <AdminStatusBadge
          status={value}
          variant={getStatusVariant(value)}
        />
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (value) => value || 'Not specified',
    },
  ];

  const actions: TableAction[] = [
    {
      label: 'View Details',
      icon: <Eye size={16} />,
      onClick: (row) => {
        setSelectedAppointment(row);
        setShowDetailView(true);
      },
    },
    {
      label: 'Edit',
      icon: <Edit size={16} />,
      onClick: (row) => {
        setSelectedAppointment(row);
        setShowEditModal(true);
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      onClick: (row) => {
        setSelectedAppointment(row);
        setShowDeleteModal(true);
      },
      variant: 'danger',
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      label: 'Cancel Selected',
      icon: <XCircle size={16} />,
      onClick: handleBulkCancel,
      variant: 'warning',
      requiresConfirmation: true,
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={16} />,
      onClick: handleBulkDelete,
      variant: 'danger',
      requiresConfirmation: true,
    },
  ];

  const editFields: FormField[] = [
    { name: 'appointment_date', label: 'Date', type: 'date', required: true },
    { name: 'start_time', label: 'Start Time', type: 'text', required: true },
    { name: 'end_time', label: 'End Time', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: [
      { value: 'pending', label: 'Pending' },
      { value: 'confirmed', label: 'Confirmed' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'completed', label: 'Completed' },
    ]},
    { name: 'appointment_type', label: 'Type', type: 'select', required: true, options: [
      { value: 'in-person', label: 'In Person' },
      { value: 'telemedicine', label: 'Telemedicine' },
      { value: 'follow-up', label: 'Follow-up' },
    ]},
    { name: 'reason', label: 'Reason', type: 'textarea', rows: 3 },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
  ];

  return (
    <>
      <AdminCRUDTemplate
        title="Appointment Management"
        description="Manage all appointments, schedule changes, and monitor attendance"
        icon={<Calendar size={32} className="text-blue-500" />}
        data={appointments}
        columns={columns}
        loading={loading}
        onRefresh={loadAppointments}
        onRowClick={(row) => {
          setSelectedAppointment(row);
          setShowDetailView(true);
        }}
        actions={actions}
        bulkActions={bulkActions}
        searchPlaceholder="Search by patient, provider, date..."
        emptyMessage="No appointments found"
      />

      <AdminFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedAppointment(null);
        }}
        title="Edit Appointment"
        fields={editFields.map(field => ({
          ...field,
          defaultValue: selectedAppointment?.[field.name],
        }))}
        onSubmit={handleUpdateAppointment}
        submitLabel="Update Appointment"
        size="lg"
      />

      <AdminDeleteConfirmation
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleDeleteAppointment}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment?"
        itemName={selectedAppointment ? `Appointment on ${new Date(selectedAppointment.appointment_date).toLocaleDateString()}` : ''}
      />

      {selectedAppointment && (
        <AdminDetailView
          isOpen={showDetailView}
          onClose={() => {
            setShowDetailView(false);
            setSelectedAppointment(null);
          }}
          title={`Appointment - ${new Date(selectedAppointment.appointment_date).toLocaleDateString()}`}
          subtitle={`${selectedAppointment.start_time} - ${selectedAppointment.end_time}`}
          tabs={[
            {
              id: 'details',
              label: 'Details',
              content: (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Appointment Information</h4>
                    <p>Type: {selectedAppointment.appointment_type}</p>
                    <p>Status: {selectedAppointment.status}</p>
                    <p>Reason: {selectedAppointment.reason || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Patient</h4>
                    <p>{selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}</p>
                    <p>{selectedAppointment.patient?.email}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Provider</h4>
                    <p>Dr. {selectedAppointment.provider?.first_name} {selectedAppointment.provider?.last_name}</p>
                    <p>{selectedAppointment.provider?.specialization}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'notes',
              label: 'Notes',
              content: (
                <div>
                  <p>{selectedAppointment.notes || 'No notes available'}</p>
                </div>
              ),
            },
          ]}
          onEdit={() => {
            setShowDetailView(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            setShowDetailView(false);
            setShowDeleteModal(true);
          }}
        />
      )}
    </>
  );
}
