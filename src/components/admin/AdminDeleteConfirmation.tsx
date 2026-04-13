import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface AdminDeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
  cascadeWarning?: string[];
}

export default function AdminDeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  isLoading = false,
  cascadeWarning,
}: AdminDeleteConfirmationProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1 space-y-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{message}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {itemName && (
          <div className="px-3 py-2 rounded-lg bg-muted">
            <p className="text-sm font-medium">{itemName}</p>
          </div>
        )}

        {cascadeWarning && cascadeWarning.length > 0 && (
          <div className="px-3 py-2 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
            <p className="text-sm font-medium mb-2 text-yellow-600 dark:text-yellow-400">
              Warning: This will also affect:
            </p>
            <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-300">
              {cascadeWarning.map((warning, index) => (
                <li key={index}>&#8226; {warning}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">This action cannot be undone.</p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
