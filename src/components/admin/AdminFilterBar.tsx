import { useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

export interface FilterOption {
  label: string;
  value: string;
}

export interface AdminFilterBarProps {
  onSearch?: (query: string) => void;
  onPortalFilter?: (portal: string) => void;
  onDateRangeFilter?: (range: string) => void;
  onStatusFilter?: (status: string) => void;
  onFlaggedFilter?: (flagged: boolean) => void;
  portals?: FilterOption[];
  dateRanges?: FilterOption[];
  statuses?: FilterOption[];
  showFlaggedToggle?: boolean;
}

export default function AdminFilterBar({
  onSearch,
  onPortalFilter,
  onDateRangeFilter,
  onStatusFilter,
  onFlaggedFilter,
  portals = [
    { label: 'All Portals', value: 'all' },
    { label: 'Patient', value: 'patient' },
    { label: 'Provider', value: 'provider' },
    { label: 'Pharmacy', value: 'pharmacy' },
  ],
  dateRanges = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom', value: 'custom' },
  ],
  statuses,
  showFlaggedToggle = true,
}: AdminFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortal, setSelectedPortal] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handlePortalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const portal = e.target.value;
    setSelectedPortal(portal);
    onPortalFilter?.(portal);
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setSelectedDateRange(range);
    onDateRangeFilter?.(range);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setSelectedStatus(status);
    onStatusFilter?.(status);
  };

  const handleFlaggedToggle = () => {
    const newValue = !showFlaggedOnly;
    setShowFlaggedOnly(newValue);
    onFlaggedFilter?.(newValue);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPortal('all');
    setSelectedDateRange('today');
    setSelectedStatus('all');
    setShowFlaggedOnly(false);
    onSearch?.('');
    onPortalFilter?.('all');
    onDateRangeFilter?.('today');
    onStatusFilter?.('all');
    onFlaggedFilter?.(false);
  };

  const selectClassName = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="p-4 rounded-lg border bg-card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>
        )}

        {onPortalFilter && (
          <select
            value={selectedPortal}
            onChange={handlePortalChange}
            className={selectClassName}
          >
            {portals.map((portal) => (
              <option key={portal.value} value={portal.value}>
                {portal.label}
              </option>
            ))}
          </select>
        )}

        {onDateRangeFilter && (
          <select
            value={selectedDateRange}
            onChange={handleDateRangeChange}
            className={selectClassName}
          >
            {dateRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        )}

        {onStatusFilter && statuses && (
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            className={selectClassName}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        )}

        {showFlaggedToggle && onFlaggedFilter && (
          <Label className="flex items-center gap-2 h-10 px-3 rounded-md border border-input cursor-pointer hover:bg-accent transition-colors">
            <input
              type="checkbox"
              checked={showFlaggedOnly}
              onChange={handleFlaggedToggle}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Flagged Only</span>
          </Label>
        )}
      </div>
    </div>
  );
}
