import React, { useState, useEffect } from 'react';
import { healthRecordsService, HealthTimelineEvent } from '../../services/healthRecordsService';
import {
  Activity,
  Pill,
  AlertTriangle,
  Syringe,
  FileText,
  Calendar,
  Filter,
  ChevronRight,
} from 'lucide-react';

interface Props {
  patientId: string;
}

export default function HealthTimelineTab({ patientId }: Props) {
  const [events, setEvents] = useState<HealthTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  useEffect(() => {
    if (patientId) {
      loadTimeline();
    }
  }, [patientId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const data = await healthRecordsService.getHealthTimeline(patientId);
      setEvents(data);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'lab':
        return Activity;
      case 'medication':
        return Pill;
      case 'allergy':
        return AlertTriangle;
      case 'immunization':
        return Syringe;
      case 'clinical_note':
        return FileText;
      default:
        return Calendar;
    }
  };

  const getEventColor = (type: string, severity?: string) => {
    if (severity === 'critical' || severity === 'life-threatening') {
      return 'bg-red-100 text-red-600 border-red-200';
    }
    if (severity === 'severe' || severity === 'high') {
      return 'bg-orange-100 text-orange-600 border-orange-200';
    }

    switch (type) {
      case 'lab':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'medication':
        return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'allergy':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      case 'immunization':
        return 'bg-green-100 text-green-600 border-green-200';
      case 'clinical_note':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filterType !== 'all' && event.type !== filterType) return false;

    if (dateRange !== 'all') {
      const eventDate = new Date(event.date);
      const now = new Date();
      const monthsAgo = parseInt(dateRange);
      const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
      if (eventDate < cutoffDate) return false;
    }

    return true;
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const dateKey = new Date(event.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, HealthTimelineEvent[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Events</option>
          <option value="lab">Lab Results</option>
          <option value="medication">Medications</option>
          <option value="allergy">Allergies</option>
          <option value="immunization">Immunizations</option>
          <option value="clinical_note">Clinical Notes</option>
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Time</option>
          <option value="3">Last 3 Months</option>
          <option value="6">Last 6 Months</option>
          <option value="12">Last Year</option>
          <option value="24">Last 2 Years</option>
        </select>

        <div className="ml-auto text-sm text-gray-600">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center z-10 relative">
                    <Calendar className="w-6 h-6 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{month}</h3>
                </div>

                <div className="ml-16 space-y-4">
                  {monthEvents.map((event) => {
                    const Icon = getEventIcon(event.type);
                    const colorClass = getEventColor(event.type, event.severity);

                    return (
                      <div
                        key={event.id}
                        className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all group"
                      >
                        <div className="absolute -left-[4.5rem] top-6 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                                {event.type.replace('_', ' ').toUpperCase()}
                              </span>
                              {event.severity && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  {event.severity.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                              <span>{event.category}</span>
                            </div>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg">
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
