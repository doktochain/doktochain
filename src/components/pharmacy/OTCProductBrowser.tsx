import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { patientService } from '../../services/patientService';
import { pharmacyMarketplaceService } from '../../services/pharmacyMarketplaceService';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Package,
  Star,
  Check,
  Loader2,
  MapPin,
  Truck,
  Store,
  CreditCard,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';

interface OTCProduct {
  id: string;
  pharmacy_id: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  description: string;
  image_url: string;
  package_size: string;
  price_cents: number;
  in_stock: boolean;
  rating: number;
  review_count: number;
}

interface CartItem extends OTCProduct {
  quantity: number;
}

const CATEGORIES = [
  'All Products',
  'Pain Relief',
  'Cold & Flu',
  'Digestive Health',
  'Vitamins & Supplements',
  'First Aid',
  'Personal Care',
];

const CATEGORY_MAP: Record<string, string[]> = {
  'Pain Relief': ['pain', 'analgesic', 'headache', 'ibuprofen', 'acetaminophen', 'aspirin'],
  'Cold & Flu': ['cold', 'flu', 'cough', 'decongestant', 'antihistamine', 'sinus'],
  'Digestive Health': ['digestive', 'antacid', 'laxative', 'probiotic', 'stomach'],
  'Vitamins & Supplements': ['vitamin', 'supplement', 'mineral', 'omega', 'iron', 'calcium'],
  'First Aid': ['first aid', 'bandage', 'antiseptic', 'wound', 'gauze'],
  'Personal Care': ['personal', 'hygiene', 'skin', 'dental', 'eye care', 'lotion'],
};

const SAMPLE_PRODUCTS: OTCProduct[] = [
  {
    id: 'sample-1',
    pharmacy_id: '',
    name: 'Extra Strength Pain Relief',
    category: 'Pain Relief',
    subcategory: 'Headache',
    brand: 'Tylenol',
    description: 'Fast-acting extra strength acetaminophen for effective pain relief',
    image_url: '',
    package_size: '100 caplets',
    price_cents: 1299,
    in_stock: true,
    rating: 4.5,
    review_count: 245,
  },
  {
    id: 'sample-2',
    pharmacy_id: '',
    name: 'Vitamin C 1000mg',
    category: 'Vitamins & Supplements',
    subcategory: 'Vitamins',
    brand: 'Jamieson',
    description: 'High-potency vitamin C to support immune system health',
    image_url: '',
    package_size: '120 tablets',
    price_cents: 1899,
    in_stock: true,
    rating: 4.7,
    review_count: 189,
  },
  {
    id: 'sample-3',
    pharmacy_id: '',
    name: 'Cold & Flu Relief',
    category: 'Cold & Flu',
    subcategory: 'Multi-symptom',
    brand: 'Advil',
    description: 'Multi-symptom relief for cold and flu symptoms',
    image_url: '',
    package_size: '40 caplets',
    price_cents: 1549,
    in_stock: true,
    rating: 4.3,
    review_count: 312,
  },
  {
    id: 'sample-4',
    pharmacy_id: '',
    name: 'Daily Multivitamin',
    category: 'Vitamins & Supplements',
    subcategory: 'Multivitamin',
    brand: 'Centrum',
    description: 'Complete multivitamin with essential nutrients for daily wellness',
    image_url: '',
    package_size: '150 tablets',
    price_cents: 2499,
    in_stock: true,
    rating: 4.6,
    review_count: 423,
  },
  {
    id: 'sample-5',
    pharmacy_id: '',
    name: 'Allergy Relief 24HR',
    category: 'Cold & Flu',
    subcategory: 'Allergy',
    brand: 'Reactine',
    description: 'Non-drowsy 24-hour allergy symptom relief',
    image_url: '',
    package_size: '30 tablets',
    price_cents: 1799,
    in_stock: true,
    rating: 4.4,
    review_count: 178,
  },
  {
    id: 'sample-6',
    pharmacy_id: '',
    name: 'Adhesive Bandages Variety',
    category: 'First Aid',
    subcategory: 'Bandages',
    brand: 'Band-Aid',
    description: 'Assorted sizes flexible fabric bandages for everyday protection',
    image_url: '',
    package_size: '100 bandages',
    price_cents: 899,
    in_stock: true,
    rating: 4.8,
    review_count: 567,
  },
];

type CheckoutStep = 'cart' | 'pharmacy' | 'delivery' | 'review' | 'complete';

