import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  patientInsuranceCardService,
  PatientInsuranceCard,
} from '../../services/patientInsuranceCardService';
import { unifiedSearchService, InsuranceProvider } from '../../services/unifiedSearchService';
import { ConfirmDialog } from '../ui/confirm-dialog';
import {
  CreditCard,
  Plus,
  X,
  Upload,
  AlertCircle,
  Trash2,
  Star,
  Calendar,
  Shield,
  User,
  Loader2,
} from 'lucide-react';

interface InsuranceCardManagerProps {
  patientId: string;
  userId: string;
  onPolicySelect?: (cardId: string) => void;
  selectionMode?: boolean;
}

export default function InsuranceCardManager({
  patientId,
  userId,
  onPolicySelect,
  selectionMode = false,
}: InsuranceCardManagerProps) {
  const [cards, setCards] = useState<PatientInsuranceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadInsuranceCards();
    loadInsuranceProviders();
  }, [patientId]);

  const loadInsuranceCards = async () => {
    try {
      setLoading(true);
      const data = await patientInsuranceCardService.getPatientInsuranceCards(patientId);
      setCards(data);
    } catch (error) {
      console.error('Error loading insurance cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsuranceProviders = async () => {
    const providers = await unifiedSearchService.getInsuranceProviders();
    setInsuranceProviders(providers);
  };

  const handleSetPrimary = async (cardId: string) => {
    try {
      await patientInsuranceCardService.setPrimaryCard(cardId, patientId);
      await loadInsuranceCards();
    } catch (error) {
      console.error('Error setting primary card:', error);
      toast.error('Failed to set primary card');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    setCardToDelete(cardId);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    setConfirmDeleteOpen(false);

    try {
      await patientInsuranceCardService.deleteInsuranceCard(cardToDelete);
      await loadInsuranceCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    } finally {
      setCardToDelete(null);
    }
  };

  const handleSelect = (cardId: string) => {
    setSelectedCardId(cardId);
    onPolicySelect?.(cardId);
  };

  const isExpiringSoon = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.floor(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 30 && daysUntilExpiration >= 0;
  };

  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Insurance Cards</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your insurance information and cards</p>
        </div>
        {!selectionMode && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Insurance Card
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
          <CreditCard className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Insurance Cards Added
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add your insurance cards to streamline appointment bookings and billing
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        <div className={`grid gap-6 ${selectionMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => selectionMode && handleSelect(card.id)}
              className={`bg-white dark:bg-gray-800 border-2 rounded-lg p-6 relative transition ${
                selectionMode && selectedCardId === card.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : card.is_primary
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              } ${isExpired(card.expiration_date) ? 'opacity-60' : ''} ${
                selectionMode ? 'cursor-pointer' : ''
              }`}
            >
              {card.is_primary && !selectionMode && (
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium px-2 py-1 rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Primary
                  </span>
                </div>
              )}

              {isExpired(card.expiration_date) && !selectionMode && (
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Expired
                  </span>
                </div>
              )}
              {!isExpired(card.expiration_date) && isExpiringSoon(card.expiration_date) && !selectionMode && (
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Expiring Soon
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {card.insurance_provider?.name || 'Unknown Provider'}
                  </h3>
                </div>
                {card.policy_type && (
                  <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full capitalize mt-1">
                    {card.policy_type}{card.province && card.policy_type === 'public' ? ` - ${card.province}` : ''}
                  </span>
                )}
                {card.coverage_type && (
                  <span className="inline-block ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full capitalize mt-1">
                    {card.coverage_type}
                  </span>
                )}
                {card.insurance_provider?.slug === 'self-pay' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2 mt-2">
                    <p className="text-xs text-green-800 dark:text-green-300">
                      Out-of-pocket payment option
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Policy Number</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {card.policy_number}
                    </p>
                  </div>
                </div>

                {card.member_id && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Member ID</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{card.member_id}</p>
                    </div>
                  </div>
                )}

                {card.expiration_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Expires</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(card.expiration_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {(card.card_front_url || card.card_back_url) && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {card.card_front_url && (
                    <div className="relative group">
                      <img
                        src={card.card_front_url}
                        alt="Card Front"
                        className="w-full h-20 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                          Front
                        </span>
                      </div>
                    </div>
                  )}
                  {card.card_back_url && (
                    <div className="relative group">
                      <img
                        src={card.card_back_url}
                        alt="Card Back"
                        className="w-full h-20 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                          Back
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectionMode && (
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {!card.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(card.id)}
                      className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      Set as Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddInsuranceCardModal
          patientId={patientId}
          userId={userId}
          insuranceProviders={insuranceProviders}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadInsuranceCards();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Insurance Card"
        description="Are you sure you want to delete this insurance card?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

interface AddInsuranceCardModalProps {
  patientId: string;
  userId: string;
  insuranceProviders: InsuranceProvider[];
  onClose: () => void;
  onSuccess: () => void;
}

const PROVINCES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

function AddInsuranceCardModal({
  patientId,
  userId,
  insuranceProviders,
  onClose,
  onSuccess,
}: AddInsuranceCardModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    insurance_provider_id: '',
    policy_number: '',
    group_number: '',
    member_id: '',
    policy_holder_name: '',
    policy_holder_relationship: 'self' as const,
    effective_date: '',
    expiration_date: '',
    coverage_type: '' as '' | 'individual' | 'family' | 'employee' | 'dependent',
    policy_type: 'private' as 'public' | 'private',
    province: '',
    is_primary: false,
    notes: '',
  });

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string>('');
  const [backPreview, setBackPreview] = useState<string>('');

  const handleFileChange = (side: 'front' | 'back', file: File | null) => {
    if (side === 'front') {
      setFrontImage(file);
      setFrontPreview(file ? URL.createObjectURL(file) : '');
    } else {
      setBackImage(file);
      setBackPreview(file ? URL.createObjectURL(file) : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.insurance_provider_id || !formData.policy_number || !formData.policy_holder_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      let card_front_url = '';
      let card_back_url = '';

      if (frontImage) {
        card_front_url = await patientInsuranceCardService.uploadCardImage(
          frontImage,
          userId,
          'front'
        );
      }

      if (backImage) {
        card_back_url = await patientInsuranceCardService.uploadCardImage(
          backImage,
          userId,
          'back'
        );
      }

      await patientInsuranceCardService.createInsuranceCard({
        ...formData,
        coverage_type: formData.coverage_type || undefined,
        province: formData.policy_type === 'public' ? formData.province : undefined,
        patient_id: patientId,
        card_front_url,
        card_back_url,
        is_primary: formData.is_primary,
        is_active: true,
      });

      onSuccess();
    } catch (error) {
      console.error('Error adding insurance card:', error);
      toast.error('Failed to add insurance card');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Insurance Card</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Policy Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.policy_type}
                onChange={(e) => setFormData({ ...formData, policy_type: e.target.value as 'public' | 'private' })}
                className={inputClass}
              >
                <option value="private">Private</option>
                <option value="public">Public (Provincial)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Coverage Type</label>
              <select
                value={formData.coverage_type}
                onChange={(e) => setFormData({ ...formData, coverage_type: e.target.value as any })}
                className={inputClass}
              >
                <option value="">Select Coverage Type</option>
                <option value="individual">Individual</option>
                <option value="family">Family</option>
                <option value="employee">Employee</option>
                <option value="dependent">Dependent</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Insurance Provider <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.insurance_provider_id}
              onChange={(e) =>
                setFormData({ ...formData, insurance_provider_id: e.target.value })
              }
              className={inputClass}
              required
            >
              <option value="">Select Insurance Provider</option>
              {insuranceProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {formData.policy_type === 'public' && (
            <div>
              <label className={labelClass}>Province</label>
              <select
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Province</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>
              Policy Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.policy_number}
              onChange={(e) =>
                setFormData({ ...formData, policy_number: e.target.value })
              }
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Group Number</label>
              <input
                type="text"
                value={formData.group_number}
                onChange={(e) =>
                  setFormData({ ...formData, group_number: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Member ID</label>
              <input
                type="text"
                value={formData.member_id}
                onChange={(e) =>
                  setFormData({ ...formData, member_id: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Policy Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.policy_holder_name}
                onChange={(e) =>
                  setFormData({ ...formData, policy_holder_name: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Relationship</label>
              <select
                value={formData.policy_holder_relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    policy_holder_relationship: e.target.value as any,
                  })
                }
                className={inputClass}
              >
                <option value="self">Self</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Effective Date</label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData({ ...formData, effective_date: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Expiration Date</label>
              <input
                type="date"
                value={formData.expiration_date}
                onChange={(e) =>
                  setFormData({ ...formData, expiration_date: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Insurance Card Images</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">Front of Card</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange('front', e.target.files?.[0] || null)
                    }
                    className="hidden"
                    id="front-upload"
                  />
                  <label htmlFor="front-upload" className="cursor-pointer">
                    {frontPreview ? (
                      <img
                        src={frontPreview}
                        alt="Front Preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    ) : (
                      <div className="py-8">
                        <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload Front</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">Back of Card</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleFileChange('back', e.target.files?.[0] || null)
                    }
                    className="hidden"
                    id="back-upload"
                  />
                  <label htmlFor="back-upload" className="cursor-pointer">
                    {backPreview ? (
                      <img
                        src={backPreview}
                        alt="Back Preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    ) : (
                      <div className="py-8">
                        <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Upload Back</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Set as primary insurance</span>
          </label>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Insurance Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
