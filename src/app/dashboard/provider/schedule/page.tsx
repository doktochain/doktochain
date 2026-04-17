import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../../contexts/AuthContext';
import { providerService, ProviderSchedule, ProviderLocation } from '../../../../services/providerService';
import { api } from '../../../../lib/api-client';
import { Clock, Plus, Trash2, MapPin, CalendarOff, CalendarPlus } from 'lucide-react';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ProviderScheduleManagement() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [schedules, setSchedules] = useState<ProviderSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'weekly' | 'overrides'>('weekly');
  const [overrides, setOverrides] = useState<any[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
  });
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [newOverride, setNewOverride] = useState({
    override_date: '',
    is_available: true,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,
    reason: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'schedule' | 'override' } | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const providerData = await providerService.getProviderByUserId(user.id);
      setProvider(providerData);

      if (!providerData) {
        setLoading(false);
        return;
      }

      const [locationsResult, schedulesResult] = await Promise.allSettled([
        providerService.getLocations(providerData.id),
        providerService.getSchedule(providerData.id),
      ]);

      const locationsData = locationsResult.status === 'fulfilled' ? locationsResult.value : [];
      const schedulesData = schedulesResult.status === 'fulfilled' ? schedulesResult.value : [];

      setLocations(locationsData);
      setSchedules(schedulesData);

      if (locationsData.length > 0 && !selectedLocation) {
        setSelectedLocation(locationsData[0].id);
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: overridesData } = await api.get<any[]>('/provider-unavailability', {
          params: {
            provider_id: providerData.id,
            end_date_gte: today,
            order: 'start_date:asc',
          },
        });
        setOverrides(overridesData || []);
      } catch {
        setOverrides([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!provider) {
      toast.error('Provider profile not loaded');
      return;
    }
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }
    if (newSchedule.end_time <= newSchedule.start_time) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      await providerService.addSchedule({
        provider_id: provider.id,
        location_id: selectedLocation,
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        slot_duration_minutes: newSchedule.slot_duration_minutes,
        is_available: true,
      });

      toast.success('Time slot added');
      setShowAddModal(false);
      setNewSchedule({
        day_of_week: newSchedule.day_of_week,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
      });

      loadData();
    } catch (error: any) {
      console.error('Error adding schedule:', error);
      toast.error(error?.message || 'Failed to add schedule');
    }
  };

  const handleAddOverride = async () => {
    if (!provider || !newOverride.override_date) return;

    try {
      const insertData: any = {
        provider_id: provider.id,
        start_date: newOverride.override_date,
        end_date: newOverride.override_date,
        reason: newOverride.reason || (newOverride.is_available ? 'Custom hours' : 'Unavailable'),
        is_recurring: false,
        recurrence_pattern: newOverride.is_available
          ? {
              is_available: true,
              start_time: newOverride.start_time,
              end_time: newOverride.end_time,
              slot_duration_minutes: newOverride.slot_duration_minutes,
            }
          : { is_available: false },
      };

      const { error } = await api.post('/provider-unavailability', insertData);
      if (error) throw error;

      toast.success('Date override saved');
      setShowOverrideModal(false);
      setNewOverride({
        override_date: '',
        is_available: true,
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: 30,
        reason: '',
      });
      loadData();
    } catch (error: any) {
      console.error('Error adding override:', error);
      toast.error(`Failed to add override: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteOverride = (overrideId: string) => {
    setDeleteTarget({ id: overrideId, type: 'override' });
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setDeleteTarget({ id: scheduleId, type: 'schedule' });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'override') {
        const { error } = await api.delete(`/provider-unavailability/${deleteTarget.id}`);
        if (error) throw error;
      } else {
        await providerService.deleteSchedule(deleteTarget.id);
      }
      toast.success('Removed');
      loadData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error?.message || 'Failed to delete item');
    }
  };

  const getSchedulesForDay = (dayOfWeek: number) => {
    return schedules
      .filter((s) => s.day_of_week === dayOfWeek)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schedule Management</h1>
          <p className="text-muted-foreground mt-1">Manage your availability and working hours</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          disabled={locations.length === 0}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700"
          title={locations.length === 0 ? 'Add a location first' : ''}
        >
          <Plus className="w-4 h-4" />
          Add Time Slot
        </Button>
      </div>

      {locations.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">You need to add a location before setting your schedule</p>
          <Button
            onClick={() => window.location.href = `/${document.documentElement.lang || 'en'}/dashboard/provider/locations`}
            className="bg-sky-600 hover:bg-sky-700"
          >
            Add Location
          </Button>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocation(location.id)}
                    className={`p-4 border-2 rounded-xl text-left transition ${
                      selectedLocation === location.id
                        ? 'border-sky-600 bg-sky-50'
                        : 'border hover:border-input'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedLocation === location.id ? 'text-sky-600' : 'text-muted-foreground'}`} />
                      <div>
                        <h4 className="font-semibold text-foreground">{location.location_name}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {location.city}, {location.province}
                        </p>
                        {location.is_primary && (
                          <Badge variant="info" className="mt-2">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Buffer Time Between Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[0, 5, 10, 15].map((mins) => (
                  <Button
                    key={mins}
                    variant="outline"
                    onClick={() => setBufferMinutes(mins)}
                    className={`px-4 py-2 border-2 text-sm font-medium transition ${
                      bufferMinutes === mins
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border text-muted-foreground hover:border-input'
                    }`}
                  >
                    {mins === 0 ? 'None' : `${mins} min`}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Buffer time is automatically added between consecutive appointments</p>
            </CardContent>
          </Card>

          <Card>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'overrides')}>
              <div className="border-b">
                <TabsList className="bg-transparent h-auto p-0 rounded-none">
                  <TabsTrigger
                    value="weekly"
                    className="px-6 py-4 text-sm font-medium flex items-center gap-2 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-sky-600 border-b-2 border-transparent data-[state=active]:border-sky-600"
                  >
                    <Clock className="w-4 h-4" />
                    Weekly Schedule
                  </TabsTrigger>
                  <TabsTrigger
                    value="overrides"
                    className="px-6 py-4 text-sm font-medium flex items-center gap-2 rounded-none data-[state=active]:shadow-none data-[state=active]:bg-transparent data-[state=active]:text-sky-600 border-b-2 border-transparent data-[state=active]:border-sky-600"
                  >
                    <CalendarOff className="w-4 h-4" />
                    Date Overrides
                    {overrides.length > 0 && (
                      <Badge variant="info" className="ml-1 px-1.5 py-0.5 text-xs">{overrides.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="weekly" className="mt-0">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-foreground">Weekly Schedule</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your recurring availability for each day</p>
                </div>

                <div className="divide-y divide-border">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const daySchedules = getSchedulesForDay(index);
                    const isWeekend = index === 0 || index === 6;

                    return (
                      <div key={index} className={`p-5 ${isWeekend && daySchedules.length === 0 ? 'bg-muted/50' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="font-semibold text-foreground w-28">{day}</h4>
                              {daySchedules.length === 0 && (
                                <span className="text-sm text-muted-foreground">Not available</span>
                              )}
                            </div>

                            {daySchedules.length > 0 && (
                              <div className="space-y-2 ml-0">
                                {daySchedules.map((schedule) => (
                                  <div
                                    key={schedule.id}
                                    className="flex items-center gap-4 p-3 bg-sky-50/50 border border-sky-100 rounded-lg group"
                                  >
                                    <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="font-medium text-foreground text-sm">
                                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {schedule.slot_duration_minutes} min slots
                                      </p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNewSchedule({ ...newSchedule, day_of_week: index });
                              setShowAddModal(true);
                            }}
                            className="text-muted-foreground hover:text-sky-600 hover:bg-sky-50"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="overrides" className="mt-0">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Date Overrides</h3>
                      <p className="text-sm text-muted-foreground mt-1">Set custom hours or block specific dates</p>
                    </div>
                    <Button
                      onClick={() => setShowOverrideModal(true)}
                      className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700"
                      size="sm"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Add Override
                    </Button>
                  </div>

                  {overrides.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-1">No date overrides set</p>
                      <p className="text-sm text-muted-foreground">Use overrides to block days off or set custom hours for specific dates</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {overrides.map((override) => {
                        const rp = override.recurrence_pattern || {};
                        const isAvailable = rp.is_available !== false;
                        const overrideDate = override.start_date || override.override_date;
                        return (
                        <div
                          key={override.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            isAvailable
                              ? 'bg-sky-50/50 border-sky-100'
                              : 'bg-red-50/50 border-red-100'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isAvailable ? 'bg-sky-100' : 'bg-red-100'}`}>
                            {isAvailable ? (
                              <Clock className="w-5 h-5 text-sky-600" />
                            ) : (
                              <CalendarOff className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {new Date(overrideDate + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isAvailable && rp.start_time && rp.end_time
                                ? `Custom hours: ${formatTime(rp.start_time)} - ${formatTime(rp.end_time)}${rp.slot_duration_minutes ? ` (${rp.slot_duration_minutes}m slots)` : ''}`
                                : 'Unavailable'}
                              {override.reason && ` -- ${override.reason}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteOverride(override.id)}
                            className="text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground bg-sky-50 border border-sky-100 rounded-md p-2">
              Tip: add multiple slots per day to carve out breaks. For example, add "9:00 AM – 12:00 PM" and
              "1:00 PM – 5:00 PM" to make 12:00 – 1:00 PM unavailable.
            </p>
            <div>
              <Label className="mb-2 block">Day of Week</Label>
              <Select
                value={String(newSchedule.day_of_week)}
                onValueChange={(value) =>
                  setNewSchedule({ ...newSchedule, day_of_week: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Start Time</Label>
                <Input
                  type="time"
                  value={newSchedule.start_time}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, start_time: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="mb-2 block">End Time</Label>
                <Input
                  type="time"
                  value={newSchedule.end_time}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Slot Duration</Label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 20, 30, 45, 60].map((duration) => (
                  <Button
                    key={duration}
                    type="button"
                    variant="outline"
                    onClick={() => setNewSchedule({ ...newSchedule, slot_duration_minutes: duration })}
                    className={`px-3 py-2 border-2 text-sm font-medium transition ${
                      newSchedule.slot_duration_minutes === duration
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border text-muted-foreground hover:border-input'
                    }`}
                  >
                    {duration}m
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAddSchedule}
                className="flex-1 bg-sky-600 hover:bg-sky-700"
              >
                Add Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === 'override' ? 'Remove Date Override' : 'Remove Time Slot'}
        description={deleteTarget?.type === 'override'
          ? 'Are you sure you want to remove this date override? This action cannot be undone.'
          : 'Are you sure you want to remove this time slot? This action cannot be undone.'}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={executeDelete}
      />

      <Dialog open={showOverrideModal} onOpenChange={setShowOverrideModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Date Override</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Date</Label>
              <Input
                type="date"
                value={newOverride.override_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewOverride({ ...newOverride, override_date: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-2 block">Availability</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewOverride({ ...newOverride, is_available: true })}
                  className={`flex-1 border-2 text-sm font-medium transition ${
                    newOverride.is_available
                      ? 'border-sky-600 bg-sky-50 text-sky-700'
                      : 'border text-muted-foreground hover:border-input'
                  }`}
                >
                  Custom Hours
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewOverride({ ...newOverride, is_available: false })}
                  className={`flex-1 border-2 text-sm font-medium transition ${
                    !newOverride.is_available
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border text-muted-foreground hover:border-input'
                  }`}
                >
                  Unavailable
                </Button>
              </div>
            </div>

            {newOverride.is_available && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Start Time</Label>
                    <Input
                      type="time"
                      value={newOverride.start_time}
                      onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">End Time</Label>
                    <Input
                      type="time"
                      value={newOverride.end_time}
                      onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Slot Duration</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 20, 30, 45, 60].map((duration) => (
                      <Button
                        key={duration}
                        type="button"
                        variant="outline"
                        onClick={() => setNewOverride({ ...newOverride, slot_duration_minutes: duration })}
                        className={`px-3 py-2 border-2 text-sm font-medium transition ${
                          newOverride.slot_duration_minutes === duration
                            ? 'border-sky-600 bg-sky-50 text-sky-700'
                            : 'border text-muted-foreground hover:border-input'
                        }`}
                      >
                        {duration}m
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <Label className="mb-2 block">
                Reason <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                type="text"
                value={newOverride.reason}
                onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
                placeholder="e.g., Holiday, Conference, Personal day"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAddOverride}
                disabled={!newOverride.override_date}
                className="flex-1 bg-sky-600 hover:bg-sky-700"
              >
                Add Override
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowOverrideModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
