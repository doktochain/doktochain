import React, { useState, useEffect } from 'react';
import { healthRecordsService, MedicationHistory } from '../../services/healthRecordsService';
import { Pill, Calendar, User, Building2, Plus, AlertCircle } from 'lucide-react';

interface Props {
  patientId: string;
}

export default function MedicationsTab({ patientId }: Props) {
  const [medications, setMedications] = useState<MedicationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'discontinued' | 'completed'>('all');

  useEffect(() => {
    loadMedications();
  }, [patientId, filter]);

  const loadMedications = async () => {
    setLoading(true);
    const status = filter === 'all' ? undefined : filter;
    const { data } = await healthRecordsService.getMedicationHistory(patientId, status);
    if (data) {
      setMedications(data);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'discontinued':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'active', 'discontinued', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
          <Plus className="w-5 h-5" />
          Add Medication
        </button>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-12">
          <Pill className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No medications found</h3>
          <p className="text-gray-600">Your medication history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {medications.map((med) => (
            <div key={med.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Pill className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{med.medication_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {med.dosage} - {med.frequency} ({med.route})
                    </p>
                    {med.indication && (
                      <p className="text-sm text-gray-500 mt-1">For: {med.indication}</p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(med.status)}`}>
                  {med.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Started: {new Date(med.start_date).toLocaleDateString()}</span>
                  </div>
                  {med.end_date && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Ended: {new Date(med.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Prescribed by: {med.prescribing_provider_name}</span>
                  </div>
                  {med.pharmacy_name && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>Pharmacy: {med.pharmacy_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                  View Details
                </button>
                {med.status === 'active' && (
                  <button className="px-4 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 text-sm">
                    Discontinue
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
