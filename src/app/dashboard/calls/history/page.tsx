import { useState } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { History, Phone, Video, PhoneIncoming, PhoneOutgoing, User, Search } from 'lucide-react';

interface CallHistory {
  id: string;
  contact_name: string;
  contact_role: string;
  call_type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'declined';
  duration: string;
  date: string;
  time: string;
}

export default function CallHistoryPage() {
  const { currentColors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [callHistory] = useState<CallHistory[]>([
    {
      id: '1',
      contact_name: 'Dr. Sarah Johnson',
      contact_role: 'Cardiologist',
      call_type: 'video',
      direction: 'incoming',
      status: 'completed',
      duration: '45:30',
      date: 'Today',
      time: '10:30 AM',
    },
    {
      id: '2',
      contact_name: 'John Smith',
      contact_role: 'Patient',
      call_type: 'voice',
      direction: 'outgoing',
      status: 'completed',
      duration: '12:15',
      date: 'Today',
      time: '9:00 AM',
    },
    {
      id: '3',
      contact_name: 'Dr. Michael Chen',
      contact_role: 'Neurologist',
      call_type: 'video',
      direction: 'outgoing',
      status: 'missed',
      duration: '0:00',
      date: 'Yesterday',
      time: '4:30 PM',
    },
    {
      id: '4',
      contact_name: 'Jane Doe',
      contact_role: 'Patient',
      call_type: 'voice',
      direction: 'incoming',
      status: 'declined',
      duration: '0:00',
      date: 'Yesterday',
      time: '2:15 PM',
    },
  ]);

  const filteredHistory = callHistory.filter((call) =>
    call.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'missed':
        return 'text-red-600';
      case 'declined':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: currentColors.text }}>
            Call History
          </h1>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search call history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                style={{ color: currentColors.text }}
              />
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2" style={{ color: currentColors.text }}>
                No Call History
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your call history will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredHistory.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: currentColors.primary }}
                          >
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: currentColors.text }}>
                              {call.contact_name}
                            </div>
                            <div className="text-sm text-gray-500">{call.contact_role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {call.call_type === 'video' ? (
                            <Video className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Phone className="w-5 h-5 text-green-500" />
                          )}
                          <span className="text-sm capitalize" style={{ color: currentColors.text }}>
                            {call.call_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {call.direction === 'incoming' ? (
                            <PhoneIncoming className="w-5 h-5 text-gray-500" />
                          ) : (
                            <PhoneOutgoing className="w-5 h-5 text-gray-500" />
                          )}
                          <span className="text-sm capitalize" style={{ color: currentColors.text }}>
                            {call.direction}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm capitalize ${getStatusColor(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm" style={{ color: currentColors.text }}>
                          {call.duration}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm" style={{ color: currentColors.text }}>
                          {call.date}
                        </div>
                        <div className="text-sm text-gray-500">{call.time}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
