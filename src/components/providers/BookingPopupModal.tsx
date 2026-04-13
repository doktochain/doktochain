import { useState, useMemo } from 'react';
import { X, Star, MapPin, Video, Home, Stethoscope, ChevronDown } from 'lucide-react';

interface BookingPopupModalProps {
  provider: {
    id: string;
    name: string;
    title: string;
    specialty: string;
    rating: number;
    reviewCount: number;
    photoUrl?: string;
    offersTelemedicine: boolean;
    offersInPerson: boolean;
  };
  isOpen: boolean;
  onClose: () => void;
  onBookSlot?: (date: string, time: string) => void;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySchedule {
  date: Date;
  label: string;
  slots: TimeSlot[];
}

function generateMockTimeSlots(date: Date): TimeSlot[] {
  const seed = (date.getDate() * 7 + date.getMonth() * 13) % 10;
  if (date.getDay() === 0 || date.getDay() === 6) {
    if (seed < 5) return [];
    return [
      { time: '10:00 am', available: true },
      { time: '11:00 am', available: true },
    ];
  }

  const allTimes = [
    '8:30 am', '9:00 am', '9:30 am', '9:45 am', '10:00 am', '10:30 am',
    '10:45 am', '11:00 am', '11:30 am', '12:00 pm', '12:45 pm',
    '1:00 pm', '1:45 pm', '2:00 pm', '2:30 pm', '3:00 pm',
    '3:30 pm', '4:00 pm', '4:30 pm',
  ];

  const count = Math.max(0, Math.min(allTimes.length, seed + 2));
  if (count === 0) return [];

  const step = Math.floor(allTimes.length / count);
  return Array.from({ length: count }, (_, i) => ({
    time: allTimes[Math.min(i * step, allTimes.length - 1)],
    available: true,
  }));
}

function generateWeekSchedule(startDate: Date, days: number): DaySchedule[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const schedule: DaySchedule[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    schedule.push({
      date: d,
      label: `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`,
      slots: generateMockTimeSlots(d),
    });
  }

  return schedule;
}

export default function BookingPopupModal({
  provider,
  isOpen,
  onClose,
  onBookSlot,
}: BookingPopupModalProps) {
  const [showMoreDays, setShowMoreDays] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const schedule = useMemo(
    () => generateWeekSchedule(today, showMoreDays ? 14 : 7),
    [today, showMoreDays]
  );

  if (!isOpen) return null;

  const handleSlotClick = (dayLabel: string, time: string) => {
    if (onBookSlot) {
      onBookSlot(dayLabel, time);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Book an Appointment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {provider.photoUrl ? (
                <img src={provider.photoUrl} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-blue-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900">{provider.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-700">{provider.rating.toFixed(2)}</span>
                <span className="text-sm text-gray-500">({provider.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" />
                  {provider.specialty}
                </span>
                {provider.offersTelemedicine && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" />
                      Telehealth
                    </span>
                  </>
                )}
                {provider.offersInPerson && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1">
                      <Home className="w-3.5 h-3.5" />
                      In-person
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <h4 className="font-bold text-gray-900 mb-1">Available appointments</h4>
          <p className="text-sm text-gray-500 mb-4">Click a time to book for free.</p>

          <div className="space-y-5">
            {schedule.map((day) => (
              <div key={day.label}>
                <p className="text-sm font-semibold text-gray-800 mb-2">{day.label}</p>
                {day.slots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => handleSlotClick(day.label, slot.time)}
                        className="bg-blue-600 text-white text-sm px-3.5 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No available appointments</p>
                )}
              </div>
            ))}
          </div>

          {!showMoreDays && (
            <button
              onClick={() => setShowMoreDays(true)}
              className="w-full mt-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              Show more availability
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
