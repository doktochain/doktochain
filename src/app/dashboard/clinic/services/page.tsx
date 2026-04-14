import { useState, useEffect, useMemo } from 'react';
import { Stethoscope, Search, Filter, Plus, MoreVertical, Check, X, Download, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic } from '../../../../services/clinicService';
import { MedicalService } from '../../../../services/medicalServicesService';

interface ClinicServiceEntry {
  id: string;
  clinic_id: string;
  service_id: string;
  is_active: boolean;
  custom_price: number | null;
  medical_services?: MedicalService;
}

type SortBy = 'recent' | 'name' | 'category' | 'price';

export default function ClinicServicesPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [allServices, setAllServices] = useState<MedicalService[]>([]);
  const [clinicServices, setClinicServices] = useState<ClinicServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const c = await clinicService.getClinicByOwnerId(user!.id);
      setClinic(c);
      if (c) {
        const [servicesData, clinicServData] = await Promise.all([
          clinicService.getMedicalServices(),
          clinicService.getClinicServices(c.id),
        ]);
        setAllServices(servicesData || []);
        setClinicServices(clinicServData || []);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(allServices.map(s => s.category).filter(Boolean));
    return [...cats].sort();
  }, [allServices]);

  const clinicServiceMap = useMemo(() => {
    const map = new Map<string, ClinicServiceEntry>();
    clinicServices.forEach(cs => map.set(cs.service_id, cs));
    return map;
  }, [clinicServices]);

  const mergedServices = useMemo(() => {
    return allServices.map(s => ({
      ...s,
      clinicEntry: clinicServiceMap.get(s.id!),
      isActivated: clinicServiceMap.has(s.id!) && clinicServiceMap.get(s.id!)!.is_active,
    }));
  }, [allServices, clinicServiceMap]);

  const filteredServices = useMemo(() => {
    let list = mergedServices;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.service_name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') list = list.filter(s => s.category === categoryFilter);
    if (statusFilter === 'active') list = list.filter(s => s.isActivated);
    if (statusFilter === 'inactive') list = list.filter(s => !s.isActivated);

    if (sortBy === 'name') list.sort((a, b) => a.service_name.localeCompare(b.service_name));
    else if (sortBy === 'category') list.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    else if (sortBy === 'price') list.sort((a, b) => (a.clinicEntry?.custom_price || 0) - (b.clinicEntry?.custom_price || 0));

    return list;
  }, [mergedServices, searchQuery, categoryFilter, statusFilter, sortBy]);

  const activeCount = mergedServices.filter(s => s.isActivated).length;

  const toggleService = async (serviceId: string, activate: boolean) => {
    if (!clinic) return;
    setSaving(serviceId);
    try {
      const existing = clinicServiceMap.get(serviceId);
      if (existing) {
        await clinicService.toggleClinicService(existing.id, activate);
      } else {
        await clinicService.activateClinicService(clinic.id, serviceId);
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling service:', error);
    } finally {
      setSaving(null);
      setActionMenuId(null);
    }
  };

  const updatePrice = async (serviceId: string, price: number) => {
    if (!clinic) return;
    const existing = clinicServiceMap.get(serviceId);
    if (existing) {
      await clinicService.updateClinicServicePrice(existing.id, price);
      await loadData();
    }
  };

  const handleExport = () => {
    const header = 'Service Name,Category,Price,Status\n';
    const body = filteredServices.map(s =>
      `"${s.service_name}","${s.category || ''}","${s.clinicEntry?.custom_price || ''}","${s.isActivated ? 'Active' : 'Inactive'}"`
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clinic-services.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const unactivatedServices = allServices.filter(s => !clinicServiceMap.has(s.id!) && s.is_active);

  const activateMultiple = async (serviceIds: string[]) => {
    if (!clinic) return;
    setSaving('bulk');
    try {
      await clinicService.bulkActivateClinicServices(clinic.id, serviceIds);
      await loadData();
    } catch (error) {
      console.error('Error bulk activating:', error);
    } finally {
      setSaving(null);
      setShowAddModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Stethoscope size={48} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Clinic Found</h2>
          <p className="text-gray-500">Your clinic hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Services</h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Total Services : {filteredServices.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
            <Plus size={16} /> New Services
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <Filter size={16} /> Filters
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort By :</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="category">Department</option>
              <option value="price">Price</option>
            </select>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-4">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Departments</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Service Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Department</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Price</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredServices.map(service => (
                <tr key={service.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-800">{service.service_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-600">{service.category || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-gray-800">
                      {service.clinicEntry?.custom_price ? `$${service.clinicEntry.custom_price}` : '-'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                      service.isActivated
                        ? 'bg-green-50 text-green-700 border-green-300'
                        : 'bg-red-50 text-red-600 border-red-300'
                    }`}>
                      {service.isActivated ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right relative">
                    <button
                      onClick={() => setActionMenuId(actionMenuId === service.id ? null : service.id!)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {actionMenuId === service.id && (
                      <div className="absolute right-5 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-44">
                        {service.isActivated ? (
                          <button
                            onClick={() => toggleService(service.id!, false)}
                            disabled={saving === service.id}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                          >
                            <X size={14} /> Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleService(service.id!, true)}
                            disabled={saving === service.id}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition"
                          >
                            <Check size={14} /> Activate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const price = prompt('Enter custom price:', String(service.clinicEntry?.custom_price || ''));
                            if (price !== null && !isNaN(Number(price))) {
                              updatePrice(service.id!, Number(price));
                            }
                            setActionMenuId(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
                        >
                          Set Price
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <Stethoscope size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-700">No services found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add new services</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
          <span>{filteredServices.length} entries</span>
          <span>{activeCount} active</span>
        </div>
      </div>

      {showAddModal && (
        <AddServicesModal
          services={unactivatedServices}
          onClose={() => setShowAddModal(false)}
          onActivate={activateMultiple}
          saving={saving === 'bulk'}
        />
      )}
    </div>
  );
}

function AddServicesModal({ services, onClose, onActivate, saving }: {
  services: MedicalService[];
  onClose: () => void;
  onActivate: (ids: string[]) => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = services.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.service_name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Add New Services</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search available services..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8">All available services have already been added</p>
          ) : (
            filtered.map(s => (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                selected.has(s.id!) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input type="checkbox" checked={selected.has(s.id!)} onChange={() => toggle(s.id!)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.service_name}</p>
                  <p className="text-xs text-gray-500">{s.category || 'General'}</p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
          <button onClick={() => onActivate([...selected])} disabled={saving || selected.size === 0} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {saving ? 'Adding...' : `Add ${selected.size} Service${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
