import { Calendar } from 'lucide-react';

interface DateTimeSelectionStepProps {
  slots: any[];
  loading: boolean;
  onSelect: (slot: any) => void;
  onBack: () => void;
}

export default function DateTimeSelectionStep({ slots, loading, onSelect, onBack }: DateTimeSelectionStepProps) {
  const groupedSlots: Record<string, any[]> = {};
  slots.forEach((slot) => {
    if (!groupedSlots[slot.slot_date]) groupedSlots[slot.slot_date] = [];
    groupedSlots[slot.slot_date].push(slot);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Select Date & Time</h2>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto" />
        </div>
      ) : Object.keys(groupedSlots).length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No available time slots found for the next 30 days.</p>
          <p className="text-sm text-gray-500 mt-2">Try a different consultation method or contact the clinic.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSlots).map(([date, dateSlots]) => (
            <div key={date}>
              <h3 className="font-semibold text-lg mb-3">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {dateSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => onSelect(slot)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:border-sky-600 hover:bg-sky-50 transition text-sm font-medium"
                  >
                    {slot.slot_time?.substring(0, 5)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onBack}
        className="mt-6 px-6 py-2 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50"
      >
        Back
      </button>
    </div>
  );
}
