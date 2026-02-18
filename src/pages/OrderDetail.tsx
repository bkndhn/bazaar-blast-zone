import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Clock, MapPin, Phone, Star, MessageSquare, ExternalLink } from 'lucide-react';
import { LiveTrackingMap } from '@/components/tracking/LiveTrackingMap';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrder } from '@/hooks/useOrders';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const GENERAL_STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const FOOD_STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: order, isLoading, refetch } = useOrder(id || '');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  // Determine which status steps to show based on admin shop type
  const orderAdminId = (order as any)?.admin_id;
  const { data: adminSettingsForOrder } = useQuery({
    queryKey: ['admin-settings-order', orderAdminId],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('shop_type')
        .eq('admin_id', orderAdminId)
        .maybeSingle();
      return data;
    },
    enabled: !!orderAdminId,
  });

  // Fetch status history
  useEffect(() => {
    if (!id) return;

    const fetchHistory = async () => {
      const { data } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      if (data) setStatusHistory(data);
    };

    fetchHistory();
  }, [id]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_status_history', filter: `order_id=eq.${id}` },
        (payload) => {
          setStatusHistory(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  const handleSubmitFeedback = async () => {
    if (!user || !order) return;

    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('order_feedback')
        .insert({
          order_id: order.id,
          user_id: user.id,
          rating,
          comment: comment || null,
        });

      if (error) throw error;
      toast({ title: 'Thank you for your feedback!' });
      setFeedbackOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-32" />
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Order Not Found</h1>
        </header>
        <div className="p-4 text-center">
          <p className="text-muted-foreground">This order could not be found.</p>
          <Button onClick={() => navigate('/orders')} className="mt-4">
            View All Orders
          </Button>
        </div>
      </div>
    );
  }

  const orderData = order as any;
  const statusSteps = (adminSettingsForOrder as any)?.shop_type === 'food' ? FOOD_STATUS_STEPS : GENERAL_STATUS_STEPS;
  const currentStatusIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Order #{order.order_number}</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), 'MMM d, yyyy • h:mm a')}
          </p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Status Tracker */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold mb-4">Order Status</h2>

          <div className="relative">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;

              return (
                <div key={step.key} className="flex items-start gap-3 pb-6 last:pb-0">
                  {/* Line */}
                  {index < statusSteps.length - 1 && (
                    <div className={cn(
                      'absolute left-3 w-0.5 h-6',
                      isCompleted ? 'bg-success' : 'bg-border'
                    )} style={{ top: `${index * 48 + 24}px` }} />
                  )}

                  {/* Icon */}
                  <div className={cn(
                    'relative z-10 flex h-6 w-6 items-center justify-center rounded-full',
                    isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                    isCurrent && 'ring-2 ring-success ring-offset-2 ring-offset-background'
                  )}>
                    <Icon className="h-3 w-3" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <p className={cn(
                      'text-sm font-medium',
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {step.label}
                    </p>
                    {isCurrent && order.status !== 'cancelled' && (
                      <p className="text-xs text-success mt-0.5">Current Status</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Estimated Delivery */}
          {orderData.estimated_delivery_date && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Estimated Delivery:</span>
                <span className="font-medium">
                  {format(new Date(orderData.estimated_delivery_date), 'EEEE, MMM d, yyyy')}
                </span>
              </div>
            </div>
          )}

        {/* Tracking Info - hide when delivered */}
          {orderData.tracking_number && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Courier: </span>
                <span className="font-medium">{orderData.courier_service || 'Standard'}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Tracking #: </span>
                <span className="font-medium">{orderData.tracking_number}</span>
              </p>
              {orderData.courier_tracking_url && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="mt-2"
                >
                  <a href={orderData.courier_tracking_url} target="_blank" rel="noopener noreferrer">
                    Track on Courier Website
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Live Tracking Map - show when out for delivery */}
        {order.status === 'out_for_delivery' && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">📍 Live Tracking</h2>
            <LiveTrackingMap
              orderId={order.id}
              deliveryAddress={(() => {
                const locLink = orderData.address?.location_link;
                if (!locLink) return null;
                const match = locLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                if (!match) return null;
                return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
              })()}
              customerName={orderData.address?.full_name}
              customerPhone={orderData.address?.phone}
            />
          </div>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (() => {
          // Filter to show only the first (oldest) occurrence of each status
          const seenStatuses = new Set<string>();
          const uniqueStatusHistory = [...statusHistory]
            .reverse() // Reverse to get oldest first
            .filter((history) => {
              if (seenStatuses.has(history.status)) return false;
              seenStatuses.add(history.status);
              return true;
            })
            .reverse(); // Reverse back to show newest first

          return (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="font-semibold mb-3">Updates</h2>
              <div className="space-y-3">
                {uniqueStatusHistory.map((history) => (
                  <div key={history.id} className="flex gap-3 text-sm">
                    <div className="w-1 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium capitalize">{history.status.replace('_', ' ')}</p>
                      {history.notes && (
                        <p className="text-muted-foreground">{history.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(history.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Order Items */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Items ({order.items?.length || 0})</h2>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex gap-3">
                <img
                  src={item.product_image || '/placeholder.svg'}
                  alt={item.product_name}
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div className="flex-1">
                  <p className="font-medium line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{item.unit_price.toLocaleString('en-IN')} × {item.quantity}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm font-medium">₹{item.total_price.toLocaleString('en-IN')}</p>
                    {order.status === 'delivered' && item.product_id && (
                      <Link
                        to={`/product/${item.product_id}`}
                        className="text-xs text-rating font-medium hover:underline"
                      >
                        ⭐ Rate & Review
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Info */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Payment Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="capitalize font-medium">
                {orderData.payment_method === 'online' ? '💳 Online' : '💵 Cash on Delivery'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Status</span>
              <span className={`capitalize font-medium ${orderData.payment_status === 'paid' ? 'text-success' : 'text-warning'}`}>
                {orderData.payment_status || 'pending'}
              </span>
            </div>
            {orderData.payment_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-xs">{orderData.payment_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address */}
        {orderData.address && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">Delivery Address</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">{orderData.address.full_name}</p>
                  <p className="text-muted-foreground">
                    {orderData.address.address_line1}
                    {orderData.address.address_line2 && `, ${orderData.address.address_line2}`}
                  </p>
                  <p className="text-muted-foreground">
                    {orderData.address.city}, {orderData.address.state} - {orderData.address.postal_code}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{orderData.address.phone}</span>
              </div>
              {orderData.address.location_link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  asChild
                >
                  <a href={orderData.address.location_link} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4" />
                    Navigate to Location
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className={order.shipping_cost === 0 ? 'text-success' : ''}>
                {order.shipping_cost === 0 ? 'FREE' : `₹${order.shipping_cost.toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border font-semibold">
              <span>Total</span>
              <span>₹{order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Feedback Button (only for delivered orders) */}
        {order.status === 'delivered' && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageSquare className="h-4 w-4" />
            Leave Feedback
          </Button>
        )}

        {/* Need Help */}
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">Need help with this order?</p>
          <Button variant="link" onClick={() => navigate('/support')}>
            Contact Support
          </Button>
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        star <= rating ? 'fill-rating text-rating' : 'text-muted-foreground'
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={submittingFeedback}>
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
