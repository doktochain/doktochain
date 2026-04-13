import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Building2, MapPin, Phone, Mail, CreditCard as Edit2, Save, Truck, FileText } from 'lucide-react';

const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
];

const PHARMACY_TYPES = [
  { value: 'retail', label: 'Retail Pharmacy' },
  { value: 'hospital', label: 'Hospital Pharmacy' },
  { value: 'compounding', label: 'Compounding Pharmacy' },
  { value: 'specialty', label: 'Specialty Pharmacy' },
  { value: 'online', label: 'Online Pharmacy' },
];

export default function PharmacyProfile() {
  const { user } = useAuth();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPharmacy();
  }, [user]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview(null);
  }, [logoFile]);

  const loadPharmacy = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPharmacy(data);
        setEditedData(data);
      }
    } catch (error) {
      console.error('Error loading pharmacy:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pharmacy) return;
    setSaving(true);
    try {
      let logoUrl = editedData.logo_url;

      if (logoFile) {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${logoFile.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
        const filePath = `pharmacy-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      const updateData = {
        pharmacy_name: editedData.pharmacy_name,
        license_number: editedData.license_number,
        phone: editedData.phone,
        fax: editedData.fax || null,
        email: editedData.email,
        description: editedData.description || null,
        pharmacy_type: editedData.pharmacy_type || 'retail',
        address_line1: editedData.address_line1,
        address_line2: editedData.address_line2 || null,
        city: editedData.city,
        province: editedData.province,
        postal_code: editedData.postal_code,
        accepts_delivery: editedData.accepts_delivery ?? true,
        delivery_fee_cents: editedData.accepts_delivery ? (editedData.delivery_fee_cents || 0) : null,
        minimum_order_cents: editedData.accepts_delivery ? (editedData.minimum_order_cents || 0) : null,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('pharmacies')
        .update(updateData)
        .eq('id', pharmacy.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (logoUrl && user) {
        await supabase
          .from('user_profiles')
          .update({ profile_photo_url: logoUrl })
          .eq('id', user.id);
      }

      setPharmacy(data);
      setEditedData(data);
      setEditing(false);
      setLogoFile(null);
      setToast({ type: 'success', message: 'Pharmacy profile updated successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error('Error updating pharmacy:', error);
      setToast({ type: 'error', message: `Failed to update profile: ${error.message}` });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const formatCents = (cents: number | null) => {
    if (!cents) return '$0.00';
    return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading pharmacy profile...</p>
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">No pharmacy profile found.</p>
          <p className="text-yellow-600 text-sm mt-1">Please complete onboarding first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pharmacy Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your pharmacy information and settings</p>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditing(false);
                setEditedData(pharmacy);
                setLogoFile(null);
              }}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pharmacy Logo
                </label>
                {editing ? (
                  <div className="flex items-center gap-4">
                    {(logoPreview || editedData.logo_url) && (
                      <img
                        src={logoPreview || editedData.logo_url}
                        alt="Logo preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Square image recommended, max 2MB</p>
                    </div>
                  </div>
                ) : (
                  pharmacy.logo_url ? (
                    <img src={pharmacy.logo_url} alt="Pharmacy logo" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedData.pharmacy_name || ''}
                      onChange={(e) => updateField('pharmacy_name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.pharmacy_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedData.license_number || ''}
                      onChange={(e) => updateField('license_number', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.license_number}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pharmacy Type</label>
                {editing ? (
                  <select
                    value={editedData.pharmacy_type || 'retail'}
                    onChange={(e) => updateField('pharmacy_type', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {PHARMACY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white capitalize">{pharmacy.pharmacy_type || 'Retail'} Pharmacy</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedData.phone || ''}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.phone || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fax</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editedData.fax || ''}
                      onChange={(e) => updateField('fax', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.fax || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={editedData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{pharmacy.email || 'N/A'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                {editing ? (
                  <textarea
                    value={editedData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={3}
                    placeholder="Brief description of your pharmacy and services..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{pharmacy.description || 'No description provided'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedData.address_line1 || ''}
                    onChange={(e) => updateField('address_line1', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{pharmacy.address_line1}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit / Suite (Optional)</label>
                {editing ? (
                  <input
                    type="text"
                    value={editedData.address_line2 || ''}
                    onChange={(e) => updateField('address_line2', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{pharmacy.address_line2 || '--'}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedData.city || ''}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Province</label>
                  {editing ? (
                    <select
                      value={editedData.province || ''}
                      onChange={(e) => updateField('province', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select...</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.province}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editedData.postal_code || ''}
                      onChange={(e) => updateField('postal_code', e.target.value.toUpperCase())}
                      maxLength={7}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{pharmacy.postal_code}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delivery Settings</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {editing ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedData.accepts_delivery ?? true}
                      onChange={(e) => updateField('accepts_delivery', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    />
                    <span className="text-gray-900 dark:text-white font-medium">Accept delivery orders</span>
                  </label>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      pharmacy.accepts_delivery
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {pharmacy.accepts_delivery ? 'Delivery Enabled' : 'No Delivery'}
                    </span>
                  </div>
                )}
              </div>

              {(editing ? editedData.accepts_delivery : pharmacy.accepts_delivery) && (
                <div className="grid grid-cols-2 gap-4 pl-0">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Fee</label>
                    {editing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={((editedData.delivery_fee_cents || 0) / 100).toFixed(2)}
                          onChange={(e) => updateField('delivery_fee_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900 dark:text-white">{formatCents(pharmacy.delivery_fee_cents)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Order</label>
                    {editing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={((editedData.minimum_order_cents || 0) / 100).toFixed(2)}
                          onChange={(e) => updateField('minimum_order_cents', Math.round(parseFloat(e.target.value || '0') * 100))}
                          className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900 dark:text-white">{formatCents(pharmacy.minimum_order_cents)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  pharmacy.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {pharmacy.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Verification</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  pharmacy.is_verified
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {pharmacy.is_verified ? 'VERIFIED' : 'PENDING'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Onboarding</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  pharmacy.onboarding_status === 'approved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : pharmacy.onboarding_status === 'submitted'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {(pharmacy.onboarding_status || 'pending').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Info</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{pharmacy.pharmacy_name}</p>
                  <p className="text-xs text-gray-500">License: {pharmacy.license_number}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pharmacy.address_line1}, {pharmacy.city}, {pharmacy.province} {pharmacy.postal_code}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{pharmacy.phone}</p>
              </div>
              {pharmacy.fax && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fax: {pharmacy.fax}</p>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{pharmacy.email}</p>
              </div>
            </div>
          </div>

          {pharmacy.rating_count > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Ratings</h3>
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900 dark:text-white">
                  {Number(pharmacy.rating_average || 0).toFixed(1)}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(pharmacy.rating_average || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pharmacy.rating_count} reviews</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Member Since</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {new Date(pharmacy.created_at).toLocaleDateString('en-CA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
