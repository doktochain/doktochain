import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { patientService } from '../../../../services/patientService';
import {
  Users, Search, Mail, Phone, Package, Eye, X,
  AlertCircle, Pill, ClipboardList, ArrowLeft,
} from 'lucide-react';

interface CustomerDetail {
  id: string;
  user_profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth?: string;
    gender?: string;
  };
  orderCount: number;
}

export default function PharmacyCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'orders'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [customerAllergies, setCustomerAllergies] = useState<any[]>([]);
  const [customerMedications, setCustomerMedications] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadPharmacyId();
  }, [user]);

  useEffect(() => {
    if (pharmacyId) loadCustomers();
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

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pharmacy_orders')
        .select(`
          patient_id,
          patients!inner (
            id,
            user_profiles!inner (
              first_name,
              last_name,
              email,
              phone,
              date_of_birth,
              gender
            )
          )
        `)
        .eq('pharmacy_id', pharmacyId);

      if (error) throw error;

      const patientMap = new Map<string, any>();
      (data || []).forEach((order: any) => {
        const patient = order.patients;
        if (patient) {
          if (!patientMap.has(patient.id)) {
            patientMap.set(patient.id, { ...patient, orderCount: 1 });
          } else {
            patientMap.get(patient.id).orderCount += 1;
          }
        }
      });

      setCustomers(Array.from(patientMap.values()));
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerDetails = async (customer: any) => {
    setSelectedCustomer(customer);
    setDetailLoading(true);

    try {
      const [allergies, medications, ordersRes] = await Promise.all([
        patientService.getAllergies(customer.id).catch(() => []),
        patientService.getCurrentMedications(customer.id).catch(() => []),
        supabase
          .from('pharmacy_orders')
          .select('id, order_number, status, total_cents, created_at, order_items(medication_name, quantity)')
          .eq('pharmacy_id', pharmacyId)
          .eq('patient_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setCustomerAllergies(allergies);
      setCustomerMedications(medications);
      setCustomerOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error loading customer details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredAndSorted = customers
    .filter((customer) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.user_profiles?.first_name?.toLowerCase().includes(searchLower) ||
        customer.user_profiles?.last_name?.toLowerCase().includes(searchLower) ||
        customer.user_profiles?.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        const nameA = `${a.user_profiles?.first_name} ${a.user_profiles?.last_name}`;
        const nameB = `${b.user_profiles?.first_name} ${b.user_profiles?.last_name}`;
        cmp = nameA.localeCompare(nameB);
      } else if (sortBy === 'orders') {
        cmp = a.orderCount - b.orderCount;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  if (selectedCustomer) {
    const profile = selectedCustomer.user_profiles;
    return (
      <div className="p-6 space-y-6">
        <button
          onClick={() => setSelectedCustomer(null)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-xl font-bold">
                {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                {profile?.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profile.email}</span>
                )}
                {profile?.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profile.phone}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.orderCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Orders</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{customerMedications.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Medications</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{customerAllergies.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Known Allergies</p>
            </div>
          </div>
        </div>

        {detailLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Allergy Alerts
              </h3>
              {customerAllergies.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No known allergies on file</p>
              ) : (
                <div className="space-y-2">
                  {customerAllergies.map((allergy) => (
                    <div key={allergy.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="font-semibold text-red-900 dark:text-red-300">{allergy.allergen}</p>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {allergy.severity} - {allergy.reaction}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-blue-600" />
                Active Medications
              </h3>
              {customerMedications.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No active medications on file</p>
              ) : (
                <div className="space-y-2">
                  {customerMedications.map((med) => (
                    <div key={med.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="font-semibold text-blue-900 dark:text-blue-300">{med.medication_name}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {med.dosage} - {med.frequency}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-green-600" />
                Order History at This Pharmacy
              </h3>
              {customerOrders.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No order history</p>
              ) : (
                <div className="space-y-3">
                  {customerOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{order.order_number}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(order.created_at).toLocaleDateString()} -
                          {' '}{(order.order_items || []).map((i: any) => i.medication_name).filter(Boolean).join(', ') || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${((order.total_cents || 0) / 100).toFixed(2)}
                        </p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your pharmacy customers</p>
        </div>
        <button
          onClick={loadCustomers}
          className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{customers.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {customers.reduce((sum, c) => sum + c.orderCount, 0)}
              </p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Orders/Customer</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {customers.length > 0
                  ? (customers.reduce((sum, c) => sum + c.orderCount, 0) / customers.length).toFixed(1)
                  : 0}
              </p>
            </div>
            <Package className="w-8 h-8 text-teal-600" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name">Sort by Name</option>
            <option value="orders">Sort by Orders</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading customers...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {customers.length === 0 ? 'No customers yet. Customers appear after their first order.' : 'No matching customers.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSorted.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {customer.user_profiles?.first_name?.charAt(0)}
                            {customer.user_profiles?.last_name?.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {customer.user_profiles?.first_name} {customer.user_profiles?.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1 mb-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {customer.user_profiles?.email || 'N/A'}
                      </div>
                      {customer.user_profiles?.phone && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {customer.user_profiles.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {customer.orderCount} orders
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewCustomerDetails(customer)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
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
