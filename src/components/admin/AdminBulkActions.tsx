import { useState } from 'react';
import { CheckSquare, Square, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => Promise<void>;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  requiresConfirmation?: boolean;
}

interface AdminBulkActionsProps {
  data: any[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  actions: BulkAction[];
  idField?: string;
}

export default function AdminBulkActions({
  data,
  selectedIds,
  onSelectionChange,
  actions,
  idField = 'id',
}: AdminBulkActionsProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null);

  const allIds = data.map(item => item[idField]);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < allIds.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  };

  const handleActionClick = async (action: BulkAction) => {
    if (selectedIds.length === 0) return;

    if (action.requiresConfirmation) {
      setPendingAction(action);
      return;
    }

    setIsExecuting(true);
    try {
      await action.onClick(selectedIds);
      onSelectionChange([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;

    setIsExecuting(true);
    try {
      await pendingAction.onClick(selectedIds);
      onSelectionChange([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsExecuting(false);
      setPendingAction(null);
    }
  };

  if (data.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          className="gap-2"
        >
          {isAllSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : isSomeSelected ? (
            <Square className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {isAllSelected
            ? 'Deselect All'
            : isSomeSelected
            ? `${selectedIds.length} Selected`
            : 'Select All'}
        </Button>

        {selectedIds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isExecuting} className="gap-2">
                {isExecuting ? 'Processing...' : `Bulk Actions (${selectedIds.length})`}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {actions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => handleActionClick(action)}
                  disabled={isExecuting}
                  className={cn(
                    'flex items-center gap-2',
                    action.variant === 'danger' && 'text-destructive focus:text-destructive',
                    action.variant === 'warning' && 'text-amber-600 focus:text-amber-600',
                    action.variant === 'success' && 'text-emerald-600 focus:text-emerald-600'
                  )}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title="Confirm Bulk Action"
        description={pendingAction ? `Are you sure you want to ${pendingAction.label.toLowerCase()} ${selectedIds.length} item(s)?` : ''}
        confirmLabel={pendingAction?.label || 'Continue'}
        variant={pendingAction?.variant === 'danger' ? 'destructive' : 'default'}
        onConfirm={executePendingAction}
      />
    </>
  );
}
