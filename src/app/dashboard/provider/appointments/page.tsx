import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { Appointment } from '../../../../services/appointmentService';
import { enhancedAppointmentService, AppointmentFilters } from '../../../../services/enhancedAppointmentService';
import { providerService } from '../../../../services/providerService';
import AppointmentListView from '../../../../components/appointments/AppointmentListView';
import AppointmentCalendarView from '../../../../components/appointments/AppointmentCalendarView';
import AppointmentKanbanView from '../../../../components/appointments/AppointmentKanbanView';
import WaitlistManagement from '../../../../components/appointments/WaitlistManagement';
import {
  ConfirmAppointmentModal,
  CancelAppointmentModal,
  RescheduleAppointmentModal,
} from '../../../../components/appointments/AppointmentActionModals';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { Calendar, List, Columns2 as Columns, Users, Filter, Download, Search, Clock, MapPin, AlertCircle } from 'lucide-react';

type ViewMode = 'list' | 'calendar' | 'kanban' | 'waitlist';
type CalendarView = 'day' | 'week' | 'month';

export default function ProviderAppointmentsPage() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const [filters, setFilters] = useState<AppointmentFilters>({
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    status: [],
    searchQuery: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProviderData();
  }, [user]);

  useEffect(() => {
    if (provider) {
      loadAppointments();
    }
  }, [provider, filters]);

  const loadProviderData = async () => {
    if (!user) return;

    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      setProvider(providerData);
    } catch (error) {
      console.error('Error loading provider:', error);
    }
  };

  const loadAppointments = async () => {
    if (!provider) return;

    try {
      setLoading(true);
      const data = await enhancedAppointmentService.getAppointments(provider.id, filters);
      setAppointments(data);
      setFilteredAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowConfirmModal(true);
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await enhancedAppointmentService.confirmAppointment(appointmentId);
      await loadAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  const handleBulkAction = async (appointmentIds: string[], action: string) => {
    if (action === 'confirm') {
      try {
        await enhancedAppointmentService.bulkConfirmAppointments(appointmentIds);
        await loadAppointments();
      } catch (error) {
        console.error('Error confirming appointments:', error);
      }
    } else if (action === 'send-reminder') {
      console.log('Send reminder to:', appointmentIds);
    }
  };

  const handleCancelAppointment = async (data: {
    appointmentId: string;
    reason: string;
    category: string;
    offerReschedule: boolean;
    cancellationFee: number;
  }) => {
    try {
      await enhancedAppointmentService.cancelAppointmentWithDetails(data.appointmentId, {
        cancelledBy: user!.id,
        cancelledByRole: 'provider',
        reason: data.reason,
        category: data.category as any,
        offeredReschedule: data.offerReschedule,
        cancellationFee: data.cancellationFee,
      });
      await loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
  };

  const handleRescheduleAppointment = async (
    appointmentId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ) => {
    try {
      const updatedAppointment = await enhancedAppointmentService.rescheduleAppointment(
        appointmentId,
        newDate,
        newStartTime,
        newEndTime
      );
      await loadAppointments();
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      await enhancedAppointmentService.updateAppointmentStatus(appointmentId, newStatus);
      await loadAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const blob = await enhancedAppointmentService.exportAppointments(filteredAppointments, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting appointments:', error);
    }
  };

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    inProgress: appointments.filter(a => a.status === 'in-progress').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Appointment Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your appointments, schedule, and patient waitlist
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Scheduled</div>
          <div className="text-2xl font-bold text-foreground">{stats.scheduled}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Confirmed</div>
          <div className="text-2xl font-bold">
            <Badge variant="success" className="text-2xl font-bold px-0 py-0 border-0 bg-transparent">{stats.confirmed}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">In Progress</div>
          <div className="text-2xl font-bold">
            <Badge variant="warning" className="text-2xl font-bold px-0 py-0 border-0 bg-transparent">{stats.inProgress}</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold">
            <Badge variant="info" className="text-2xl font-bold px-0 py-0 border-0 bg-transparent">{stats.completed}</Badge>
          </div>
        </Card>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateRange?.start}
                    onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange!, start: e.target.value } })}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={filters.dateRange?.end}
                    onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange!, end: e.target.value } })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    placeholder="Patient name or ID..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <Select
                  value={filters.status?.[0] || 'all'}
                  onValueChange={(value) => setFilters({
                    ...filters,
                    status: value === 'all' ? [] : [value as Appointment['status']]
                  })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-2">
                  <Columns className="w-4 h-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="waitlist" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Waitlist
                </TabsTrigger>
              </TabsList>

              {viewMode === 'calendar' && (
                <div className="flex gap-2">
                  <Button
                    variant={calendarView === 'day' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('day')}
                  >
                    Day
                  </Button>
                  <Button
                    variant={calendarView === 'week' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={calendarView === 'month' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setCalendarView('month')}
                  >
                    Month
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <TabsContent value="list" className="mt-0">
              <AppointmentListView
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
                onBulkAction={handleBulkAction}
              />
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              <AppointmentCalendarView
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
                view={calendarView}
              />
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              <AppointmentKanbanView
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
                onStatusChange={handleStatusChange}
              />
            </TabsContent>

            <TabsContent value="waitlist" className="mt-0">
              {provider && <WaitlistManagement providerId={provider.id} />}
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {selectedAppointment && showConfirmModal && (
        <ConfirmAppointmentModal
          appointment={selectedAppointment}
          onConfirm={handleConfirmAppointment}
          onClose={() => {
            setShowConfirmModal(false);
            setSelectedAppointment(null);
          }}
        />
      )}

      {selectedAppointment && showCancelModal && (
        <CancelAppointmentModal
          appointment={selectedAppointment}
          onCancel={handleCancelAppointment}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedAppointment(null);
          }}
        />
      )}

      {selectedAppointment && showRescheduleModal && (
        <RescheduleAppointmentModal
          appointment={selectedAppointment}
          onReschedule={handleRescheduleAppointment}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
}
