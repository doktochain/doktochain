import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Specialty {
  id: string;
  name: string;
  category: string;
}

interface SpecialtySearchSelectProps {
  value: string;
  onChange: (id: string, name: string) => void;
}

export default function SpecialtySearchSelect({ value, onChange }: SpecialtySearchSelectProps) {
  const { t } = useTranslation('auth');
  const [query, setQuery] = useState('');
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [filtered, setFiltered] = useState<Specialty[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSpecialties = async () => {
      const { data } = await supabase
        .from('specialties_master')
        .select('id, name, category')
        .eq('is_active', true)
        .order('name');

      if (data) {
        setSpecialties(data);
        setFiltered(data);

        if (value) {
          const match = data.find((s: Specialty) => s.id === value);
          if (match) setSelectedName(match.name);
        }
      }
    };
    loadSpecialties();
  }, [value]);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(specialties);
    } else {
      const lower = query.toLowerCase();
      setFiltered(
        specialties.filter(
          (s) =>
            s.name.toLowerCase().includes(lower) ||
            s.category.toLowerCase().includes(lower)
        )
      );
    }
  }, [query, specialties]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (specialty: Specialty) => {
    onChange(specialty.id, specialty.name);
    setSelectedName(specialty.name);
    setQuery('');
    setIsOpen(false);
  };

  const grouped = filtered.reduce<Record<string, Specialty[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-left bg-white hover:border-gray-400 transition-colors"
      >
        <span className={selectedName ? 'text-gray-900' : 'text-gray-400'}>
          {selectedName || t('specialtySearch.selectSpecialty')}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('specialtySearch.searchPlaceholder')}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-56">
            {Object.keys(grouped).length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                {t('specialtySearch.noResults')}
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                    {category}
                  </div>
                  {items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelect(s)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        value === s.id ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span>{s.name}</span>
                      {value === s.id && <Check className="w-4 h-4 text-teal-600" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
