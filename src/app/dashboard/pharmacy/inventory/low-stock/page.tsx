import { useEffect, useState } from 'react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { supabase } from '../../../../../lib/supabase';
import { pharmacyInventoryService, InventoryItem } from '../../../../../services/pharmacyInventoryService';
import { AlertTriangle, Package, ArrowLeft, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PharmacyLowStock() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ stock_quantity: 0, reorder_level: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [user]);

  useEffect(() => {
    if (pharmacyId) {
      loadInventory();
    }
  }, [pharmacyId]);

  const loadPharmacyId = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setPharmacyId(data.id);
  };

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await pharmacyInventoryService.getInventory(pharmacyId);
      const lowStockItems = (result || []).filter(
        (item: InventoryItem) => item.stock_quantity <= (item.reorder_level || 10)
      );
      setInventory(lowStockItems);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Unable to load low stock items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      stock_quantity: item.stock_quantity,
      reorder_level: item.reorder_level || 10,
    });
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await pharmacyInventoryService.updateInventoryItem(editingItem.id, {
        stock_quantity: editForm.stock_quantity,
        reorder_level: editForm.reorder_level,
      });
      setEditingItem(null);
      loadInventory();
    } catch (err) {
      console.error('Error updating item:', err);
    } finally {
      setSaving(false);
    }
  };

  const outOfStock = inventory.filter(i => i.stock_quantity === 0);
  const lowStock = inventory.filter(i => i.stock_quantity > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/pharmacy/inventory')}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Low Stock Items</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Items that need to be reordered</p>
          </div>
        </div>
        <button
          onClick={loadInventory}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{inventory.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
            </div>
            <Package className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Running Low</p>
              <p className="text-2xl font-bold text-amber-600">{lowStock.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update Stock</h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{editingItem.medication_name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={editForm.stock_quantity}
                  onChange={(e) => setEditForm({ ...editForm, stock_quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level</label>
                <input
                  type="number"
                  value={editForm.reorder_level}
                  onChange={(e) => setEditForm({ ...editForm, reorder_level: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading low stock items...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button onClick={loadInventory} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Try Again
            </button>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">All items are well stocked</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">No items are below their reorder level</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Medication</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reorder Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.medication_name}</p>
                        {item.generic_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.generic_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {item.stock_quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.reorder_level || 10}
                    </td>
                    <td className="px-6 py-4">
                      {item.stock_quantity === 0 ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                          Low Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium"
                      >
                        Update Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
