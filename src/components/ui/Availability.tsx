
import { useState, useRef,useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AvailabilityTime from './AvailabilityTime';

// Define the type for a single appointment day
type AppointmentDay = {
  day: string;
  date: string;
  appts: number;
};

// Constant for how many days to show per calendar page
const DAYS_PER_PAGE = 14;

// Mocked appointment data (could be fetched dynamically in real usage)
const mockData: AppointmentDay[] = [
  { day: 'Tue', date: 'Apr 8', appts: 0 },
  { day: 'Wed', date: 'Apr 9', appts: 2 },
  { day: 'Thu', date: 'Apr 10', appts: 4 },
  { day: 'Fri', date: 'Apr 11', appts: 6 },
  { day: 'Sat', date: 'Apr 12', appts: 8 },
  { day: 'Sun', date: 'Apr 13', appts: 1 },
  { day: 'Mon', date: 'Apr 14', appts: 0 },
  { day: 'Tue', date: 'Apr 15', appts: 5 },
  { day: 'Wed', date: 'Apr 16', appts: 7 },
  { day: 'Thu', date: 'Apr 17', appts: 0 },
  { day: 'Fri', date: 'Apr 18', appts: 2 },
  { day: 'Sat', date: 'Apr 19', appts: 4 },
  { day: 'Sun', date: 'Apr 20', appts: 0 },
  { day: 'Mon', date: 'Apr 21', appts: 8 },
  { day: 'Tue', date: 'Apr 22', appts: 0 },
  { day: 'Wed', date: 'Apr 23', appts: 2 },
  { day: 'Thu', date: 'Apr 24', appts: 4 },
  { day: 'Fri', date: 'Apr 25', appts: 6 },
  { day: 'Sat', date: 'Apr 26', appts: 8 },
  { day: 'Sun', date: 'Apr 27', appts: 1 },
  { day: 'Mon', date: 'Apr 28', appts: 0 },
  { day: 'Tue', date: 'Apr 29', appts: 5 },
  { day: 'Wed', date: 'Apr 30', appts: 7 },
  { day: 'Thu', date: 'May 1', appts: 0 },
  { day: 'Fri', date: 'May 2', appts: 2 },
  { day: 'Sat', date: 'May 3', appts: 4 },
  { day: 'Sun', date: 'May 4', appts: 0 },
  { day: 'Mon', date: 'May 5', appts: 8 },
];

export default function Availability() {
  // Track which page of appointments is currently visible
  const [page, setPage] = useState(0);
  //
  const modalRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Total number of pages based on the data and DAYS_PER_PAGE
  const totalPages = Math.ceil(mockData.length / DAYS_PER_PAGE);
  
  // Slice out the relevant data for the current page
  const startIndex = page * DAYS_PER_PAGE;
  const currentPage = mockData.slice(startIndex, startIndex + DAYS_PER_PAGE);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

    // Close modal when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          closeModal();
        }
      };

      if (isModalOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isModalOpen]);

  return (
    <div className="mt-8 relative">
      {/* Header: Date range and navigation buttons */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-blue-600">
          Today, Apr 8 – Mon, Apr 21
        </p>

        {/* Navigation arrows - Conditionally render arrows only if there is more than one page */}
        {totalPages > 1 && (
          <div className="flex gap-2">
            {/* Previous Arrow */}
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className="p-2 rounded-full bg-blue-100 text-blue-600 shadow disabled:opacity-30 hover:bg-blue-300 transition"
            >
              <ChevronLeft size={20} />
            </button>
            
            {/* Next Arrow */}
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page === totalPages - 1}
              className="p-2 rounded-full bg-blue-100 text-blue-600 shadow disabled:opacity-30 hover:bg-blue-300 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Availability Grid: 7-column layout (1 for each day of the week) */}
      <div className="grid grid-cols-7 gap-0.5">
        {currentPage.map((day, idx) => (
          <div
            key={idx}
            onClick={() => day.appts > 0 && openModal()}
            className={`rounded p-3 text-center text-sm transition-all duration-200 flex flex-col justify-center items-center space-y-1.5 cursor-pointer ${
              day.appts > 0
                ? 'bg-blue-500 text-white font-medium hover:bg-blue-600' // Active availability
                : 'bg-gray-400 text-white cursor-default' // No appointments
            }`}
          >
            <p className="font-bold">{day.day}</p>
            <p className="text-xs">{day.date}</p>
            <p className="text-xs font-bold">{day.appts > 0 ? day.appts : 'No'}</p>
            <p className="text-xs">
              {day.appts > 0 ? (day.appts > 1 ? 'appts' : 'appt') : 'appts'}
            </p>
          </div>
        ))}
      </div>

      {/* CTA: Link to additional availability */}
      <div className="mt-4 text-right">
        <button
          onClick={openModal}
          className="text-blue-600 text-sm cursor-pointer font-medium hover:underline"
        >
          View more availability
        </button>
      </div>

      {/* Modal Popup with close on backdrop click */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={modalRef}
            className="bg-white w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-md shadow-lg relative p-6"
          >
            {/* Close button wrapped in a hoverable square */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-5 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xl cursor-pointer transition"
            >
              x
            </button>

            {/* Modal Content */}
            <AvailabilityTime />
          </div>
        </div>
      )}    </div>
  );
}
