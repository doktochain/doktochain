import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { pharmacyService, Pharmacy, PharmacyOrder, PharmacyInventory } from '../../../../services/pharmacyService';
import { prescriptionService } from '../../../../services/prescriptionService';
import { patientService } from '../../../../services/patientService';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  Phone,
  Star,
  ShoppingCart,
  Truck,
  FileText,
  Search,
  Loader2,
  Package,
  Clock,
  ChevronRight,
  Send,
  Eye,
  XCircle,
  Pill,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';

export default function PharmacyMarketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pharmacies' | 'prescriptions' | 'orders'>('pharmacies');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacyInventory, setPharmacyInventory] = useState<PharmacyInventory[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [sendToPharmacyModal, setSendToPharmacyModal] = useState(false);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const patientData = await patientService.getPatientByUserId(user.id);
      setPatient(patientData);

      if (patientData) {
        if (activeTab === 'pharmacies') {
          const pharmaciesData = await pharmacyService.searchPharmacies({});
          setPharmacies(pharmaciesData);
        } else if (activeTab === 'prescriptions') {
          const prescriptionsData = await prescriptionService.getPatientPrescriptions(patientData.id);
          setPrescriptions(prescriptionsData);
        } else if (activeTab === 'orders') {
          const ordersData = await pharmacyService.getPatientOrders(patientData.id);
          setOrders(ordersData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPharmacies = pharmacies.filter(
    (pharmacy) =>
      pharmacy.pharmacy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pharmacy.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewInventory = async (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setInventoryLoading(true);
    try {
      const items = await pharmacyService.searchMedications(pharmacy.id, '');
      setPharmacyInventory(items);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleInventorySearch = async () => {
    if (!selectedPharmacy) return;
    setInventoryLoading(true);
    try {
      const items = await pharmacyService.searchMedications(selectedPharmacy.id, inventorySearch);
      setPharmacyInventory(items);
    } catch (error) {
      console.error('Error searching inventory:', error);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleSelectPharmacy = (pharmacy: Pharmacy) => {
    if (selectedPrescription) {
      handleSendPrescription(selectedPrescription.id, pharmacy.id);
    }
  };

  const handleSendPrescription = async (prescriptionId: string, pharmacyId: string) => {
    setActionLoading(true);
    try {
      await prescriptionService.updatePrescriptionStatus(prescriptionId, 'sent', pharmacyId);
      setSendToPharmacyModal(false);
      setSelectedPrescription(null);
      await loadData();
    } catch (error) {
      console.error('Error sending prescription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setActionLoading(true);
    try {
      await pharmacyService.updateOrderStatus(orderId, 'cancelled');
      setCancellingOrderId(null);
      await loadData();
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getOrderStatusVariant = (status: string): "warning" | "info" | "default" | "success" | "destructive" => {
    switch (status) {
      case 'delivered':
      case 'picked_up':
        return 'success';
      case 'out_for_delivery':
      case 'out-for-delivery':
        return 'info';
      case 'cancelled':
        return 'destructive';
      case 'processing':
      case 'ready':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getPrescriptionStatusVariant = (status: string): "warning" | "info" | "success" | "destructive" => {
    switch (status) {
      case 'filled':
        return 'success';
      case 'sent':
        return 'info';
      case 'cancelled':
        return 'destructive';
      default:
        return 'warning';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pharmacy & Prescriptions</h1>
          <p className="text-muted-foreground mt-1">Find pharmacies, manage prescriptions, and track orders</p>
        </div>
        <Button
          onClick={() => navigate('/dashboard/patient/pharmacy/orders')}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          My Orders
        </Button>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pharmacies' | 'prescriptions' | 'orders')}>
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="pharmacies" className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                Find Pharmacies
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Prescriptions
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Orders
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            <TabsContent value="pharmacies" className="mt-0">
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search pharmacies by name or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 py-3"
                  />
                </div>

                {filteredPharmacies.length === 0 ? (
                  <div className="text-center py-12">
                    <Store className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No pharmacies found</h3>
                    <p className="text-muted-foreground">Try adjusting your search terms</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPharmacies.map((pharmacy) => (
                      <Card
                        key={pharmacy.id}
                        className="p-6 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Store className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground">
                                {pharmacy.pharmacy_name}
                              </h3>
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-sm text-muted-foreground">
                                  {pharmacy.rating_average.toFixed(1)} ({pharmacy.rating_count} reviews)
                                </span>
                              </div>
                            </div>
                          </div>
                          {pharmacy.accepts_delivery && (
                            <Badge variant="success" className="flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              Delivery
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                            <span>
                              {pharmacy.address_line1}, {pharmacy.city}, {pharmacy.province} {pharmacy.postal_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{pharmacy.phone}</span>
                          </div>
                        </div>

                        {pharmacy.accepts_delivery && (
                          <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-lg">
                            <div className="flex justify-between">
                              <span>Delivery Fee:</span>
                              <span className="font-medium">
                                ${((pharmacy.delivery_fee_cents || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                            {pharmacy.minimum_order_cents && (
                              <div className="flex justify-between mt-1">
                                <span>Minimum Order:</span>
                                <span className="font-medium">
                                  ${(pharmacy.minimum_order_cents / 100).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleViewInventory(pharmacy)}
                            className="flex-1"
                            size="sm"
                          >
                            View Inventory
                          </Button>
                          {selectedPrescription && (
                            <Button
                              onClick={() => handleSelectPharmacy(pharmacy)}
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                            >
                              Select
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-0">
              <div className="space-y-4">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No prescriptions found</h3>
                    <p className="text-muted-foreground">Your prescriptions will appear here after a consultation</p>
                  </div>
                ) : (
                  prescriptions.map((prescription) => (
                    <Card
                      key={prescription.id}
                      className="p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Pill className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Prescription #{prescription.prescription_number}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Prescribed by Dr. {prescription.providers?.user_profiles?.first_name}{' '}
                              {prescription.providers?.user_profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(prescription.prescription_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getPrescriptionStatusVariant(prescription.status)}>
                          {prescription.status}
                        </Badge>
                      </div>

                      {prescription.diagnosis && (
                        <div className="mb-3 text-sm p-3 bg-muted rounded-lg">
                          <span className="font-medium text-foreground">Diagnosis: </span>
                          <span className="text-muted-foreground">{prescription.diagnosis}</span>
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        {prescription.status === 'pending' && (
                          <Button
                            onClick={() => {
                              setSelectedPrescription(prescription);
                              setSendToPharmacyModal(true);
                            }}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" />
                            Send to Pharmacy
                          </Button>
                        )}
                        {prescription.status === 'sent' && (
                          <Button
                            onClick={() => navigate('/dashboard/patient/pharmacy/orders')}
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                          >
                            <Package className="w-4 h-4" />
                            Track at Pharmacy
                          </Button>
                        )}
                        <Button
                          onClick={() => navigate('/dashboard/patient/prescriptions')}
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>
                    <p className="text-muted-foreground">Your pharmacy orders will appear here</p>
                  </div>
                ) : (
                  orders.map((order: any) => (
                    <Card
                      key={order.id}
                      className="p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              Order #{order.order_number}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.pharmacies?.pharmacy_name}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Placed: {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={getOrderStatusVariant(order.status)}>
                            {order.status?.replace(/[-_]/g, ' ')}
                          </Badge>
                          <p className="text-lg font-bold text-foreground mt-2">
                            ${(order.total_cents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {!order.is_pickup && order.delivery_address_line1 && (
                        <div className="text-sm text-muted-foreground mb-3 flex items-start gap-2 p-3 bg-muted rounded-lg">
                          <Truck className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <div>
                            <span className="font-medium">Delivery: </span>
                            {order.delivery_address_line1}, {order.delivery_city}
                          </div>
                        </div>
                      )}

                      {order.order_items && order.order_items.length > 0 && (
                        <div className="mb-4 text-sm text-muted-foreground">
                          <span className="font-medium">{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={() => setOrderDetailId(order.id === orderDetailId ? null : order.id)}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {orderDetailId === order.id ? 'Hide Details' : 'View Details'}
                        </Button>
                        {(order.status === 'pending' || order.status === 'processing') && (
                          <Button
                            onClick={() => setCancellingOrderId(order.id)}
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Order
                          </Button>
                        )}
                      </div>

                      {orderDetailId === order.id && order.order_items && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="text-sm font-medium text-foreground mb-3">Order Items</h4>
                          <div className="space-y-2">
                            {order.order_items.map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                <div>
                                  <span className="font-medium text-foreground">{item.medication_name || item.product_name || 'Item'}</span>
                                  {item.quantity && <span className="text-muted-foreground ml-2">x{item.quantity}</span>}
                                </div>
                                {item.unit_price_cents && (
                                  <span className="font-medium text-foreground">
                                    ${(item.unit_price_cents * (item.quantity || 1) / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border space-y-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Subtotal</span>
                              <span>${(order.subtotal_cents / 100).toFixed(2)}</span>
                            </div>
                            {order.delivery_fee_cents > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Delivery Fee</span>
                                <span>${(order.delivery_fee_cents / 100).toFixed(2)}</span>
                              </div>
                            )}
                            {order.tax_cents > 0 && (
                              <div className="flex justify-between text-muted-foreground">
                                <span>Tax</span>
                                <span>${(order.tax_cents / 100).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-foreground pt-1">
                              <span>Total</span>
                              <span>${(order.total_cents / 100).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Dialog open={!!selectedPharmacy} onOpenChange={(open) => { if (!open) { setSelectedPharmacy(null); setPharmacyInventory([]); setInventorySearch(''); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedPharmacy?.pharmacy_name}</DialogTitle>
            <p className="text-sm text-muted-foreground">Browse available medications</p>
          </DialogHeader>

          <div className="border-t border-border pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search medications..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInventorySearch()}
                  className="pl-9 text-sm"
                />
              </div>
              <Button
                onClick={handleInventorySearch}
                size="sm"
              >
                Search
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pt-4">
            {inventoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : pharmacyInventory.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No medications found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pharmacyInventory.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{item.medication_name}</h4>
                        {item.generic_name && (
                          <p className="text-sm text-muted-foreground">Generic: {item.generic_name}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {item.strength && <span>{item.strength}</span>}
                          <span className="capitalize">{item.form}</span>
                          {item.din_number && <span>DIN: {item.din_number}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${(item.unit_price_cents / 100).toFixed(2)}</p>
                        <p className={`text-xs mt-1 ${item.stock_quantity > item.reorder_level ? 'text-green-600' : 'text-orange-600'}`}>
                          {item.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </p>
                        {item.requires_prescription && (
                          <span className="text-xs text-blue-600 font-medium">Rx Required</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sendToPharmacyModal && !!selectedPrescription} onOpenChange={(open) => { if (!open) { setSendToPharmacyModal(false); setSelectedPrescription(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a Pharmacy</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Send prescription #{selectedPrescription?.prescription_number} to a pharmacy
            </p>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {pharmacies.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No pharmacies available</p>
            ) : (
              pharmacies.map((pharmacy) => (
                <button
                  key={pharmacy.id}
                  onClick={() => handleSendPrescription(selectedPrescription.id, pharmacy.id)}
                  disabled={actionLoading}
                  className="w-full text-left border rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{pharmacy.pharmacy_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {pharmacy.address_line1}, {pharmacy.city}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancellingOrderId} onOpenChange={(open) => { if (!open) setCancellingOrderId(null); }}>
        <DialogContent className="max-w-sm">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <DialogHeader className="items-center">
              <DialogTitle>Cancel Order?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground text-sm mb-6 mt-2">
              This action cannot be undone. Are you sure you want to cancel this order?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setCancellingOrderId(null)}
                variant="outline"
                className="flex-1"
              >
                Keep Order
              </Button>
              <Button
                onClick={() => cancellingOrderId && handleCancelOrder(cancellingOrderId)}
                disabled={actionLoading}
                variant="destructive"
                className="flex-1 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Cancel Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
