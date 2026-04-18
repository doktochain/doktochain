import * as React from 'react';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface ParsedAddress {
  formatted: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    province?: string;
    region?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface AddressAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  countryCodes?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  error?: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

function parseSuggestion(item: NominatimSuggestion): ParsedAddress {
  const a = item.address || {};
  const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ').trim();
  const city = a.city || a.town || a.village || a.municipality || a.suburb || '';
  const province = a.state || a.province || a.region || '';
  return {
    formatted: item.display_name,
    addressLine1: street || a.neighbourhood || '',
    addressLine2: '',
    city,
    province,
    postalCode: a.postcode || '',
    country: a.country || '',
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  };
}

export function AddressAutocomplete({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  countryCodes = 'ca,us',
  className,
  inputClassName,
  disabled,
  autoFocus,
  id,
  name,
  required,
  error,
}: AddressAutocompleteProps) {
  const [query, setQuery] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<NominatimSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const url = new URL(NOMINATIM_BASE);
        url.searchParams.set('format', 'json');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '7');
        url.searchParams.set('q', trimmed);
        if (countryCodes) url.searchParams.set('countrycodes', countryCodes);

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { 'Accept-Language': navigator.language || 'en' },
        });
        if (!res.ok) throw new Error('lookup failed');
        const data: NominatimSuggestion[] = await res.json();
        setSuggestions(data);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Address lookup failed', err);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, countryCodes]);

  const handleSelect = (item: NominatimSuggestion) => {
    const parsed = parseSuggestion(item);
    setQuery(parsed.formatted);
    onChange?.(parsed.formatted);
    onSelect(parsed);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange?.('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          name={name}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange?.(e.target.value);
            if (e.target.value.trim().length >= 3) setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={cn('pl-9 pr-9', inputClassName, error && 'border-destructive')}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Clear address"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}

      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-lg">
          {suggestions.length === 0 && loading && (
            <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...
            </div>
          )}
          {suggestions.map((item, idx) => {
            const parsed = parseSuggestion(item);
            const primary =
              parsed.addressLine1 ||
              item.display_name.split(',').slice(0, 2).join(',').trim();
            const secondary = [parsed.city, parsed.province, parsed.postalCode, parsed.country]
              .filter(Boolean)
              .join(', ');
            return (
              <button
                key={item.place_id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
                className={cn(
                  'w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors',
                  activeIndex === idx && 'bg-accent text-accent-foreground'
                )}
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{primary}</div>
                  {secondary && (
                    <div className="text-xs text-muted-foreground truncate">{secondary}</div>
                  )}
                </div>
              </button>
            );
          })}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border bg-muted/40">
            Powered by OpenStreetMap (Nominatim)
          </div>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;
