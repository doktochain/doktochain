import React, { useState } from 'react';
import { toast } from 'sonner';
import { healthRecordsService } from '../../services/healthRecordsService';
import { blockchainAuditService } from '../../services/blockchainAuditService';
import { providerService } from '../../services/providerService';
import { supabase } from '../../lib/supabase';
import { Share2, X, Mail, Calendar, Check, Search } from 'lucide-react';

interface Props {
  patientId: string;
  onClose: () => void;
}

interface Provider {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  practice_name?: string;
  specialty?: string;
}

export default function ShareRecordsModal({ patientId, onClose }: Props) {
  const [providerId, setProviderId] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [shareStartDate, setShareStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [shareEndDate, setShareEndDate] = useState('');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([
    'labResults',
    'medications',
    'allergies',
    'immunizations',
  ]);
  const [sharing, setSharing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleProviderSearch = async () => {
    if (providerSearch.length < 2) return;

    try {
      const { data } = await supabase
        .from('providers')
        .select('id, user_id, user_profiles(first_name, last_name), practice_name, specialization')
        .or(`practice_name.ilike.%${providerSearch}%,specialization.ilike.%${providerSearch}%`)
        .limit(10);

      if (data) {
        const providers = data.map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          first_name: p.user_profiles?.first_name || '',
          last_name: p.user_profiles?.last_name || '',
          practice_name: p.practice_name,
          specialty: p.specialization
        }));
        setSearchResults(providers);
      }
    } catch (error) {
      console.error('Error searching providers:', error);
    }
  };

  const selectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setProviderId(provider.id);
    setSearchResults([]);
  };

  const handleShare = async () => {
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    setSharing(true);
    try {
      const { data: consentData } = await supabase
        .from('patient_consents')
        .insert({
          patient_id: patientId,
          provider_id: providerId,
          consent_type: 'record_access',
          record_types: selectedRecords,
          start_date: shareStartDate,
          end_date: shareEndDate || null,
          status: 'active'
        })
        .select()
        .single();

      if (consentData) {
        await blockchainAuditService.logEvent({
          eventType: 'consent_granted',
          resourceType: 'patient_consent',
          resourceId: consentData.id,
          actorId: patientId,
          actorRole: 'patient',
          actionData: {
            provider_id: providerId,
            provider_name: `${selectedProvider.first_name} ${selectedProvider.last_name}`,
            record_types: selectedRecords,
            start_date: shareStartDate,
            end_date: shareEndDate,
            consent_type: 'record_access'
          }
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share records. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const recordTypes = [
    { value: 'labResults', label: 'Lab Results' },
    { value: 'medications', label: 'Medications' },
    { value: 'allergies', label: 'Allergies' },
    { value: 'immunizations', label: 'Immunizations' },
    { value: 'clinicalNotes', label: 'Clinical Notes' },
  ];

  const toggleRecord = (value: string) => {
    setSelectedRecords((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Records Shared Successfully!</h3>
          <p className="text-gray-600">
            Consent granted to {selectedProvider?.first_name} {selectedProvider?.last_name} for secure access to your health records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share Health Records</h2>
              <p className="text-sm text-gray-600">Share records with healthcare providers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Search for Provider
            </label>
            {selectedProvider ? (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Dr. {selectedProvider.first_name} {selectedProvider.last_name}
                    </p>
                    {selectedProvider.practice_name && (
                      <p className="text-sm text-gray-600">{selectedProvider.practice_name}</p>
                    )}
                    {selectedProvider.specialty && (
                      <p className="text-xs text-gray-500">{selectedProvider.specialty}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedProvider(null)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  onKeyUp={() => handleProviderSearch()}
                  placeholder="Search by name or practice..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => selectProvider(provider)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">
                          Dr. {provider.first_name} {provider.last_name}
                        </p>
                        {provider.practice_name && (
                          <p className="text-sm text-gray-600">{provider.practice_name}</p>
                        )}
                        {provider.specialty && (
                          <p className="text-xs text-gray-500">{provider.specialty}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Access Duration
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: '7 Days', days: 7 },
                { label: '30 Days', days: 30 },
                { label: '90 Days', days: 90 },
                { label: 'Permanent', days: 0 },
              ].map((opt) => {
                const endForOpt = opt.days > 0
                  ? new Date(Date.now() + opt.days * 86400000).toISOString().split('T')[0]
                  : '';
                const isSelected = shareEndDate === endForOpt;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setShareEndDate(endForOpt)}
                    className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={shareStartDate}
                  onChange={(e) => setShareStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={shareEndDate}
                  onChange={(e) => setShareEndDate(e.target.value)}
                  min={shareStartDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Leave end date blank for permanent access (you can revoke anytime)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Select Records to Share
            </label>
            <div className="space-y-2">
              {recordTypes.map((record) => (
                <label
                  key={record.value}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecords.includes(record.value)}
                    onChange={() => toggleRecord(record.value)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{record.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Privacy Notice:</strong> The recipient will receive secure, read-only access
              to the selected records. You can revoke access at any time from your settings.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={sharing || !selectedProvider || selectedRecords.length === 0}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sharing ? 'Granting Consent...' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  );
}
