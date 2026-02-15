import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveTrackingMapProps {
  orderId: string;
  deliveryAddress?: { lat: number; lng: number } | null;
}

export function LiveTrackingMap({ orderId, deliveryAddress }: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch latest tracking position
  const { data: trackingData } = useQuery({
    queryKey: ['delivery-tracking', orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from('delivery_tracking')
        .select('latitude, longitude, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 5000,
  });

  // Real-time subscription for tracking updates
  useEffect(() => {
    const channel = supabase
      .channel(`tracking-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'delivery_tracking', filter: `order_id=eq.${orderId}` },
        (payload) => {
          const newLoc = { lat: (payload.new as any).latitude, lng: (payload.new as any).longitude };
          setLastLocation(newLoc);
          updateMarker(newLoc);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] = deliveryAddress
      ? [deliveryAddress.lat, deliveryAddress.lng]
      : [13.0827, 80.2707]; // Chennai default

    const map = L.map(mapRef.current).setView(defaultCenter, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Delivery address marker
    if (deliveryAddress) {
      const homeIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: hsl(var(--primary)); color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏠</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([deliveryAddress.lat, deliveryAddress.lng], { icon: homeIcon }).addTo(map)
        .bindPopup('Delivery Address');
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [deliveryAddress]);

  // Update marker when tracking data changes
  useEffect(() => {
    if (trackingData) {
      const loc = { lat: trackingData.latitude, lng: trackingData.longitude };
      setLastLocation(loc);
      updateMarker(loc);
    }
  }, [trackingData]);

  const updateMarker = (loc: { lat: number; lng: number }) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const riderIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background: hsl(var(--success)); color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); animation: pulse 2s infinite;">🛵</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([loc.lat, loc.lng]);
    } else {
      markerRef.current = L.marker([loc.lat, loc.lng], { icon: riderIcon }).addTo(map)
        .bindPopup('Delivery Partner');
    }

    map.panTo([loc.lat, loc.lng]);
  };

  if (!lastLocation && !trackingData) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Live tracking will appear here once the delivery partner starts</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="h-64 sm:h-80 w-full" />
      {lastLocation && (
        <div className="bg-card p-2 text-xs text-muted-foreground flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span>Live tracking active</span>
        </div>
      )}
    </div>
  );
}
