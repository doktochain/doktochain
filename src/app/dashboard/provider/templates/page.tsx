import { useState, useEffect } from 'react';
import { FileText, Plus, Star, Search, Trash2, CreditCard as Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { ehrService } from '../../../../services/ehrService';
import { providerService } from '../../../../services/providerService';
import { useAuth } from '../../../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';

const TEMPLATE_TYPES = [
  { value: 'soap', label: 'SOAP' },
  { value: 'dap', label: 'DAP' },
  { value: 'birp', label: 'BIRP' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'progress', label: 'Progress' },
];

const DEFAULT_STRUCTURES: Record<string, any> = {
  soap: {
    sections: [
      { key: 'subjective', label: 'Subjective', placeholder: "Patient's history, complaints..." },
      { key: 'objective', label: 'Objective', placeholder: 'Physical exam findings, vitals...' },
      { key: 'assessment', label: 'Assessment', placeholder: 'Clinical impressions, diagnosis...' },
      { key: 'plan', label: 'Plan', placeholder: 'Treatment plan, follow-up...' },
    ],
  },
  dap: {
    sections: [
      { key: 'data', label: 'Data' },
      { key: 'assessment', label: 'Assessment' },
      { key: 'plan', label: 'Plan' },
    ],
  },
  birp: {
    sections: [
      { key: 'behavior', label: 'Behavior' },
      { key: 'intervention', label: 'Intervention' },
      { key: 'response', label: 'Response' },
      { key: 'plan', label: 'Plan' },
    ],
  },
};

interface TemplateFormData {
  template_name: string;
  template_type: string;
  specialty: string;
  description: string;
}

const EMPTY_FORM: TemplateFormData = {
  template_name: '',
  template_type: 'soap',
  specialty: '',
  description: '',
};

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      if (user) {
        try {
          const p = await providerService.getProviderByUserId(user.id);
          if (p) setProviderId(p.id);
        } catch {}
      }
    };
    init();
  }, [user]);

  useEffect(() => {
    loadTemplates();
  }, [filterType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await ehrService.getTemplates(
        filterType === 'all' ? undefined : filterType
      );
      setTemplates(allTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name || '',
      template_type: template.template_type || 'soap',
      specialty: template.specialty || '',
      description: template.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.template_name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await ehrService.updateTemplate(editingTemplate.id, {
          template_name: formData.template_name.trim(),
          template_type: formData.template_type,
          specialty: formData.specialty.trim() || null,
          description: formData.description.trim() || null,
        });
        toast.success('Template updated');
      } else {
        await ehrService.createTemplate({
          template_name: formData.template_name.trim(),
          template_type: formData.template_type,
          specialty: formData.specialty.trim() || undefined,
          description: formData.description.trim() || undefined,
          template_structure: DEFAULT_STRUCTURES[formData.template_type] || DEFAULT_STRUCTURES.soap,
          is_system_template: false,
          created_by: providerId || user?.id,
        });
        toast.success('Template created');
      }
      setShowModal(false);
      await loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await ehrService.deleteTemplate(templateId);
      toast.success('Template deleted');
      await loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error?.message || 'Failed to delete template');
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.template_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filterTabs = [{ value: 'all', label: 'All Templates' }, ...TEMPLATE_TYPES];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clinical Templates</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pre-built templates for efficient documentation
          </p>
        </div>

        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((type) => (
              <button
                key={type.value}
                onClick={() => setFilterType(type.value)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  filterType === type.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No templates found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create custom templates to streamline your clinical documentation
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create your first template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {template.template_name}
                    </h4>
                    <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                      {(template.template_type || '').toUpperCase()}
                    </span>
                  </div>
                  {template.is_system_template && (
                    <Star className="w-5 h-5 text-yellow-500" />
                  )}
                </div>

                {template.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {template.description}
                  </p>
                )}

                {template.specialty && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Specialty: {template.specialty}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Used {template.usage_count || 0} times
                  </span>
                  {!template.is_system_template && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(template)}
                        className="h-8 w-8 text-gray-600 hover:text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTargetId(template.id)}
                        className="h-8 w-8 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., General Consultation SOAP"
              />
            </div>

            <div>
              <Label className="mb-2 block">Template Type *</Label>
              <Select
                value={formData.template_type}
                onValueChange={(value) => setFormData({ ...formData, template_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Specialty (optional)</Label>
              <Input
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="e.g., Cardiology"
              />
            </div>

            <div>
              <Label className="mb-2 block">Description (optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="When should this template be used?"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Template"
        description="Are you sure you want to delete this template? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
      />
    </div>
  );
}
