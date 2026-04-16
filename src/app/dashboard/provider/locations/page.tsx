import { useState, useEffect } from 'react';
import { MapPin, Plus, CreditCard as Edit2, Trash2, Phone, Loader2, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { providerService, ProviderLocation } from '../../../../services/providerService';
import { useAuth } from '../../../../contexts/AuthContext';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import AddressMap from '../../../../components/maps/AddressMap';

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
];

const defaultFormData = {
  location_name: '',
  address_line1: '',
  address_line2: '',
  city: '',
  province: 'ON',
  postal_code: '',
  phone: '',
  is_primary: false,
  accepts_in_person: true,
  accepts_virtual: true,
};

export default function ClinicLocationsPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ProviderLocation | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProvider();
    }
  }, [user]);

  useEffect(() => {
    if (providerId) {
      loadLocations();
    }
  }, [providerId]);

  const loadProvider = async () => {
    if (!user) return;
    try {
      const provider = await providerService.getProviderByUserId(user.id);
      if (provider) {
        setProviderId(provider.id);
      }
    } catch (error) {
      console.error('Error loading provider:', error);
    }
  };

  const loadLocations = async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const data = await providerService.getLocations(providerId);
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingLocation(null);
    setFormData(defaultFormData);
    setShowModal(true);
  };

  const openEditModal = (location: ProviderLocation) => {
    setEditingLocation(location);
    setFormData({
      location_name: location.location_name || '',
      address_line1: location.address_line1 || '',
      address_line2: location.address_line2 || '',
      city: location.city || '',
      province: location.province || 'ON',
      postal_code: location.postal_code || '',
      phone: location.phone || '',
      is_primary: location.is_primary || false,
      accepts_in_person: location.accepts_in_person ?? true,
      accepts_virtual: location.accepts_virtual ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;

    setSaving(true);
    try {
      if (editingLocation) {
        await providerService.updateLocation(editingLocation.id, {
          ...formData,
          provider_id: providerId,
        });
        toast.success('Location updated');
      } else {
        await providerService.addLocation({
          ...formData,
          provider_id: providerId,
        });
        toast.success('Location added');
      }
      setShowModal(false);
      await loadLocations();
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast.error(error?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (locationId: string) => {
    try {
      await providerService.deleteLocation(locationId);
      toast.success('Location removed');
      await loadLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast.error(error?.message || 'Failed to delete location');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Locations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your practice locations and consultation types
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Location
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No locations added yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add your first practice location to get started
          </p>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Add Your First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 transition ${
                location.is_primary
                  ? 'border-blue-500'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {location.location_name}
                    </h3>
                    {location.is_primary && (
                      <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 fill-current" />
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {location.accepts_in_person && (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        In-Person
                      </span>
                    )}
                    {location.accepts_virtual && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        Virtual
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(location)}
                    className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!location.is_primary && (
                    <button
                      onClick={() => setDeleteTargetId(location.id)}
                      className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div>{location.address_line1}</div>
                    {location.address_line2 && <div>{location.address_line2}</div>}
                    <div>
                      {location.city}, {location.province} {location.postal_code}
                    </div>
                  </div>
                </div>

                {location.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <a
                      href={`tel:${location.phone}`}
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {location.phone}
                    </a>
                  </div>
                )}

                <AddressMap
                  addressLine1={location.address_line1}
                  addressLine2={location.address_line2}
                  city={location.city}
                  province={location.province}
                  postalCode={location.postal_code}
                  height={180}
                  className="mt-2"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Main Clinic, Downtown Office"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 123 Medical Drive"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  placeholder="Suite, Unit, Floor"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Toronto"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Province *
                  </label>
                  <select
                    required
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="M5H 2N2"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="(416) 555-0100"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Consultation Types</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.accepts_in_person}
                    onChange={(e) => setFormData({ ...formData, accepts_in_person: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Accepts in-person visits</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.accepts_virtual}
                    onChange={(e) => setFormData({ ...formData, accepts_virtual: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Accepts virtual consultations</span>
                </label>
              </div>

              <label className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Set as primary location</span>
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Location"
        description="Are you sure you want to delete this location?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTargetId && executeDelete(deleteTargetId)}
      />
    </div>
  );
}
