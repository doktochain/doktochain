import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { pharmacyInventoryService, InventoryItem } from '../../../../services/pharmacyInventoryService';
import { Boxes, Search, Filter, AlertTriangle, Plus, CreditCard as Edit2, Package, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';

export default function PharmacyInventory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ stock_quantity: 0, unit_price_cents: 0, reorder_level: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPharmacyId();
  }, [user]);

  useEffect(() => {
    if (pharmacyId) {
      loadInventory();

      const channel = supabase
        .channel('pharmacy_inventory_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pharmacy_inventory',
            filter: `pharmacy_id=eq.${pharmacyId}`,
          },
          () => loadInventory()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
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
      setInventory(result as InventoryItem[]);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Unable to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      stock_quantity: item.stock_quantity,
      unit_price_cents: item.unit_price_cents,
      reorder_level: item.reorder_level,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      await pharmacyInventoryService.updateInventoryItem(editingItem.id, editForm);
      setEditingItem(null);
      await loadInventory();
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setSaving(false);
    }
  };

  const getLowStockCount = () =>
    inventory.filter((item) => item.stock_quantity <= item.reorder_level && item.stock_quantity > 0).length;

  const getOutOfStockCount = () =>
    inventory.filter((item) => item.stock_quantity === 0).length;

  const filteredAndSorted = inventory
    .filter((item) => {
      const matchesSearch =
        item.medication_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.din_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.generic_name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'low-stock') {
        return item.stock_quantity <= item.reorder_level && item.stock_quantity > 0;
      } else if (filterType === 'out-of-stock') {
        return item.stock_quantity === 0;
      }

      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.medication_name || '').localeCompare(b.medication_name || '');
      } else if (sortBy === 'quantity') {
        cmp = a.stock_quantity - b.stock_quantity;
      } else if (sortBy === 'expiry') {
        cmp = new Date(a.expiry_date || '9999-12-31').getTime() - new Date(b.expiry_date || '9999-12-31').getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const getStockBadgeVariant = (item: InventoryItem) => {
    if (item.stock_quantity === 0) {
      return { label: 'OUT OF STOCK', variant: 'destructive' as const };
    } else if (item.stock_quantity <= item.reorder_level) {
      return { label: 'LOW STOCK', variant: 'warning' as const };
    }
    return { label: 'IN STOCK', variant: 'success' as const };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage pharmacy inventory and stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadInventory}>
            Refresh
          </Button>
          <Button onClick={() => navigate('/dashboard/pharmacy/inventory/add')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">{getLowStockCount()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{getOutOfStockCount()}</p>
              </div>
              <Boxes className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, DIN, or generic name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground w-5 h-5" />
              <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'low-stock' | 'out-of-stock')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'name' | 'quantity' | 'expiry')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="quantity">Sort by Quantity</SelectItem>
                <SelectItem value="expiry">Sort by Expiry</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '\u2191' : '\u2193'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading inventory...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <Button variant="destructive" onClick={loadInventory} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="text-center py-12">
              <Boxes className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Medication</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">DIN</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredAndSorted.map((item) => {
                    const status = getStockBadgeVariant(item);
                    return (
                      <tr key={item.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">
                            {item.medication_name}
                          </div>
                          {item.strength && (
                            <div className="text-xs text-muted-foreground">
                              {item.strength} {item.form}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.din_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          <div className="flex flex-col">
                            <span className="font-semibold">{item.stock_quantity}</span>
                            <span className="text-xs text-muted-foreground">Reorder: {item.reorder_level}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          ${(item.unit_price_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {editingItem?.medication_name}
            {editingItem?.strength && ` - ${editingItem.strength}`}
          </p>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">Stock Quantity</Label>
              <Input
                type="number"
                min="0"
                value={editForm.stock_quantity}
                onChange={(e) => setEditForm({ ...editForm, stock_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Unit Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={(editForm.unit_price_cents / 100).toFixed(2)}
                onChange={(e) => setEditForm({ ...editForm, unit_price_cents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
              />
            </div>
            <div>
              <Label className="mb-1 block">Reorder Level</Label>
              <Input
                type="number"
                min="0"
                value={editForm.reorder_level}
                onChange={(e) => setEditForm({ ...editForm, reorder_level: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditingItem(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
