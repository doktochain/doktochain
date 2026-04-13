import React, { useState, useEffect } from 'react';
import { healthRecordsService, Immunization } from '../../services/healthRecordsService';
import { Syringe, Calendar, MapPin, User, Plus, Clock } from 'lucide-react';

interface Props {
  patientId: string;
}

export default function ImmunizationsTab({ patientId }: Props) {
  const [immunizations, setImmunizations] = useState<Immunization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImmunizations();
  }, [patientId]);

  const loadImmunizations = async () => {
    setLoading(true);
    const { data } = await healthRecordsService.getImmunizations(patientId);
    if (data) {
      setImmunizations(data);
    }
    setLoading(false);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
        <p className="text-gray-600">Complete immunization history</p>
        <button className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50">
          <Plus className="w-5 h-5" />
          Add Record
        </button>
      </div>

      {immunizations.length === 0 ? (
        <div className="text-center py-12">
          <Syringe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No immunization records</h3>
          <p className="text-gray-600">Your vaccination history will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {immunizations.map((immun) => (
            <div key={immun.id} className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Syringe className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{immun.vaccine_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Dose {immun.dose_number}
                      {immun.total_doses && ` of ${immun.total_doses}`}
                    </p>
                    {immun.vaccine_code && (
                      <p className="text-xs text-gray-500 mt-1">Code: {immun.vaccine_code}</p>
                    )}
                  </div>
                </div>
                {immun.next_dose_due_date && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isOverdue(immun.next_dose_due_date)
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {isOverdue(immun.next_dose_due_date) ? 'Next Dose Overdue' : 'Booster Due'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      Administered: {new Date(immun.administration_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>Location: {immun.location_administered}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>Provider: {immun.administering_provider}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {immun.lot_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lot Number:</span>
                      <span className="font-medium text-gray-900">{immun.lot_number}</span>
                    </div>
                  )}
                  {immun.route && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route:</span>
                      <span className="font-medium text-gray-900">{immun.route}</span>
                    </div>
                  )}
                  {immun.site && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Site:</span>
                      <span className="font-medium text-gray-900">{immun.site}</span>
                    </div>
                  )}
                  {immun.next_dose_due_date && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Next due: {new Date(immun.next_dose_due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                  Download Record
                </button>
                <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
