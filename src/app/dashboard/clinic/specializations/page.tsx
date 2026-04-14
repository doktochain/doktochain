import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Search, Filter, Plus, MoreVertical, Check, X, Stethoscope, Heart, Eye, Bone, Brain, Baby } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { clinicService, Clinic, ClinicAffiliation } from '../../../../services/clinicService';
import { Specialty } from '../../../../services/specialtiesService';

interface ClinicSpecializationEntry {
  id: string;
  clinic_id: string;
  specialty_id: string;
  is_active: boolean;
  provider_count: number;
  created_at: string;
}

type SortBy = 'recent' | 'name' | 'doctors';

const SPECIALTY_ICONS: Record<string, any> = {
  cardiology: Heart,
  ophthalmology: Eye,
  orthopedics: Bone,
  neurology: Brain,
  pediatrics: Baby,
};

export default function ClinicSpecializationsPage() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([]);
  const [clinicSpecs, setClinicSpecs] = useState<ClinicSpecializationEntry[]>([]);
  const [affiliations, setAffiliations] = useState<ClinicAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        const [specsData, clinicSpecsData, affs] = await Promise.all([
          clinicService.getSpecialtiesMaster(),
          clinicService.getClinicSpecializations(c.id),
          clinicService.getClinicAffiliations(c.id),
        ]);
        setAllSpecialties(specsData || []);
        setClinicSpecs(clinicSpecsData || []);
        setAffiliations(affs.filter(a => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error loading specializations:', error);
    } finally {
      setLoading(false);
    }
  };

  const clinicSpecMap = useMemo(() => {
    const map = new Map<string, ClinicSpecializationEntry>();
    clinicSpecs.forEach(cs => map.set(cs.specialty_id, cs));
    return map;
  }, [clinicSpecs]);

  const providerCountBySpecialty = useMemo(() => {
    const counts: Record<string, number> = {};
    affiliations.forEach(aff => {
      const spec = aff.providers?.specialty;
      if (spec) {
        allSpecialties.forEach(s => {
          if (s.name.toLowerCase() === spec.toLowerCase()) {
            counts[s.id] = (counts[s.id] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [affiliations, allSpecialties]);

  const mergedSpecs = useMemo(() => {
    return allSpecialties.map(s => ({
      ...s,
      clinicEntry: clinicSpecMap.get(s.id),
      isActivated: clinicSpecMap.has(s.id) && clinicSpecMap.get(s.id)!.is_active,
      doctorCount: providerCountBySpecialty[s.id] || 0,
    }));
  }, [allSpecialties, clinicSpecMap, providerCountBySpecialty]);

  const filteredSpecs = useMemo(() => {
    let list = mergedSpecs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') list = list.filter(s => s.isActivated);
    if (statusFilter === 'inactive') list = list.filter(s => !s.isActivated);

    if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'doctors') list.sort((a, b) => b.doctorCount - a.doctorCount);
    else list.sort((a, b) => new Date(b.clinicEntry?.created_at || b.created_at).getTime() - new Date(a.clinicEntry?.created_at || a.created_at).getTime());

    return list;
  }, [mergedSpecs, searchQuery, statusFilter, sortBy]);

  const activeCount = mergedSpecs.filter(s => s.isActivated).length;

  const toggleSpec = async (specId: string, activate: boolean) => {
    if (!clinic) return;
    setSaving(specId);
    try {
      const existing = clinicSpecMap.get(specId);
      if (existing) {
        await clinicService.toggleClinicSpecialization(existing.id, activate);
      } else {
        await clinicService.activateClinicSpecialization(clinic.id, specId);
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling specialization:', error);
    } finally {
      setSaving(null);
      setActionMenuId(null);
    }
  };

  const activateMultiple = async (specIds: string[]) => {
    if (!clinic) return;
    setSaving('bulk');
    try {
      await clinicService.bulkActivateClinicSpecializations(clinic.id, specIds);
      await loadData();
    } catch (error) {
      console.error('Error bulk activating:', error);
    } finally {
      setSaving(null);
      setShowAddModal(false);
    }
  };

  const getSpecIcon = (name: string) => {
    const key = name.toLowerCase();
    for (const [k, Icon] of Object.entries(SPECIALTY_ICONS)) {
      if (key.includes(k)) return Icon;
    }
    return Stethoscope;
  };

  const unactivated = allSpecialties.filter(s => !clinicSpecMap.has(s.id));

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
          <ClipboardList size={48} className="text-gray-400 mx-auto mb-4" />
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
          <h1 className="text-2xl font-bold text-gray-800">Specializations</h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Total Specializations : {filteredSpecs.length}
          </span>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
          <Plus size={16} /> Add New Specialization
        </button>
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
              <option value="doctors">No of Doctors</option>
            </select>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Specialization</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Created Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">No of Doctor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSpecs.map(spec => {
                const Icon = getSpecIcon(spec.name);
                return (
                  <tr key={spec.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <Icon size={20} className="text-blue-600" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{spec.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(spec.clinicEntry?.created_at || spec.created_at).toLocaleDateString('en-CA', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">{spec.doctorCount}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${
                        spec.isActivated
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-red-50 text-red-600 border-red-300'
                      }`}>
                        {spec.isActivated ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right relative">
                      <button
                        onClick={() => setActionMenuId(actionMenuId === spec.id ? null : spec.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {actionMenuId === spec.id && (
                        <div className="absolute right-5 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-44">
                          {spec.isActivated ? (
                            <button onClick={() => toggleSpec(spec.id, false)} disabled={saving === spec.id} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                              <X size={14} /> Deactivate
                            </button>
                          ) : (
                            <button onClick={() => toggleSpec(spec.id, true)} disabled={saving === spec.id} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition">
                              <Check size={14} /> Activate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredSpecs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-gray-700">No specializations found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <AddSpecModal specs={unactivated} onClose={() => setShowAddModal(false)} onActivate={activateMultiple} saving={saving === 'bulk'} getIcon={getSpecIcon} />
        </div>
      )}
    </div>
  );
}

function AddSpecModal({ specs, onClose, onActivate, saving, getIcon }: {
  specs: Specialty[];
  onClose: () => void;
  onActivate: (ids: string[]) => void;
  saving: boolean;
  getIcon: (name: string) => any;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = specs.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-800">Add New Specialization</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">All specializations are already added</p>
        ) : filtered.map(s => {
          const Icon = getIcon(s.name);
          return (
            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selected.has(s.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Icon size={16} className="text-blue-600" /></div>
              <p className="text-sm font-medium text-gray-800">{s.name}</p>
            </label>
          );
        })}
      </div>
      <div className="flex gap-3 p-5 border-t border-gray-200">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => onActivate([...selected])} disabled={saving || selected.size === 0} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
          {saving ? 'Adding...' : `Add ${selected.size} Specialization${selected.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
