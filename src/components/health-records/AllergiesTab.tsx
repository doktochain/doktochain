import React, { useState, useEffect } from 'react';
import { healthRecordsService, Allergy } from '../../services/healthRecordsService';
import { AlertTriangle, Calendar, User, Plus } from 'lucide-react';

interface Props {
  patientId: string;
}

export default function AllergiesTab({ patientId }: Props) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'resolved'>('active');

  useEffect(() => {
    loadAllergies();
  }, [patientId, filter]);

  const loadAllergies = async () => {
    setLoading(true);
    const status = filter === 'all' ? undefined : filter;
    const { data} = await healthRecordsService.getAllergies(patientId, status);
    if (data) {
      setAllergies(data);
    }
    setLoading(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medication':
        return 'bg-red-100 text-red-800';
      case 'food':
        return 'bg-orange-100 text-orange-800';
      case 'environmental':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          {['active', 'all', 'inactive', 'resolved'].map((status) => (
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
          Add Allergy
        </button>
      </div>

      {allergies.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No allergies recorded</h3>
          <p className="text-gray-600">Your allergy information will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allergies.map((allergy) => (
            <div
              key={allergy.id}
              className={`border-2 rounded-lg p-6 ${
                allergy.severity === 'life-threatening' || allergy.severity === 'severe'
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-white'
              } hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      allergy.severity === 'life-threatening' || allergy.severity === 'severe'
                        ? 'bg-red-200'
                        : 'bg-orange-100'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-5 h-5 ${
                        allergy.severity === 'life-threatening' || allergy.severity === 'severe'
                          ? 'text-red-700'
                          : 'text-orange-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{allergy.allergen_name}</h3>
                    <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getTypeColor(allergy.allergen_type)}`}>
                      {allergy.allergen_type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${healthRecordsService.getSeverityColor(
                    allergy.severity
                  )}`}
                >
                  {allergy.severity.toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="text-gray-600 font-medium">Reaction:</span>
                  <p className="text-gray-900 mt-1">{allergy.reaction_type}</p>
                </div>
                {allergy.notes && (
                  <div className="text-sm">
                    <span className="text-gray-600 font-medium">Notes:</span>
                    <p className="text-gray-900 mt-1">{allergy.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-xs text-gray-600 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  <span>Identified: {new Date(allergy.date_identified).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span>Documented by: {allergy.documented_by_provider_name}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                  Edit
                </button>
                {allergy.status === 'active' && (
                  <button className="flex-1 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    Mark Resolved
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
