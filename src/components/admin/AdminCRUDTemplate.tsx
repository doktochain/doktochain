import { ReactNode, useState } from 'react';
import { Plus, Search, Filter, Download, RefreshCw, Loader2 } from 'lucide-react';
import AdminDataTable, { TableColumn, TableAction } from './AdminDataTable';
import AdminBulkActions, { BulkAction } from './AdminBulkActions';
import AdminFilterBar from './AdminFilterBar';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface AdminCRUDTemplateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  onRefresh?: () => void;
  onCreate?: () => void;
  onRowClick?: (row: any) => void;
  actions?: TableAction[];
  bulkActions?: BulkAction[];
  filters?: any[];
  onFilterChange?: (filters: any) => void;
  onExport?: () => void;
  searchPlaceholder?: string;
  createButtonLabel?: string;
  emptyMessage?: string;
  children?: ReactNode;
}

export default function AdminCRUDTemplate({
  title,
  description,
  icon,
  data,
  columns,
  loading = false,
  onRefresh,
  onCreate,
  onRowClick,
  actions,
  bulkActions,
  filters,
  onFilterChange,
  onExport,
  searchPlaceholder = 'Search...',
  createButtonLabel = 'Create New',
  emptyMessage = 'No data available',
  children,
}: AdminCRUDTemplateProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredData = data.filter(item => {
    if (!searchTerm) return true;
    return Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="rounded-lg border bg-card p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            {filters && (
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}

            {onExport && (
              <Button variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}

            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}

            {onCreate && (
              <Button onClick={onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {createButtonLabel}
              </Button>
            )}
          </div>
        </div>

        {showFilters && filters && onFilterChange && (
          <div className="mb-6">
            <AdminFilterBar onSearch={(q) => onFilterChange?.({ search: q })} />
          </div>
        )}

        {bulkActions && bulkActions.length > 0 && (
          <div className="mb-4">
            <AdminBulkActions
              data={filteredData}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              actions={bulkActions}
            />
          </div>
        )}

        {children}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredData}
            actions={actions}
            onRowClick={onRowClick}
            emptyMessage={emptyMessage}
          />
        )}
      </div>
    </div>
  );
}
