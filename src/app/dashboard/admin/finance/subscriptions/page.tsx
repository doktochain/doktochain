import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CreditCard, Users, TrendingUp, AlertCircle, Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, DollarSign, Eye, CreditCard as Edit2, Save, X } from 'lucide-react';
import {
  SubscriptionService,
  type SubscriptionPlan,
  type Subscription,
} from '../../../../../services/subscriptionService';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<'subscriptions' | 'plans'>('subscriptions');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<SubscriptionPlan>>({});
  const [stats, setStats] = useState({
    total_active: 0, total_trialing: 0, total_cancelled: 0, mrr_cad: 0, by_plan: {} as Record<string, number>,
  });

  const limit = 15;

  useEffect(() => {
    loadData();
  }, [page, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subsData, statsData] = await Promise.all([
        SubscriptionService.getAllPlansAdmin(),
        SubscriptionService.getAllSubscriptions({
          page,
          limit,
          status: statusFilter || undefined,
          subscriber_type: typeFilter || undefined,
        }),
        SubscriptionService.getSubscriptionStats(),
      ]);
      setPlans(plansData);
      setSubscriptions(subsData.data);
      setSubCount(subsData.count);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlanActive = async (plan: SubscriptionPlan) => {
    try {
      await SubscriptionService.updatePlan(plan.id, { is_active: !plan.is_active });
      toast.success(`${plan.name} ${plan.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch {
      toast.error('Failed to update plan status');
    }
  };

  const startEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan.id);
    setEditValues({
      monthly_price_cad: plan.monthly_price_cad,
      annual_price_cad: plan.annual_price_cad ?? undefined,
      transaction_commission_pct: plan.transaction_commission_pct,
      per_extra_seat_cad: plan.per_extra_seat_cad ?? undefined,
    });
  };

  const savePlanEdit = async (planId: string) => {
    try {
      await SubscriptionService.updatePlan(planId, editValues);
      toast.success('Plan updated');
      setEditingPlan(null);
      loadData();
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const totalPages = Math.ceil(subCount / limit);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-50 text-emerald-700',
      trialing: 'bg-blue-50 text-blue-700',
      past_due: 'bg-amber-50 text-amber-700',
      cancelled: 'bg-gray-100 text-gray-600',
      expired: 'bg-red-50 text-red-700',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage plans, pricing, and subscriber accounts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Subscriptions"
          value={String(stats.total_active)}
          icon={Users}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Trialing"
          value={String(stats.total_trialing)}
          icon={AlertCircle}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="MRR"
          value={SubscriptionService.formatPrice(stats.mrr_cad)}
          icon={TrendingUp}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Cancelled"
          value={String(stats.total_cancelled)}
          icon={CreditCard}
          color="bg-gray-100 text-gray-600"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'subscriptions' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Subscriptions
        </button>
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'plans' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Plan Catalog
        </button>
      </div>

      {tab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by subscriber ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="provider">Provider</option>
              <option value="clinic">Clinic</option>
              <option value="pharmacy">Pharmacy</option>
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No subscriptions found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Subscriber</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Plan</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Billing</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Seats</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Period End</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {subscriptions
                      .filter((s) => !searchTerm || s.subscriber_id.includes(searchTerm))
                      .map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                            {sub.subscriber_id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium capitalize">
                              {sub.subscriber_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {sub.plan?.name || 'Unknown'}
                          </td>
                          <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 capitalize">{sub.billing_interval}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{sub.seat_count}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(sub.current_period_end).toLocaleDateString('en-CA')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages} ({subCount} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'plans' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Monthly</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Annual</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Commission</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Extra Seat</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Subscribers</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {plans.map((plan) => {
                  const isEditing = editingPlan === plan.id;
                  const subCount = stats.by_plan[plan.plan_key] || 0;

                  return (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{plan.name}</span>
                          {plan.is_popular && (
                            <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Popular</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{plan.plan_key}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{plan.target_role}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.monthly_price_cad ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, monthly_price_cad: Number(e.target.value) })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-sm text-gray-900">
                            {plan.is_free ? 'Free' : plan.is_custom_pricing ? 'Custom' : SubscriptionService.formatPrice(plan.monthly_price_cad)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.annual_price_cad ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, annual_price_cad: Number(e.target.value) })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-sm text-gray-600">
                            {plan.annual_price_cad ? SubscriptionService.formatPrice(plan.annual_price_cad) : '--'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editValues.transaction_commission_pct ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, transaction_commission_pct: Number(e.target.value) })}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-sm text-gray-600">{plan.transaction_commission_pct}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.per_extra_seat_cad ?? ''}
                            onChange={(e) => setEditValues({ ...editValues, per_extra_seat_cad: Number(e.target.value) })}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-sm text-gray-600">
                            {plan.per_extra_seat_cad ? SubscriptionService.formatPrice(plan.per_extra_seat_cad) : '--'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{subCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePlanActive(plan)}
                          className="text-gray-500 hover:text-gray-700"
                          title={plan.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {plan.is_active ? (
                            <ToggleRight className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => savePlanEdit(plan.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingPlan(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditPlan(plan)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
