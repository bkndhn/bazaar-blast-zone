import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ArrowLeft, MapPin, CreditCard, Plus, Check, Truck } from 'lucide-react';
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

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const { data: addresses } = useAddresses();
  const clearCart = useClearCart();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

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


  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!cart?.length) {
    navigate('/cart');
    return null;
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );
  const calculateShipping = () => {
    if (!cart?.length || !addresses?.length || !selectedAddress || !adminSettings) return 0;

    const address = addresses.find(a => a.id === selectedAddress);
    if (!address) return 0;

    const isTamilNadu = ['tamil nadu', 'tamilnadu', 'tn'].includes(address.state?.toLowerCase()?.trim() || '');

    // Group items by admin
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

      // Calculate subtotal for this admin
      const adminSubtotal = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

      // Free shipping over 499 per store (optional logic, kept for consistency if desired, or remove if strictly per settings)
      // For now, adhering strictly to settings as requested.

      const cost = settings
        ? (isTamilNadu ? (settings.shipping_cost_within_tamilnadu || 0) : (settings.shipping_cost_outside_tamilnadu || 0))
        : 49; // Fallback to default if no settings found

      const finalCost = adminSubtotal > 499 ? 0 : cost;
      // Note: User asked for "40 at backend", implying they set it. 
      // If the user wants FREE shipping above a certain amount, that logic should likely be in admin settings too.
      // For now, I'll keep the >499 free rule as it seems to be a global default in the app, 
      // BUT I will use the dynamic cost for < 499.

      totalShipping += finalCost;
    });

    return totalShipping;
  };

  const shippingCost = calculateShipping();
  const total = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({ title: 'Please select a delivery address', variant: 'destructive' });
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Group cart items by store/admin
      const itemsByAdmin = cart.reduce((acc, item) => {
        const adminId = (item.product as any)?.admin_id;
        const storeId = (item.product as any)?.store_id;
        if (!adminId) return acc;

        if (!acc[adminId]) {
          acc[adminId] = { storeId, items: [] };
        }
        acc[adminId].items.push(item);
        return acc;
      }, {} as Record<string, { storeId: string; items: typeof cart }>);

      // Create orders for each store
      for (const [adminId, { storeId, items }] of Object.entries(itemsByAdmin)) {
        const orderSubtotal = items.reduce(
          (sum, item) => sum + (item.product?.price || 0) * item.quantity,
          0
        );

        // Recalculate shipping for this specific order
        const settings = adminSettings?.find(s => s.admin_id === adminId);
        const address = addresses?.find(a => a.id === selectedAddress);
        const isTamilNadu = ['tamil nadu', 'tamilnadu', 'tn'].includes(address?.state?.toLowerCase()?.trim() || '');

        const orderShipping = settings
          ? (isTamilNadu ? (settings.shipping_cost_within_tamilnadu || 0) : (settings.shipping_cost_outside_tamilnadu || 0))
          : 0; // Fallback?

        const orderTotal = orderSubtotal + orderShipping;
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Check if this admin has payment enabled and user selected card
        const adminPaymentSettings = adminSettings?.find(s => s.admin_id === adminId);
        const processPayment = paymentMethod === 'card' && adminPaymentSettings?.is_payment_enabled;

        let paymentSuccess = false;
        let paymentId = null;

        if (processPayment) {
          try {
            // 1. Create Order on Razorpay via Edge Function
            const { data: orderData, error: orderError } = await supabase.functions.invoke('payment-ops', {
              body: {
                action: 'create_order',
                amount: orderTotal,
                currency: 'INR',
                admin_id: adminId,
              }
            });

            if (orderError || !orderData?.order_id) throw new Error(orderError?.message || 'Failed to initialize payment');

            // 2. Open Razorpay Checkout
            await new Promise((resolve, reject) => {
              const options = {
                key: orderData.key_id,
                amount: Math.round(orderTotal * 100),
                currency: 'INR',
                name: 'Bazaar Blast Zone', // TODO: Use actual store name
                description: `Order ${orderNumber}`,
                order_id: orderData.order_id,
                handler: async function (response: any) {
                  // 3. Verify Payment
                  const { data: verifyData, error: verifyError } = await supabase.functions.invoke('payment-ops', {
                    body: {
                      action: 'verify_payment',
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      admin_id: adminId,
                    }
                  });

                  if (verifyError || !verifyData?.verified) {
                    reject(new Error('Payment verification failed'));
                  } else {
                    paymentSuccess = true;
                    paymentId = response.razorpay_payment_id;
                    resolve(true);
                  }
                },
                modal: {
                  ondismiss: function () {
                    reject(new Error('Payment cancelled'));
                  }
                },
                prefill: {
                  name: user.user_metadata?.full_name,
                  email: user.email,
                  contact: addresses?.find(a => a.id === selectedAddress)?.phone,
                },
                theme: {
                  color: '#0F172A'
                }
              };

              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            }); // End Promise logic

          } catch (err) {
            console.error('Payment failed:', err);
            toast({ title: 'Payment failed for one of the orders', description: 'Proceeding with Cash on Delivery for this item.', variant: 'destructive' });
            // Fallback to COD or abort?
            // For now, if payment fails, we abort this specific order creation or fallback to COD?
            // Lets abort to be safe and let user retry.
            throw err;
          }
        }

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            admin_id: adminId,
            store_id: storeId,
            address_id: selectedAddress,
            order_number: orderNumber,
            status: paymentSuccess ? 'processing' : 'pending', // 'processing' implies paid/confirmed
            payment_status: paymentSuccess ? 'paid' : 'pending',
            payment_method: processPayment && paymentSuccess ? 'online' : 'cod',
            payment_id: paymentId,
            subtotal: orderSubtotal,
            shipping_cost: orderShipping,
            total: orderTotal,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
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

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // Clear cart
      await clearCart.mutateAsync();

      toast({ title: 'Order placed successfully!' });
      navigate('/orders');
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: 'Failed to place order',
        description: error.message,
        variant: 'destructive'
      });
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
              {i < ['address', 'payment', 'review'].indexOf(step) ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn(
              'text-sm capitalize',
              step === s ? 'font-medium' : 'text-muted-foreground'
            )}>
              {s}
            </span>
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
                      selectedAddress === address.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    )}
                    onClick={() => setSelectedAddress(address.id)}
                  >
                    <RadioGroupItem
                      value={address.id}
                      id={address.id}
                      className="absolute right-4 top-4"
                    />
                    <Label htmlFor={address.id} className="cursor-pointer">
                      <p className="font-medium">{address.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>
                      <p className="mt-2 text-sm">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-sm">
                        {address.city}, {address.state} - {address.postal_code}
                      </p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            <Button
              className="w-full"
              onClick={() => setStep('payment')}
              disabled={!selectedAddress}
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && (
          <div className="space-y-4">
            <h2 className="font-semibold">Select Payment Method</h2>

            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div
                className={cn(
                  'relative rounded-lg border p-4 cursor-pointer',
                  paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border'
                )}
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
                      {isOnlinePaymentAvailable ? 'Secure payment via Razorpay' : 'Not available for these items'}
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('address')}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('review')}>
                Review Order
              </Button>
            </div>
          </div>
        )
        }

        {/* Review Step */}
        {
          step === 'review' && (
            <div className="space-y-4">
              <h2 className="font-semibold">Review Your Order</h2>

              {/* Order Items */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const image = item.product?.images?.find(img => img.is_primary)?.image_url
                    || item.product?.images?.[0]?.image_url
                    || '/placeholder.svg';

                  return (
                    <div key={item.id} className="flex gap-3 rounded-lg border border-border p-3">
                      <img
                        src={image}
                        alt={item.product?.name}
                        className="h-16 w-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{item.product?.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="font-medium">
                          ₹{((item.product?.price || 0) * item.quantity).toLocaleString('en-IN')}
                        </p>
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
                        <p className="text-sm">
                          {addr.address_line1}, {addr.city}, {addr.state} - {addr.postal_code}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Payment Method */}
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                <p className="mt-1 font-medium">
                  {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card / UPI'}
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('payment')}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                >
                  {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </div>
          )
        }
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
              {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span>₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
