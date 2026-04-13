import { useState } from 'react';
import DoctorHeader from '../providers/DoctorHeader';

// Sample mock availability data for each date with time slots
const mockAvailability = [
  {
    date: 'Tue, Aug 12',
    times: ['9:00 am', '9:45 am', '11:00 am', '1:00 pm', '1:45 pm', '2:00 pm', '3:00 pm'],
  },
  {
    date: 'Wed, Aug 13',
    times: ['9:00 am', '10:00 am', '11:00 am', '2:00 pm', '3:00 pm', '4:00 pm'],
  },
  {
    date: 'Thu, Aug 14',
    times: ['8:00 am', '9:00 am', '10:00 am', '11:00 am', '1:00 pm', '1:45 pm', '2:00 pm', '3:00 pm', '4:00 pm'],
  },
  {
    date: 'Fri, Aug 15',
    times: ['8:00 am', '8:45 am', '9:30 am', '10:15 am', '11:00 am', '11:45 am', '12:30 pm', '1:15 pm'],
  },
  {
    date: 'Wed, Aug 20',
    times: ['8:00 am', '10:00 am', '11:00 am', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm'],
  },
  {
    date: 'Thu, Aug 21',
    times: ['9:00 am', '10:00 am', '11:00 am', '1:00 pm', '1:45 pm', '2:30 pm', '3:00 pm', '3:15 pm', '4:00 pm', '5:00 pm'],
  },
  {
    date: 'Fri, Aug 22',
    times: ['11:00 am', '12:00 pm', '12:45 pm'],
  },
  {
    date: 'Sat, Aug 23 - Sun, Aug 24',
    times: [],
  },
  {
    date: 'Mon, Aug 25',
    times: ['10:00 am', '10:45 am', '11:00 am', '1:00 pm', '3:00 pm', '4:00 pm'],
  },
  {
    date: 'Tue, Aug 26',
    times: ['9:30 am', '10:30 am'],
  },
  {
    date: 'Wed, Aug 27',
    times: ['11:00 am'],
  },
  {
    date: 'Thu, Aug 28',
    times: [],
  },
  {
    date: 'Fri, Aug 29',
    times: ['8:30 am', '9:00 am', '9:30 am', '10:00 am'],
  },
  {
    date: 'Mon, Sep 1',
    times: ['9:00 am', '10:00 am'],
  },
  {
    date: 'Tue, Sep 2',
    times: ['11:30 am'],
  },
  // Additional entries can be added here
];

// Number of date groups to show per batch
const BATCH_SIZE = 13;

export default function AvailabilityTime() {
  // State to track how many date rows are currently visible
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  // Function to load more availability rows when button is clicked
  const showMore = () => {
    setVisibleCount((prev) => prev + BATCH_SIZE);
  };

  return (
    <div>
      <DoctorHeader/>

      {/* Section title */}
      <h2 className="text-lg font-semibold mb-1">Available appointments</h2>
      <p className="text-sm text-gray-500 mb-6">Click a time to book for free.</p>

      {/* Display availability up to the current visible count */}
      {mockAvailability.slice(0, visibleCount).map((day, idx) => (
        <div key={idx} className="mb-6">
          {/* Date heading */}
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{day.date}</h3>

          {/* Time buttons for the date */}
          {day.times.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {day.times.map((time, index) => (
                <button
                  key={index}
                  className="bg-blue-500 text-white text-sm font-medium px-3 py-1 rounded hover:bg-blue-600 transition"
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            // If no times available for the date
            <p className="text-sm text-gray-400">No available appointments</p>
          )}
        </div>
      ))}

      {/* Show more button if not all dates are visible yet */}
      {visibleCount < mockAvailability.length && (
        <div className="text-center mt-4">
          <button
            onClick={showMore}
            className="border border-gray-400 text-sm font-medium px-30 py-2 cursor-pointer rounded hover:bg-gray-100 transition"
          >
            Show more availability
          </button>
        </div>
      )}
    </div>
  );
}
