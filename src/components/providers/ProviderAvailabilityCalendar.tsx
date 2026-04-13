import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DaySlot {
  date: Date;
  dayName: string;
  dayNum: string;
  monthName: string;
  appointmentCount: number;
}

interface ProviderAvailabilityCalendarProps {
  providerId: string;
  onViewMore?: () => void;
  compact?: boolean;
}

function generateMockAvailability(startDate: Date, days: number): DaySlot[] {
  const slots: DaySlot[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    const dayOfWeek = d.getDay();
    let count = 0;
    if (dayOfWeek !== 0) {
      const seed = (d.getDate() * 7 + d.getMonth() * 13) % 10;
      if (seed < 3) count = 0;
      else if (seed < 5) count = Math.floor(seed / 2) + 1;
      else count = seed - 2;
    }

    slots.push({
      date: d,
      dayName: dayNames[dayOfWeek],
      dayNum: monthNames[d.getMonth()] + ' ' + d.getDate(),
      monthName: monthNames[d.getMonth()],
      appointmentCount: count,
    });
  }
  return slots;
}

export default function ProviderAvailabilityCalendar({
  onViewMore,
  compact = false,
}: ProviderAvailabilityCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  const slots = useMemo(() => generateMockAvailability(startDate, 14), [startDate]);

  const week1 = slots.slice(0, 7);
  const week2 = slots.slice(7, 14);

  const formatDateRange = () => {
    const first = slots[0];
    const last = slots[slots.length - 1];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fm = monthNames[first.date.getMonth()];
    const lm = monthNames[last.date.getMonth()];
    const prefix = weekOffset === 0 ? 'Today, ' : '';
    return `${prefix}${fm} ${first.date.getDate()} - ${last.date.getDay() === 0 ? 'Sun' : last.dayName}, ${lm} ${last.date.getDate()}`;
  };

  const renderDayCell = (slot: DaySlot) => {
    const hasAppts = slot.appointmentCount > 0;
    const bgClass = hasAppts ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500';

    return (
      <div
        key={slot.date.toISOString()}
        className={`flex flex-col items-center justify-center rounded-lg ${bgClass} ${
          compact ? 'p-1.5 min-w-[60px]' : 'p-2 min-w-[70px]'
        } cursor-pointer hover:opacity-90 transition-opacity`}
      >
        <span className={`font-bold ${compact ? 'text-xs' : 'text-sm'}`}>{slot.dayName}</span>
        <span className={compact ? 'text-[10px]' : 'text-xs'}>{slot.dayNum}</span>
        <span className={`font-bold ${compact ? 'text-xs' : 'text-sm'} mt-0.5`}>
          {hasAppts ? slot.appointmentCount : 'No'}
        </span>
        <span className={compact ? 'text-[10px]' : 'text-xs'}>
          {slot.appointmentCount === 1 ? 'appt' : 'appts'}
        </span>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-blue-600">{formatDateRange()}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-blue-500" />
          </button>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-blue-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1">
          {week1.map(renderDayCell)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {week2.slice(0, 6).map(renderDayCell)}
          <div
            onClick={onViewMore}
            className="flex flex-col items-center justify-center rounded-lg bg-white border-2 border-dashed border-gray-300 p-2 min-w-[70px] cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-600">More</span>
          </div>
        </div>
      </div>

      {onViewMore && (
        <button
          onClick={onViewMore}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-3 block text-right w-full"
        >
          View more availability
        </button>
      )}
    </div>
  );
}
