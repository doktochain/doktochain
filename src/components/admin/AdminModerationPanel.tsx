import { useState } from 'react';
import { toast } from 'sonner';
import { Flag, Ban, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

export interface ModerationAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'danger' | 'default';
  requiresReason?: boolean;
}

interface AdminModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  itemType: string;
  actions?: ModerationAction[];
  onAction: (actionId: string, reason?: string) => Promise<void>;
}

const variantStyles = {
  success: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    border: 'border-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    border: 'border-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-600 dark:text-red-400',
  },
  default: {
    border: 'border-primary',
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
};

export default function AdminModerationPanel({
  isOpen,
  onClose,
  item,
  itemType,
  actions = [
    { id: 'approve', label: 'Approve', icon: <CheckCircle className="h-5 w-5" />, variant: 'success' },
    { id: 'flag', label: 'Flag for Review', icon: <Flag className="h-5 w-5" />, variant: 'warning', requiresReason: true },
    { id: 'suspend', label: 'Suspend', icon: <Ban className="h-5 w-5" />, variant: 'danger', requiresReason: true },
    { id: 'delete', label: 'Delete', icon: <XCircle className="h-5 w-5" />, variant: 'danger', requiresReason: true },
  ],
  onAction,
}: AdminModerationPanelProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedActionData = actions.find((a) => a.id === selectedAction);

  const handleSubmit = async () => {
    if (!selectedAction) return;

    const actionData = actions.find((a) => a.id === selectedAction);
    if (actionData?.requiresReason && !reason.trim()) {
      toast.error('Please provide a reason for this action');
      return;
    }

    setLoading(true);
    try {
      await onAction(selectedAction, reason);
      setSelectedAction(null);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Moderation action failed:', error);
      toast.error('Failed to perform action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-primary" />
            <DialogTitle>Moderation Actions</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">{itemType}</p>
            <div className="p-4 rounded-lg border bg-muted/50">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Select Action</h3>
            <div className="grid grid-cols-2 gap-3">
              {actions.map((action) => {
                const styles = variantStyles[action.variant];
                const isSelected = selectedAction === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 transition-all flex items-center gap-3 text-left',
                      isSelected
                        ? `${styles.border} ${styles.bg} ring-2 ring-offset-2`
                        : 'border-border bg-background hover:bg-accent'
                    )}
                  >
                    <div className={styles.text}>{action.icon}</div>
                    <span className={cn('font-medium', isSelected && styles.text)}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedActionData?.requiresReason && (
            <div>
              <Label className="mb-2 block">Reason for Action</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a detailed reason for this moderation action..."
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedAction || loading}
            variant={selectedActionData?.variant === 'danger' ? 'destructive' : 'default'}
          >
            {loading ? 'Processing...' : 'Confirm Action'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
