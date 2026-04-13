import { useState, useEffect } from 'react';
import { FileText, Plus, Edit, Trash2, X, Copy, Search, Check } from 'lucide-react';
import { messagingService, MessageTemplate } from '../../../../../services/messagingService';
import { useAuth } from '../../../../../contexts/AuthContext';

const CATEGORIES = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_results', label: 'Lab Results' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'general', label: 'General' },
  { value: 'billing', label: 'Billing' },
];

const PLACEHOLDERS = [
  { token: '{{patient_name}}', desc: 'Patient full name' },
  { token: '{{provider_name}}', desc: 'Your name' },
  { token: '{{date}}', desc: 'Appointment date' },
  { token: '{{time}}', desc: 'Appointment time' },
  { token: '{{clinic_name}}', desc: 'Clinic name' },
];

interface TemplateFormData {
  template_name: string;
  template_category: string;
  subject: string;
  content: string;
}

const emptyForm: TemplateFormData = {
  template_name: '',
  template_category: 'general',
  subject: '',
  content: '',
};

export default function MessageTemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await messagingService.getTemplates(user.id);
    if (data) setTemplates(data);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setForm({
      template_name: template.template_name,
      template_category: template.template_category,
      subject: template.subject || '',
      content: template.content,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.template_name.trim() || !form.content.trim()) return;
    setSaving(true);

    if (editingTemplate) {
      await messagingService.updateTemplate(editingTemplate.id, {
        template_name: form.template_name,
        template_category: form.template_category,
        subject: form.subject || undefined,
        content: form.content,
      });
    } else {
      await messagingService.createTemplate({
        provider_id: user.id,
        template_name: form.template_name,
        template_category: form.template_category,
        subject: form.subject || undefined,
        content: form.content,
        is_system_template: false,
        usage_count: 0,
      });
    }

    setSaving(false);
    setShowModal(false);
    loadTemplates();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await messagingService.deleteTemplate(deleteId);
    setDeleteId(null);
    loadTemplates();
  };

  const handleCopyContent = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertPlaceholder = (token: string) => {
    setForm((prev) => ({ ...prev, content: prev.content + token }));
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = categoryFilter === 'all' || t.template_category === categoryFilter;
    const matchesSearch =
      t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      appointment: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
      prescription: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      lab_results: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      follow_up: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
      general: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
      billing: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    };
    return colors[cat] || colors.general;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Message Templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create reusable templates for quick patient communication
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition font-medium"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm transition ${
              categoryFilter === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                categoryFilter === cat.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No templates found</p>
          <button
            onClick={handleOpenCreate}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {template.template_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getCategoryColor(template.template_category)}`}>
                      {template.template_category.replace('_', ' ')}
                    </span>
                    {template.is_system_template && (
                      <span className="text-[11px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                        System
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {template.subject && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 truncate">
                  Subject: {template.subject}
                </p>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                {template.content}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-400">
                  Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyContent(template)}
                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition"
                    title="Copy content"
                  >
                    {copiedId === template.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {!template.is_system_template && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(template)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(template.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                <input
                  type="text"
                  value={form.template_name}
                  onChange={(e) => setForm((p) => ({ ...p, template_name: e.target.value }))}
                  placeholder="e.g., Appointment Confirmation"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={form.template_category}
                  onChange={(e) => setForm((p) => ({ ...p, template_category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject (optional)</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Message subject line"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Write your message template here..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Insert placeholders:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map((p) => (
                      <button
                        key={p.token}
                        onClick={() => insertPlaceholder(p.token)}
                        className="px-2 py-1 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 rounded transition"
                        title={p.desc}
                      >
                        {p.token}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.template_name.trim() || !form.content.trim() || saving}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 text-sm font-medium"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Template</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
