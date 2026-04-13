import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Package, ShoppingCart, Pill, Users, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react';
import PharmacyOnboardingWizard from '../../../../components/pharmacy/PharmacyOnboardingWizard';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { CHART_COLORS, chartTooltipStyle, chartAxisColor, chartGridColor } from '../../../../config/chartColors';
import CurrentPlanBanner from '../../../../components/subscription/CurrentPlanBanner';

interface DashboardStats {
  pendingOrders: number;
  totalOrders: number;
  activeProducts: number;
  lowStockItems: number;
  totalCustomers: number;
  monthlyRevenue: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total_cents: number;
  status: string;
  created_at: string;
  patient_name: string;
  item_count: number;
}

interface LowStockItem {
  id: string;
  medication_name: string;
  stock_quantity: number;
  reorder_level: number;
}

export default function PharmacyDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    totalOrders: 0,
    activeProducts: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    monthlyRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockItem[]>([]);

  useEffect(() => {
    loadPharmacy();
  }, [user]);

  const loadPharmacy = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.onboarding_status === 'approved') {
        setPharmacy(data);
        await loadDashboardData(data.id);
      } else if (data && (data.onboarding_status === 'submitted' || data.onboarding_status === 'under_review')) {
        setPharmacy(data);
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Error loading pharmacy:', err);
      setShowOnboarding(true);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (pharmacyId: string) => {
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [
        pendingRes,
        totalOrdersRes,
        activeProductsRes,
        inventoryRes,
        customersRes,
        revenueRes,
        recentRes,
      ] = await Promise.all([
        supabase
          .from('pharmacy_orders')
          .select('id', { count: 'exact', head: true })
          .eq('pharmacy_id', pharmacyId)
          .eq('status', 'pending'),
        supabase
          .from('pharmacy_orders')
          .select('id', { count: 'exact', head: true })
          .eq('pharmacy_id', pharmacyId),
        supabase
          .from('pharmacy_inventory')
          .select('id', { count: 'exact', head: true })
          .eq('pharmacy_id', pharmacyId)
          .gt('stock_quantity', 0),
        supabase
          .from('pharmacy_inventory')
          .select('id, medication_name, stock_quantity, reorder_level')
          .eq('pharmacy_id', pharmacyId),
        supabase
          .from('pharmacy_orders')
          .select('patient_id')
          .eq('pharmacy_id', pharmacyId),
        supabase
          .from('pharmacy_orders')
          .select('total_cents')
          .eq('pharmacy_id', pharmacyId)
          .eq('status', 'completed')
          .gte('created_at', monthStart.toISOString()),
        supabase
          .from('pharmacy_orders')
          .select('id, order_number, total_cents, status, created_at, patients(user_profiles(first_name, last_name)), order_items(id)')
          .eq('pharmacy_id', pharmacyId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const lowStockItems = (inventoryRes.data || []).filter(
        (item: any) => item.stock_quantity <= item.reorder_level
      );

      const uniqueCustomers = new Set(
        (customersRes.data || []).map((o: any) => o.patient_id)
      );

      const revenue = (revenueRes.data || []).reduce(
        (sum: number, o: any) => sum + (o.total_cents || 0),
        0
      );

      setStats({
        pendingOrders: pendingRes.count || 0,
        totalOrders: totalOrdersRes.count || 0,
        activeProducts: activeProductsRes.count || 0,
        lowStockItems: lowStockItems.length,
        totalCustomers: uniqueCustomers.size,
        monthlyRevenue: revenue,
      });

      setLowStockAlerts(
        lowStockItems
          .sort((a: any, b: any) => a.stock_quantity - b.stock_quantity)
          .slice(0, 5)
      );

      const orders = (recentRes.data || []).map((order: any) => {
        const profile = order.patients?.user_profiles;
        return {
          id: order.id,
          order_number: order.order_number || 'N/A',
          total_cents: order.total_cents || 0,
          status: order.status,
          created_at: order.created_at,
          patient_name: profile
            ? `${profile.first_name} ${profile.last_name}`
            : 'Unknown',
          item_count: order.order_items?.length || 0,
        };
      });
      setRecentOrders(orders);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="p-6">
        <PharmacyOnboardingWizard
          onComplete={() => {
            setShowOnboarding(false);
            loadPharmacy();
          }}
        />
      </div>
    );
  }

  if (pharmacy && !pharmacy.is_verified) {
    return (
      <div className="p-6">
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-sky-800 mb-2">Pharmacy Under Review</h2>
          <p className="text-sky-700 mb-2">
            Your pharmacy "{pharmacy.pharmacy_name}" has been submitted and is pending verification by our team.
          </p>
          <p className="text-sm text-sky-600">
            You will be notified once your pharmacy has been approved and activated.
          </p>
        </div>
      </div>
    );
  }

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' });
  };

  const getOrderBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'ready': return 'success';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pharmacy Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {profile?.first_name || 'Pharmacy Manager'}
          </p>
        </div>
      </div>

      <CurrentPlanBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.pendingOrders}</h3>
                <p className="text-sm text-orange-600 mt-1">
                  {stats.pendingOrders > 0 ? 'Requires attention' : 'All caught up'}
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <ShoppingCart className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.totalOrders}</h3>
                <p className="text-sm text-green-600 mt-1">All time</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Package className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Products</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.activeProducts}</h3>
                <p className="text-sm text-blue-600 mt-1">In inventory</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Pill className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Low Stock Items</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.lowStockItems}</h3>
                <p className="text-sm text-red-600 mt-1">
                  {stats.lowStockItems > 0 ? 'Need reorder' : 'Stock levels OK'}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Customers</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.totalCustomers}</h3>
                <p className="text-sm text-teal-600 mt-1">Unique patients</p>
              </div>
              <div className="bg-teal-100 p-3 rounded-lg">
                <Users className="w-8 h-8 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Revenue</p>
                <h3 className="text-3xl font-bold text-foreground">
                  {formatCents(stats.monthlyRevenue)}
                </h3>
                <p className="text-sm text-teal-600 mt-1">This month</p>
              </div>
              <div className="bg-teal-100 p-3 rounded-lg">
                <TrendingUp className="w-8 h-8 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Recent Orders</CardTitle>
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/dashboard/pharmacy/orders')}
              className="flex items-center gap-1"
            >
              View all <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No orders yet</p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-semibold text-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.patient_name} - {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCents(order.total_cents)}</p>
                      <Badge variant={getOrderBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl">Low Stock Alerts</CardTitle>
            <AlertCircle className="w-6 h-6 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockAlerts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-green-600 font-medium">All stock levels are healthy</p>
                  <p className="text-muted-foreground text-sm mt-1">No items below reorder threshold</p>
                </div>
              ) : (
                lowStockAlerts.map((item) => (
                  <div key={item.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-foreground">{item.medication_name}</p>
                      <span className="text-red-600 font-bold">{item.stock_quantity} left</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.stock_quantity === 0 ? 'bg-red-800' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min((item.stock_quantity / item.reorder_level) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reorder level: {item.reorder_level}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
