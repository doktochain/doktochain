import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Plus, X, Check, Settings, Save } from 'lucide-react';
import { providerProfileService, type InsurancePlan, type BillingIntegration } from '../../services/providerProfileService';

interface InsuranceBillingConfigProps {
  providerId: string;
}

export default function InsuranceBillingConfig({ providerId }: InsuranceBillingConfigProps) {
  const [activeTab, setActiveTab] = useState('insurance');
  const [loading, setLoading] = useState(false);

  const [insurancePlans, setInsurancePlans] = useState<any[]>([]);
  const [billingIntegrations, setBillingIntegrations] = useState<any[]>([]);
  const [allInsuranceProviders, setAllInsuranceProviders] = useState<any[]>([]);

  const [selectedInsurance, setSelectedInsurance] = useState('');
  const [newPlan, setNewPlan] = useState<Omit<InsurancePlan, 'id'>>({
    insurance_provider_id: '',
    direct_billing_enabled: false,
    coverage_limitations: '',
    notes: '',
  });

  const [integrationForms, setIntegrationForms] = useState({
    claimsecure: {
      api_key: '',
      facility_id: '',
      practitioner_number: '',
    },
    telus_health: {
      practice_id: '',
      password: '',
      facility_code: '',
    },
    hcai: {
      facility_code: '',
      practitioner_number: '',
      jurisdiction: '',
    },
    wcb: {
      provider_registration_number: '',
      jurisdiction: '',
      facility_code: '',
    },
  });

  useEffect(() => {
    loadData();
  }, [providerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plans, integrations, allProviders] = await Promise.all([
        providerProfileService.getProviderInsurancePlans(providerId),
        providerProfileService.getBillingIntegrations(providerId),
        providerProfileService.getAllInsuranceProviders(),
      ]);

      setInsurancePlans(plans);
      setBillingIntegrations(integrations);
      setAllInsuranceProviders(allProviders);

      integrations.forEach((integration: any) => {
        if (integration.credentials) {
          setIntegrationForms((prev) => ({
            ...prev,
            [integration.integration_type]: integration.credentials,
          }));
        }
      });
    } catch (error) {
      console.error('Error loading insurance/billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInsurance = async () => {
    if (!selectedInsurance) return;

    try {
      await providerProfileService.addInsurancePlan(providerId, {
        insurance_provider_id: selectedInsurance,
        direct_billing_enabled: newPlan.direct_billing_enabled,
        coverage_limitations: newPlan.coverage_limitations,
        notes: newPlan.notes,
      });

      setSelectedInsurance('');
      setNewPlan({
        insurance_provider_id: '',
        direct_billing_enabled: false,
        coverage_limitations: '',
        notes: '',
      });
      loadData();
    } catch (error) {
      console.error('Error adding insurance plan:', error);
    }
  };

  const handleRemoveInsurance = async (planId: string) => {
    try {
      await providerProfileService.deleteInsurancePlan(planId);
      loadData();
    } catch (error) {
      console.error('Error removing insurance plan:', error);
    }
  };

  const handleToggleDirectBilling = async (planId: string, currentValue: boolean) => {
    try {
      await providerProfileService.updateInsurancePlan(planId, {
        direct_billing_enabled: !currentValue,
      });
      loadData();
    } catch (error) {
      console.error('Error toggling direct billing:', error);
    }
  };

  const handleSaveIntegration = async (integrationType: 'claimsecure' | 'telus_health' | 'hcai' | 'wcb') => {
    try {
      const existing = billingIntegrations.find((i) => i.integration_type === integrationType);

      if (existing) {
        await providerProfileService.updateBillingIntegration(existing.id, {
          credentials: integrationForms[integrationType],
          is_active: true,
        });
      } else {
        await providerProfileService.addBillingIntegration(providerId, {
          integration_type: integrationType,
          credentials: integrationForms[integrationType],
          is_active: true,
        });
      }

      toast.success('Integration saved successfully!');
      loadData();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error('Failed to save integration');
    }
  };

  const handleToggleIntegration = async (integrationId: string, currentValue: boolean) => {
    try {
      await providerProfileService.updateBillingIntegration(integrationId, {
        is_active: !currentValue,
      });
      loadData();
    } catch (error) {
      console.error('Error toggling integration:', error);
    }
  };

  const groupedInsurance = {
    provincial: allInsuranceProviders.filter((p) => p.provider_type === 'provincial'),
    private: allInsuranceProviders.filter((p) => p.provider_type === 'private'),
    wcb: allInsuranceProviders.filter((p) => p.provider_type === 'workers_comp'),
    other: allInsuranceProviders.filter((p) => p.provider_type === 'other'),
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Insurance & Billing Configuration</h2>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('insurance')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'insurance'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ShieldCheck className="inline mr-2" />
              Insurance Plans
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'billing'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="inline mr-2" />
              Billing Integrations
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'insurance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Accepted Insurance Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insurancePlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-800">
                              {plan.insurance_providers?.name}
                            </h4>
                            {plan.direct_billing_enabled && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                Direct Billing
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {plan.insurance_providers?.provider_type} •{' '}
                            {plan.insurance_providers?.province || 'National'}
                          </p>
                          {plan.coverage_limitations && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Limitations:</span> {plan.coverage_limitations}
                            </p>
                          )}
                          {plan.notes && (
                            <p className="text-sm text-gray-500 mt-1">{plan.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleDirectBilling(plan.id, plan.direct_billing_enabled)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            {plan.direct_billing_enabled ? 'Disable' : 'Enable'} Billing
                          </button>
                          <button
                            onClick={() => handleRemoveInsurance(plan.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Insurance Provider</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Provincial Health Plans</h4>
                    <div className="space-y-2">
                      {groupedInsurance.provincial.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedInsurance(provider.id)}
                          className={`w-full text-left px-3 py-2 rounded border text-sm ${
                            selectedInsurance === provider.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Private Insurance</h4>
                    <div className="space-y-2">
                      {groupedInsurance.private.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedInsurance(provider.id)}
                          className={`w-full text-left px-3 py-2 rounded border text-sm ${
                            selectedInsurance === provider.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Workers Compensation</h4>
                    <div className="space-y-2">
                      {groupedInsurance.wcb.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedInsurance(provider.id)}
                          className={`w-full text-left px-3 py-2 rounded border text-sm ${
                            selectedInsurance === provider.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedInsurance && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Coverage Limitations (Optional)
                      </label>
                      <input
                        type="text"
                        value={newPlan.coverage_limitations}
                        onChange={(e) => setNewPlan({ ...newPlan, coverage_limitations: e.target.value })}
                        placeholder="e.g., Annual maximum $5,000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={newPlan.notes}
                        onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                        rows={2}
                        placeholder="Additional notes about coverage or billing"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlan.direct_billing_enabled}
                        onChange={(e) => setNewPlan({ ...newPlan, direct_billing_enabled: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <label className="ml-2 text-sm text-gray-700">Enable direct billing</label>
                    </div>

                    <button
                      onClick={handleAddInsurance}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus />
                      Add Insurance Provider
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Configure billing integrations to automatically submit claims and track remittance advice.
                  All credentials are encrypted and stored securely.
                </p>
              </div>

              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">ClaimSecure Integration</h3>
                      <p className="text-sm text-gray-600">Automated claim submission and tracking</p>
                    </div>
                    {billingIntegrations.find((i) => i.integration_type === 'claimsecure') && (
                      <button
                        onClick={() => {
                          const integration = billingIntegrations.find((i) => i.integration_type === 'claimsecure');
                          handleToggleIntegration(integration!.id, integration!.is_active);
                        }}
                        className={`px-4 py-2 rounded-lg ${
                          billingIntegrations.find((i) => i.integration_type === 'claimsecure')?.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {billingIntegrations.find((i) => i.integration_type === 'claimsecure')?.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                      <input
                        type="password"
                        value={integrationForms.claimsecure.api_key}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            claimsecure: { ...integrationForms.claimsecure, api_key: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Facility ID</label>
                      <input
                        type="text"
                        value={integrationForms.claimsecure.facility_id}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            claimsecure: { ...integrationForms.claimsecure, facility_id: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Practitioner Number
                      </label>
                      <input
                        type="text"
                        value={integrationForms.claimsecure.practitioner_number}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            claimsecure: {
                              ...integrationForms.claimsecure,
                              practitioner_number: e.target.value,
                            },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveIntegration('claimsecure')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save />
                    Save Configuration
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Telus Health Integration</h3>
                      <p className="text-sm text-gray-600">Electronic claim submission and remittance</p>
                    </div>
                    {billingIntegrations.find((i) => i.integration_type === 'telus_health') && (
                      <button
                        onClick={() => {
                          const integration = billingIntegrations.find((i) => i.integration_type === 'telus_health');
                          handleToggleIntegration(integration!.id, integration!.is_active);
                        }}
                        className={`px-4 py-2 rounded-lg ${
                          billingIntegrations.find((i) => i.integration_type === 'telus_health')?.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {billingIntegrations.find((i) => i.integration_type === 'telus_health')?.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Practice ID</label>
                      <input
                        type="text"
                        value={integrationForms.telus_health.practice_id}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            telus_health: { ...integrationForms.telus_health, practice_id: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        value={integrationForms.telus_health.password}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            telus_health: { ...integrationForms.telus_health, password: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Facility Code</label>
                      <input
                        type="text"
                        value={integrationForms.telus_health.facility_code}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            telus_health: { ...integrationForms.telus_health, facility_code: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveIntegration('telus_health')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save />
                    Save Configuration
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">HCAI Integration</h3>
                      <p className="text-sm text-gray-600">Health Claim for Auto Insurance</p>
                    </div>
                    {billingIntegrations.find((i) => i.integration_type === 'hcai') && (
                      <button
                        onClick={() => {
                          const integration = billingIntegrations.find((i) => i.integration_type === 'hcai');
                          handleToggleIntegration(integration!.id, integration!.is_active);
                        }}
                        className={`px-4 py-2 rounded-lg ${
                          billingIntegrations.find((i) => i.integration_type === 'hcai')?.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {billingIntegrations.find((i) => i.integration_type === 'hcai')?.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Facility Code</label>
                      <input
                        type="text"
                        value={integrationForms.hcai.facility_code}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            hcai: { ...integrationForms.hcai, facility_code: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Practitioner Number
                      </label>
                      <input
                        type="text"
                        value={integrationForms.hcai.practitioner_number}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            hcai: { ...integrationForms.hcai, practitioner_number: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
                      <select
                        value={integrationForms.hcai.jurisdiction}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            hcai: { ...integrationForms.hcai, jurisdiction: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Province</option>
                        <option value="ON">Ontario</option>
                        <option value="BC">British Columbia</option>
                        <option value="QC">Quebec</option>
                        <option value="AB">Alberta</option>
                        <option value="MB">Manitoba</option>
                        <option value="SK">Saskatchewan</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveIntegration('hcai')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save />
                    Save Configuration
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">WCB Integration</h3>
                      <p className="text-sm text-gray-600">Workers Compensation Board</p>
                    </div>
                    {billingIntegrations.find((i) => i.integration_type === 'wcb') && (
                      <button
                        onClick={() => {
                          const integration = billingIntegrations.find((i) => i.integration_type === 'wcb');
                          handleToggleIntegration(integration!.id, integration!.is_active);
                        }}
                        className={`px-4 py-2 rounded-lg ${
                          billingIntegrations.find((i) => i.integration_type === 'wcb')?.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {billingIntegrations.find((i) => i.integration_type === 'wcb')?.is_active ? 'Active' : 'Inactive'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Provider Registration Number
                      </label>
                      <input
                        type="text"
                        value={integrationForms.wcb.provider_registration_number}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            wcb: { ...integrationForms.wcb, provider_registration_number: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
                      <select
                        value={integrationForms.wcb.jurisdiction}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            wcb: { ...integrationForms.wcb, jurisdiction: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Province</option>
                        <option value="ON">Ontario</option>
                        <option value="BC">British Columbia</option>
                        <option value="QC">Quebec</option>
                        <option value="AB">Alberta</option>
                        <option value="MB">Manitoba</option>
                        <option value="SK">Saskatchewan</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Facility Code</label>
                      <input
                        type="text"
                        value={integrationForms.wcb.facility_code}
                        onChange={(e) =>
                          setIntegrationForms({
                            ...integrationForms,
                            wcb: { ...integrationForms.wcb, facility_code: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleSaveIntegration('wcb')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save />
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
