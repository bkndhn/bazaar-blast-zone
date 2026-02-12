import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ArrowLeft, MapPin, CreditCard, Plus, Check, Truck, ShoppingBag, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart, useClearCart } from '@/hooks/useCart';
import { useAddresses } from '@/hooks/useAddresses';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type CheckoutStep = 'address' | 'payment' | 'review';

// Tamil Nadu pincode ranges: 600xxx - 643xxx
const isTamilNaduPincode = (pincode: string) => {
  const pin = parseInt(pincode);
  return pin >= 600000 && pin <= 643999;
};

const isTamilNaduState = (state: string) => {
  return ['tamil nadu', 'tamilnadu', 'tn'].includes(state?.toLowerCase()?.trim() || '');
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const { data: addresses } = useAddresses();
  const clearCart = useClearCart();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('delivery');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [serviceAreaError, setServiceAreaError] = useState<string | null>(null);

  // Set default address if available
  useState(() => {
    const defaultAddr = addresses?.find(a => a.is_default);
    if (defaultAddr) setSelectedAddress(defaultAddr.id);
  });

  // Fetch admin settings for payment configuration
  const { data: adminSettings } = useQuery({
    queryKey: ['checkout-admin-settings', cart?.map(i => (i.product as any)?.admin_id).join(',')],
    queryFn: async () => {
      if (!cart?.length) return [];
      const adminIds = [...new Set(cart.map(item => (item.product as any)?.admin_id).filter(Boolean))];
      if (!adminIds.length) return [];

      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('admin_id', adminIds);

      if (error) throw error;
      return data;
    },
    enabled: !!cart?.length,
  });

  const isOnlinePaymentAvailable = adminSettings?.some(s => s.is_payment_enabled);
  const isPhonePeAvailable = adminSettings?.some(s => (s as any).phonepe_enabled && (s as any).phonepe_merchant_id);
  const isRazorpayAvailable = adminSettings?.some(s => s.razorpay_key_id && s.razorpay_key_secret);
  const isSelfPickupAvailable = adminSettings?.some(s => (s as any).self_pickup_enabled);

  // Service area check
  const checkServiceArea = () => {
    if (!adminSettings?.length || !addresses?.length || !selectedAddress) return;
    const hasServiceArea = adminSettings.some(s => (s as any).service_area_enabled);
    if (!hasServiceArea) { setServiceAreaError(null); return; }

    const address = addresses.find(a => a.id === selectedAddress);
    if (!address || !(address as any).location_link) { setServiceAreaError(null); return; }

    for (const settings of adminSettings) {
      if (!(settings as any).service_area_enabled) continue;
      const lat = (settings as any).service_area_lat;
      const lng = (settings as any).service_area_lng;
      const radius = (settings as any).service_area_radius_km;
      if (!lat || !lng || !radius) continue;

      const locationLink = (address as any).location_link || '';
      const coordMatch = locationLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (!coordMatch) continue;

      const userLat = parseFloat(coordMatch[1]);
      const userLng = parseFloat(coordMatch[2]);

      const R = 6371;
      const dLat = (userLat - lat) * Math.PI / 180;
      const dLon = (userLng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > radius) {
        setServiceAreaError(`We are not available in your area yet. We currently serve within ${radius}km. Your location is approximately ${Math.round(distance)}km away.`);
        return;
      }
    }
    setServiceAreaError(null);
  };

  if (!user) { navigate('/auth'); return null; }
  if (!cart?.length) { navigate('/cart'); return null; }

  const subtotal = cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  
  const selectedAddr = addresses?.find(a => a.id === selectedAddress);
  const isTN = selectedAddr 
    ? (isTamilNaduState(selectedAddr.state) || isTamilNaduPincode(selectedAddr.postal_code))
    : false;

  const calculateShipping = () => {
    if (!cart?.length || !selectedAddress || !adminSettings) return 0;

    const itemsByAdmin = cart.reduce((acc, item) => {
      const adminId = (item.product as any)?.admin_id;
      if (!adminId) return acc;
      if (!acc[adminId]) acc[adminId] = [];
      acc[adminId].push(item);
      return acc;
    }, {} as Record<string, typeof cart>);

    let totalShipping = 0;

    Object.entries(itemsByAdmin).forEach(([adminId, items]) => {
      const settings = adminSettings.find(s => s.admin_id === adminId);
      const adminSubtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

      const shippingCost = settings
        ? (isTN ? (settings.shipping_cost_within_tamilnadu || 0) : (settings.shipping_cost_outside_tamilnadu || 0))
        : 49;

      // Check free delivery threshold from admin settings
      const freeAbove = (settings as any)?.free_delivery_above || 0;
      const isFreeDelivery = freeAbove > 0 && adminSubtotal >= freeAbove;

      totalShipping += isFreeDelivery ? 0 : shippingCost;
    });

    return totalShipping;
  };

  const shippingCost = deliveryMethod === 'self_pickup' ? 0 : calculateShipping();
  
  const extraCharges = adminSettings?.reduce((total, s) => {
    return total + ((s as any).cutting_charges || 0) + ((s as any).extra_delivery_charges || 0);
  }, 0) || 0;
  const foodExtraCharges = adminSettings?.some(s => (s as any).shop_type === 'food') ? extraCharges : 0;
  
  const total = subtotal + shippingCost + foodExtraCharges;

  // Estimated delivery calculation
  const getEstimatedDelivery = () => {
    if (!adminSettings?.length) return null;
    const days = adminSettings.reduce((max, s) => {
      const d = isTN 
        ? (s.delivery_within_tamilnadu_days || 3)
        : (s.delivery_outside_tamilnadu_days || 7);
      return Math.max(max, d);
    }, 0);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return { days, date };
  };

  const estimatedDelivery = deliveryMethod === 'self_pickup' ? null : getEstimatedDelivery();

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({ title: 'Please select a delivery address', variant: 'destructive' });
      return;
    }

    setIsPlacingOrder(true);
    try {
      const itemsByAdmin = cart.reduce((acc, item) => {
        const adminId = (item.product as any)?.admin_id;
        const storeId = (item.product as any)?.store_id;
        if (!adminId) return acc;
        if (!acc[adminId]) acc[adminId] = { storeId, items: [] };
        acc[adminId].items.push(item);
        return acc;
      }, {} as Record<string, { storeId: string; items: typeof cart }>);

      for (const [adminId, { storeId, items }] of Object.entries(itemsByAdmin)) {
        const orderSubtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

        const settings = adminSettings?.find(s => s.admin_id === adminId);

        const baseCost = settings
          ? (isTN ? (settings.shipping_cost_within_tamilnadu || 0) : (settings.shipping_cost_outside_tamilnadu || 0))
          : 0;
        
        const freeAbove = (settings as any)?.free_delivery_above || 0;
        const isFreeDelivery = freeAbove > 0 && orderSubtotal >= freeAbove;
        const orderShipping = deliveryMethod === 'self_pickup' ? 0 : (isFreeDelivery ? 0 : baseCost);

        const adminExtraCharges = (settings as any)?.shop_type === 'food'
          ? ((settings as any)?.cutting_charges || 0) + ((settings as any)?.extra_delivery_charges || 0)
          : 0;

        const orderTotal = orderSubtotal + orderShipping + adminExtraCharges;
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Estimated delivery date
        const deliveryDays = isTN
          ? (settings?.delivery_within_tamilnadu_days || 3)
          : (settings?.delivery_outside_tamilnadu_days || 7);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + deliveryDays);

        const adminPaymentSettings = adminSettings?.find(s => s.admin_id === adminId);
        const processPayment = paymentMethod === 'card' && adminPaymentSettings?.is_payment_enabled;
        const usePhonePe = processPayment && (adminPaymentSettings as any)?.phonepe_enabled && (adminPaymentSettings as any)?.phonepe_merchant_id;
        const useRazorpay = processPayment && !usePhonePe && adminPaymentSettings?.razorpay_key_id;

        let paymentSuccess = false;
        let paymentId = null;

        if (usePhonePe) {
          try {
            const callbackUrl = `${window.location.origin}/orders`;
            const { data: phonePeData, error: phonePeError } = await supabase.functions.invoke('payment-ops', {
              body: {
                action: 'phonepe_initiate',
                amount: orderTotal,
                admin_id: adminId,
                order_number: orderNumber,
                callback_url: callbackUrl,
              }
            });

            if (phonePeError || !phonePeData?.redirect_url) {
              throw new Error(phonePeError?.message || 'Failed to initiate PhonePe payment');
            }

            localStorage.setItem('phonepe_txn', JSON.stringify({
              merchant_transaction_id: phonePeData.merchant_transaction_id,
              admin_id: adminId,
              order_number: orderNumber,
              order_total: orderTotal,
              order_subtotal: orderSubtotal,
              order_shipping: orderShipping,
              store_id: storeId,
              address_id: selectedAddress,
              items: items.map(item => ({
                product_id: item.product_id,
                admin_id: adminId,
                product_name: item.product?.name || 'Unknown Product',
                product_image: item.product?.images?.[0]?.image_url || null,
                quantity: item.quantity,
                unit_price: item.product?.price || 0,
                total_price: (item.product?.price || 0) * item.quantity,
              })),
            }));

            window.location.href = phonePeData.redirect_url;
            return;
          } catch (err) {
            console.error('PhonePe payment failed:', err);
            toast({ title: 'PhonePe payment failed', description: (err as Error).message, variant: 'destructive' });
            throw err;
          }
        } else if (useRazorpay) {
          try {
            const { data: orderData, error: orderError } = await supabase.functions.invoke('payment-ops', {
              body: { action: 'create_order', amount: orderTotal, currency: 'INR', admin_id: adminId }
            });

            if (orderError || !orderData?.order_id) throw new Error(orderError?.message || 'Failed to initialize payment');

            await new Promise((resolve, reject) => {
              const options = {
                key: orderData.key_id,
                amount: Math.round(orderTotal * 100),
                currency: 'INR',
                name: 'Bazaar Blast Zone',
                description: `Order ${orderNumber}`,
                order_id: orderData.order_id,
                handler: async function (response: any) {
                  const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-ops', {
                    body: {
                      action: 'verify_payment',
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      admin_id: adminId,
                    }
                  });
                  if (verifyError || !verifyData?.verified) reject(new Error('Payment verification failed'));
                  else { paymentSuccess = true; paymentId = response.razorpay_payment_id; resolve(true); }
                },
                modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
                prefill: {
                  name: user.user_metadata?.full_name,
                  email: user.email,
                  contact: addresses?.find(a => a.id === selectedAddress)?.phone,
                },
                theme: { color: '#0F172A' }
              };
              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            });
          } catch (err) {
            console.error('Payment failed:', err);
            toast({ title: 'Payment failed', description: (err as Error).message, variant: 'destructive' });
            throw err;
          }
        }

        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            admin_id: adminId,
            store_id: storeId,
            address_id: selectedAddress,
            order_number: orderNumber,
            status: paymentSuccess ? 'processing' : 'pending',
            payment_status: paymentSuccess ? 'paid' : 'pending',
            payment_method: deliveryMethod === 'self_pickup' ? 'self_pickup' : (processPayment && paymentSuccess ? 'online' : 'cod'),
            payment_id: paymentId,
            subtotal: orderSubtotal,
            shipping_cost: orderShipping,
            total: orderTotal,
            estimated_delivery_date: estDate.toISOString().split('T')[0],
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.product_id,
          admin_id: adminId,
          product_name: item.product?.name || 'Unknown Product',
          product_image: item.product?.images?.[0]?.image_url || null,
          quantity: item.quantity,
          unit_price: item.product?.price || 0,
          total_price: (item.product?.price || 0) * item.quantity,
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) throw itemsError;
      }

      await clearCart.mutateAsync();
      toast({ title: 'Order placed successfully!' });
      navigate('/orders');
    } catch (error: any) {
      console.error('Order error:', error);
      toast({ title: 'Failed to place order', description: error.message, variant: 'destructive' });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-nav-height items-center gap-3 border-b border-border bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Checkout</h1>
      </header>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 border-b border-border bg-card px-4 py-3">
        {(['address', 'payment', 'review'] as CheckoutStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
              step === s
                ? 'bg-primary text-primary-foreground'
                : i < ['address', 'payment', 'review'].indexOf(step)
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground'
            )}>
              {i < ['address', 'payment', 'review'].indexOf(step) ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('text-sm capitalize', step === s ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
            {i < 2 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      <div className="p-4">
        {/* Address Step */}
        {step === 'address' && (
          <div className="space-y-4">
            <h2 className="font-semibold">Select Delivery Address</h2>

            {!addresses?.length ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No saved addresses</p>
                <Button asChild className="mt-4">
                  <Link to="/addresses">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Address
                  </Link>
                </Button>
              </div>
            ) : (
              <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={cn(
                      'relative rounded-lg border p-4 cursor-pointer transition-colors',
                      selectedAddress === address.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedAddress(address.id)}
                  >
                    <RadioGroupItem value={address.id} id={address.id} className="absolute right-4 top-4" />
                    <Label htmlFor={address.id} className="cursor-pointer">
                      <p className="font-medium">{address.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>
                      <p className="mt-2 text-sm">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-sm">{address.city}, {address.state} - {address.postal_code}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {serviceAreaError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Service Area Unavailable</p>
                    <p className="text-sm text-muted-foreground mt-1">{serviceAreaError}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => { checkServiceArea(); if (!serviceAreaError) setStep('payment'); }}
              disabled={!selectedAddress || !!serviceAreaError}
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && (
          <div className="space-y-4">
            {isSelfPickupAvailable && (
              <>
                <h2 className="font-semibold">Delivery Method</h2>
                <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
                  <div
                    className={cn('relative rounded-lg border p-4 cursor-pointer', deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-border')}
                    onClick={() => setDeliveryMethod('delivery')}
                  >
                    <RadioGroupItem value="delivery" id="delivery_method" className="absolute right-4 top-4" />
                    <Label htmlFor="delivery_method" className="flex cursor-pointer items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Home Delivery</p>
                        <p className="text-sm text-muted-foreground">Delivered to your address</p>
                      </div>
                    </Label>
                  </div>
                  <div
                    className={cn('relative rounded-lg border p-4 cursor-pointer', deliveryMethod === 'self_pickup' ? 'border-primary bg-primary/5' : 'border-border')}
                    onClick={() => setDeliveryMethod('self_pickup')}
                  >
                    <RadioGroupItem value="self_pickup" id="self_pickup_method" className="absolute right-4 top-4" />
                    <Label htmlFor="self_pickup_method" className="flex cursor-pointer items-center gap-3">
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Self Pickup</p>
                        <p className="text-sm text-muted-foreground">Pick up from store • No delivery charges</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </>
            )}

            <h2 className="font-semibold">Select Payment Method</h2>

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div
                className={cn('relative rounded-lg border p-4 cursor-pointer', paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border')}
                onClick={() => setPaymentMethod('cod')}
              >
                <RadioGroupItem value="cod" id="cod" className="absolute right-4 top-4" />
                <Label htmlFor="cod" className="flex cursor-pointer items-center gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-muted-foreground">Pay when you receive</p>
                  </div>
                </Label>
              </div>

              <div
                className={cn(
                  'relative rounded-lg border p-4 cursor-pointer',
                  paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-border',
                  !isOnlinePaymentAvailable && 'opacity-50 cursor-not-allowed hidden'
                )}
                onClick={() => isOnlinePaymentAvailable && setPaymentMethod('card')}
              >
                <RadioGroupItem value="card" id="card" className="absolute right-4 top-4" disabled={!isOnlinePaymentAvailable} />
                <Label htmlFor="card" className="flex cursor-pointer items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Online Payment (UPI / Card)</p>
                    <p className="text-sm text-muted-foreground">
                      {isOnlinePaymentAvailable
                        ? isPhonePeAvailable ? 'Secure payment via PhonePe' : 'Secure payment via Razorpay'
                        : 'Not available for these items'}
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('address')}>Back</Button>
              <Button className="flex-1" onClick={() => setStep('review')}>Review Order</Button>
            </div>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-4">
            <h2 className="font-semibold">Review Your Order</h2>

            <div className="space-y-3">
              {cart.map((item) => {
                const image = item.product?.images?.find(img => img.is_primary)?.image_url
                  || item.product?.images?.[0]?.image_url
                  || '/placeholder.svg';
                return (
                  <div key={item.id} className="flex gap-3 rounded-lg border border-border p-3">
                    <img src={image} alt={item.product?.name} className="h-16 w-16 rounded object-cover" />
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.product?.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      <p className="font-medium">₹{((item.product?.price || 0) * item.quantity).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delivery Address */}
            {selectedAddress && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground">Delivering to</p>
                {(() => {
                  const addr = addresses?.find(a => a.id === selectedAddress);
                  if (!addr) return null;
                  return (
                    <div className="mt-2">
                      <p className="font-medium">{addr.full_name}</p>
                      <p className="text-sm">{addr.address_line1}, {addr.city}, {addr.state} - {addr.postal_code}</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Estimated Delivery */}
            {estimatedDelivery && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-primary">
                    Estimated Delivery: {estimatedDelivery.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isTN ? 'Within Tamil Nadu' : 'Outside Tamil Nadu'} • ~{estimatedDelivery.days} business days
                </p>
              </div>
            )}

            {/* Delivery & Payment Method */}
            <div className="rounded-lg border border-border p-4 space-y-2">
              {deliveryMethod === 'self_pickup' && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Method</p>
                  <p className="mt-1 font-medium text-emerald-600">🏪 Self Pickup</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="mt-1 font-medium">{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card / UPI'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('payment')}>Back</Button>
              <Button className="flex-1" onClick={handlePlaceOrder} disabled={isPlacingOrder}>
                {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className={shippingCost === 0 ? 'text-success' : ''}>
              {deliveryMethod === 'self_pickup' ? 'Self Pickup' : shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
            </span>
          </div>
          {foodExtraCharges > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Charges</span>
              <span>₹{foodExtraCharges}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span>₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
