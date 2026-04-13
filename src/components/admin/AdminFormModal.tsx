import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'datetime-local' | 'select' | 'textarea' | 'checkbox' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  validation?: (value: any) => string | null;
  disabled?: boolean;
  helperText?: string;
  rows?: number;
}

interface AdminFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

export default function AdminFormModal({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  submitLabel = 'Save',
  isLoading = false,
  children,
  size = 'md',
}: AdminFormModalProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};

    fields.forEach(field => {
      if (field.type === 'checkbox') {
        data[field.name] = formData.get(field.name) === 'on';
      } else if (field.type === 'number') {
        const value = formData.get(field.name);
        data[field.name] = value ? Number(value) : null;
      } else if (field.type === 'file') {
        data[field.name] = formData.get(field.name);
      } else {
        data[field.name] = formData.get(field.name);
      }
    });

    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(sizeClasses[size], 'max-h-[90vh] flex flex-col')}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4">
            {children || (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div
                    key={field.name}
                    className={cn(field.type === 'textarea' && 'md:col-span-2')}
                  >
                    {field.type === 'checkbox' ? (
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id={field.name}
                          name={field.name}
                          disabled={field.disabled}
                          defaultChecked={field.defaultValue}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor={field.name} className="font-normal">
                          {field.helperText || field.label}
                        </Label>
                      </div>
                    ) : (
                      <>
                        <Label htmlFor={field.name} className="mb-1.5 block">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>

                        {field.type === 'select' ? (
                          <select
                            id={field.name}
                            name={field.name}
                            required={field.required}
                            disabled={field.disabled}
                            defaultValue={field.defaultValue}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select {field.label}</option>
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <Textarea
                            id={field.name}
                            name={field.name}
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={field.disabled}
                            defaultValue={field.defaultValue}
                            rows={field.rows || 4}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={field.disabled}
                            defaultValue={field.defaultValue}
                          />
                        )}

                        {field.helperText && field.type !== 'checkbox' && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {field.helperText}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