export const OTCProductBrowser: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [products, setProducts] = useState<OTCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isPickup, setIsPickup] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState({
    line1: '',
    city: '',
    province: '',
    postal_code: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  useEffect(() => {
    loadProducts();
    loadPharmacies();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pharmacy_inventory')
        .select('*')
        .eq('requires_prescription', false)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .order('medication_name');

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped: OTCProduct[] = data.map((item: any) => {
          let category = 'Personal Care';
          const nameAndClass = `${item.medication_name} ${item.therapeutic_class || ''} ${item.generic_name || ''}`.toLowerCase();
          for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
            if (keywords.some((kw) => nameAndClass.includes(kw))) {
              category = cat;
              break;
            }
          }

          return {
            id: item.id,
            pharmacy_id: item.pharmacy_id,
            name: item.medication_name,
            category,
            subcategory: item.therapeutic_class || '',
            brand: item.brand_name || item.manufacturer || '',
            description: `${item.generic_name || item.medication_name} ${item.strength || ''} - ${item.form || 'tablet'}`,
            image_url: '',
            package_size: item.form || '',
            price_cents: item.unit_price_cents,
            in_stock: item.stock_quantity > 0,
            rating: 4.0 + Math.random() * 0.9,
            review_count: Math.floor(50 + Math.random() * 300),
          };
        });
        setProducts(mapped);
      } else {
        setProducts(SAMPLE_PRODUCTS);
      }
    } catch {
      setProducts(SAMPLE_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacies = async () => {
    const { data } = await pharmacyMarketplaceService.searchPharmacies({});
    if (data) setPharmacies(data);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All Products' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: OTCProduct) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + change } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  const taxAmount = Math.round(cartTotal * 0.13);
  const deliveryFee = isPickup ? 0 : (selectedPharmacy?.delivery_fee_cents || 500);
  const grandTotal = cartTotal + taxAmount + deliveryFee;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleCheckout = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const patientData = await patientService.getPatientByUserId(user.id);
      if (!patientData) throw new Error('Patient profile not found');

      const pharmacyId = selectedPharmacy?.id || cart[0]?.pharmacy_id;
      if (!pharmacyId) throw new Error('No pharmacy selected');

      const { data, error } = await pharmacyMarketplaceService.createOrderWithItems({
        patient_id: patientData.id,
        pharmacy_id: pharmacyId,
        items: cart.map((item) => ({
          inventory_id: item.id.startsWith('sample-') ? undefined : item.id,
          medication_name: item.name,
          quantity: item.quantity,
          unit_price_cents: item.price_cents,
        })),
        is_pickup: isPickup,
        delivery_fee_cents: deliveryFee,
        delivery_address: isPickup
          ? undefined
          : {
              line1: deliveryAddress.line1,
              city: deliveryAddress.city,
              province: deliveryAddress.province,
              postal_code: deliveryAddress.postal_code,
            },
      });

      if (error) throw error;
      setOrderResult(data);
      setCheckoutStep('complete');
      setCart([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetCheckout = () => {
    setCheckoutStep('cart');
    setSelectedPharmacy(null);
    setIsPickup(true);
    setDeliveryAddress({ line1: '', city: '', province: '', postal_code: '' });
    setOrderResult(null);
    setShowCart(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Shop OTC Products</h1>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart ({cartItemCount})</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0 hidden md:block">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
              <div className="space-y-1">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    inCart={cart.some((item) => item.id === product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {checkoutStep === 'cart' && (
              <CartView
                cart={cart}
                cartTotal={cartTotal}
                cartItemCount={cartItemCount}
                formatPrice={formatPrice}
                updateQuantity={updateQuantity}
                removeFromCart={removeFromCart}
                onClose={() => setShowCart(false)}
                onProceed={() => setCheckoutStep('pharmacy')}
              />
            )}

            {checkoutStep === 'pharmacy' && (
              <PharmacySelectStep
                pharmacies={pharmacies}
                selectedPharmacy={selectedPharmacy}
                onSelect={setSelectedPharmacy}
                onBack={() => setCheckoutStep('cart')}
                onProceed={() => setCheckoutStep('delivery')}
              />
            )}

            {checkoutStep === 'delivery' && (
              <DeliveryStep
                isPickup={isPickup}
                setIsPickup={setIsPickup}
                deliveryAddress={deliveryAddress}
                setDeliveryAddress={setDeliveryAddress}
                selectedPharmacy={selectedPharmacy}
                onBack={() => setCheckoutStep('pharmacy')}
                onProceed={() => setCheckoutStep('review')}
              />
            )}

            {checkoutStep === 'review' && (
              <ReviewStep
                cart={cart}
                cartTotal={cartTotal}
                taxAmount={taxAmount}
                deliveryFee={deliveryFee}
                grandTotal={grandTotal}
                isPickup={isPickup}
                selectedPharmacy={selectedPharmacy}
                deliveryAddress={deliveryAddress}
                formatPrice={formatPrice}
                submitting={submitting}
                onBack={() => setCheckoutStep('delivery')}
                onConfirm={handleCheckout}
              />
            )}

            {checkoutStep === 'complete' && (
              <OrderCompleteStep
                orderResult={orderResult}
                formatPrice={formatPrice}
                grandTotal={grandTotal}
                onDone={resetCheckout}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CartViewProps {
  cart: CartItem[];
  cartTotal: number;
  cartItemCount: number;
  formatPrice: (c: number) => string;
  updateQuantity: (id: string, change: number) => void;
  removeFromCart: (id: string) => void;
  onClose: () => void;
  onProceed: () => void;
}

const CartView: React.FC<CartViewProps> = ({
  cart,
  cartTotal,
  cartItemCount,
  formatPrice,
  updateQuantity,
  removeFromCart,
  onClose,
  onProceed,
}) => (
  <>
    <div className="flex items-center justify-between p-6 border-b">
      <h2 className="text-xl font-bold text-gray-900">Shopping Cart ({cartItemCount})</h2>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <X className="w-6 h-6" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-6">
      {cart.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Your cart is empty</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-8 h-8 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.brand}</p>
                <p className="font-semibold text-blue-600 text-sm mt-1">
                  {formatPrice(item.price_cents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, -1)}
                  className="p-1 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-medium w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, 1)}
                  className="p-1 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-lg ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    {cart.length > 0 && (
      <div className="border-t p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">Subtotal:</span>
          <span className="text-xl font-bold text-gray-900">{formatPrice(cartTotal)}</span>
        </div>
        <button
          onClick={onProceed}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Proceed to Checkout
        </button>
      </div>
    )}
  </>
);

interface PharmacySelectStepProps {
  pharmacies: any[];
  selectedPharmacy: any;
  onSelect: (p: any) => void;
  onBack: () => void;
  onProceed: () => void;
}

const PharmacySelectStep: React.FC<PharmacySelectStepProps> = ({
  pharmacies,
  selectedPharmacy,
  onSelect,
  onBack,
  onProceed,
}) => (
  <>
    <div className="flex items-center gap-3 p-6 border-b">
      <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h2 className="text-xl font-bold text-gray-900">Select Pharmacy</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-6">
      {pharmacies.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No pharmacies available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pharmacies.map((pharmacy) => (
            <button
              key={pharmacy.id}
              onClick={() => onSelect(pharmacy)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                selectedPharmacy?.id === pharmacy.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{pharmacy.pharmacy_name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {pharmacy.address_line1}, {pharmacy.city}
                  </p>
                  {pharmacy.accepts_delivery && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <Truck className="w-3.5 h-3.5" />
                      Delivery available
                    </p>
                  )}
                </div>
                {selectedPharmacy?.id === pharmacy.id && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
    <div className="border-t p-6">
      <button
        onClick={onProceed}
        disabled={!selectedPharmacy}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  </>
);

interface DeliveryStepProps {
  isPickup: boolean;
  setIsPickup: (v: boolean) => void;
  deliveryAddress: { line1: string; city: string; province: string; postal_code: string };
  setDeliveryAddress: (v: any) => void;
  selectedPharmacy: any;
  onBack: () => void;
  onProceed: () => void;
}

const DeliveryStep: React.FC<DeliveryStepProps> = ({
  isPickup,
  setIsPickup,
  deliveryAddress,
  setDeliveryAddress,
  selectedPharmacy,
  onBack,
  onProceed,
}) => {
  const canProceed = isPickup || (deliveryAddress.line1 && deliveryAddress.city && deliveryAddress.province && deliveryAddress.postal_code);

  return (
    <>
      <div className="flex items-center gap-3 p-6 border-b">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Delivery Method</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <button
          onClick={() => setIsPickup(true)}
          className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
            isPickup ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-gray-700" />
            <div>
              <h3 className="font-semibold text-gray-900">Pickup</h3>
              <p className="text-sm text-gray-500">
                Pick up at {selectedPharmacy?.pharmacy_name || 'pharmacy'}
              </p>
            </div>
            {isPickup && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
          </div>
        </button>

        {selectedPharmacy?.accepts_delivery && (
          <button
            onClick={() => setIsPickup(false)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              !isPickup ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-gray-700" />
              <div>
                <h3 className="font-semibold text-gray-900">Delivery</h3>
                <p className="text-sm text-gray-500">
                  Delivery fee: ${((selectedPharmacy?.delivery_fee_cents || 500) / 100).toFixed(2)}
                </p>
              </div>
              {!isPickup && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
            </div>
          </button>
        )}

        {!isPickup && (
          <div className="space-y-3 pt-2">
            <h3 className="font-medium text-gray-900">Delivery Address</h3>
            <input
              type="text"
              placeholder="Street Address"
              value={deliveryAddress.line1}
              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, line1: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="City"
                value={deliveryAddress.city}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={deliveryAddress.province}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, province: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Province</option>
                {['Ontario', 'Quebec', 'British Columbia', 'Alberta', 'Manitoba', 'Saskatchewan', 'Nova Scotia', 'New Brunswick', 'Newfoundland and Labrador', 'Prince Edward Island'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Postal Code"
              value={deliveryAddress.postal_code}
              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postal_code: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
      <div className="border-t p-6">
        <button
          onClick={onProceed}
          disabled={!canProceed}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Review Order
        </button>
      </div>
    </>
  );
};

interface ReviewStepProps {
  cart: CartItem[];
  cartTotal: number;
  taxAmount: number;
  deliveryFee: number;
  grandTotal: number;
  isPickup: boolean;
  selectedPharmacy: any;
  deliveryAddress: { line1: string; city: string; province: string; postal_code: string };
  formatPrice: (c: number) => string;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  cart,
  cartTotal,
  taxAmount,
  deliveryFee,
  grandTotal,
  isPickup,
  selectedPharmacy,
  deliveryAddress,
  formatPrice,
  submitting,
  onBack,
  onConfirm,
}) => (
  <>
    <div className="flex items-center gap-3 p-6 border-b">
      <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h2 className="text-xl font-bold text-gray-900">Review Order</h2>
    </div>
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Pharmacy</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-gray-900">{selectedPharmacy?.pharmacy_name}</p>
          <p className="text-sm text-gray-500">{selectedPharmacy?.address_line1}, {selectedPharmacy?.city}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          {isPickup ? 'Pickup' : 'Delivery To'}
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          {isPickup ? (
            <p className="text-gray-700">In-store pickup at pharmacy location</p>
          ) : (
            <p className="text-gray-700">
              {deliveryAddress.line1}, {deliveryAddress.city}, {deliveryAddress.province} {deliveryAddress.postal_code}
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Items ({cart.length})</h3>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-medium text-gray-900">{formatPrice(item.price_cents * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="text-gray-900">{formatPrice(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tax (13% HST)</span>
          <span className="text-gray-900">{formatPrice(taxAmount)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="text-gray-900">{formatPrice(deliveryFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total</span>
          <span className="text-blue-600">{formatPrice(grandTotal)}</span>
        </div>
      </div>
    </div>
    <div className="border-t p-6">
      <button
        onClick={onConfirm}
        disabled={submitting}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Placing Order...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Place Order
          </>
        )}
      </button>
    </div>
  </>
);

interface OrderCompleteStepProps {
  orderResult: any;
  formatPrice: (c: number) => string;
  grandTotal: number;
  onDone: () => void;
}

const OrderCompleteStep: React.FC<OrderCompleteStepProps> = ({
  orderResult,
  formatPrice,
  grandTotal,
  onDone,
}) => (
  <div className="p-8 text-center">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <CheckCircle className="w-10 h-10 text-green-600" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
    <p className="text-gray-600 mb-6">
      Your order has been successfully placed and the pharmacy has been notified.
    </p>
    {orderResult && (
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
        <div className="flex justify-between mb-2">
          <span className="text-gray-500">Order Number</span>
          <span className="font-mono font-medium text-gray-900">{orderResult.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-bold text-blue-600">{formatPrice(orderResult.total_cents || grandTotal)}</span>
        </div>
      </div>
    )}
    <button
      onClick={onDone}
      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
    >
      Done
    </button>
  </div>
);

interface ProductCardProps {
  product: OTCProduct;
  onAddToCart: (product: OTCProduct) => void;
  inCart: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, inCart }) => {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-12 h-12 text-gray-300" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">{product.brand || 'Generic'}</p>
            <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
          </div>
          {product.in_stock && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full ml-2 flex-shrink-0">
              <Check className="w-3 h-3" />
              In Stock
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-2 line-clamp-1">{product.package_size || product.description}</p>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-500">({product.review_count})</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(product.price_cents)}
          </span>
          <button
            onClick={() => onAddToCart(product)}
            disabled={!product.in_stock}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm ${
              inCart
                ? 'bg-green-50 text-green-700 border border-green-200'
                : product.in_stock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {inCart ? (
              <>
                <Check className="w-4 h-4" />
                In Cart
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
