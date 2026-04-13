
import { UserCog, Video, Building2 } from 'lucide-react';

  const doctor = {
    available: true,
    highlyRated: true,
  };


export default function DoctorHeader() {
  return (
    <div className="overflow-y-auto p-2">
      <h1 className="text-xl font-bold mb-5">Book an Appointment</h1>

      {/* Doctor info */}
      <div className="flex items-center space-x-4 mb-4">
<img
          src="/image/doctor1.jpg"
          alt="Doctor"
          width={80}
          height={80}
          className="w-20 h-20 rounded-full object-cover"
        />
        <div>
          <h3 className="text-lg font-bold">Dr. Young Jun Cho, DDS, FICOI</h3>
          <p className="text-sm mt-1 text-blue-600">4.86 ★ (122 reviews)</p>
                <div className="flex gap-2 mt-2">
                  {doctor.available && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      Available today
                    </span>
                  )}
                  {doctor.highlyRated && (
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">
                      Highly rated
                    </span>
                  )}
                </div>

        </div>
      </div>

      {/* Specialties */}
            <div className="flex items-center mt-3 text-sm space-x-5">
              <div className="flex items-center space-x-2">
                <UserCog className="text-black" />
                <span className="text-sm font-semibold">Dentist</span>
              </div>
              <div className="h-3 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Video className="text-black" />
                <span className="font-semibold text-sm">Telehealth</span>
              </div>
              <div className="h-3 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <Building2 className="text-black" />
                <span className="font-semibold text-sm">In-person</span>
              </div>
            </div>

      {/* Scheduling dropdown */}
      <div className="mb-4 mt-6">
        <label className="block text-sm font-medium mb-3">Scheduling details</label>
        <select className="w-full border rounded px-3 py-3 text-sm">
          <option>Routine Dental Exam</option>
        </select>
      </div>

      {/* Insurance placeholder */}
      <button className="w-full border rounded px-3 py-3 text-sm flex items-center justify-center gap-2 mb-10">
        <span>➕</span> I’ll choose my insurance later
      </button>
    </div>
  );
}
