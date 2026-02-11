import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Trash2, Edit2, Check, Navigation, ExternalLink } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAddresses, useAddAddress, useUpdateAddress, useDeleteAddress, Address } from '@/hooks/useAddresses';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Addresses() {
  const { user } = useAuth();
  const { data: addresses, isLoading } = useAddresses();
  const [isOpen, setIsOpen] = useState(false);
  const [editAddress, setEditAddress] = useState<Address | null>(null);

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <MapPin className="h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">Manage your addresses</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to save delivery addresses
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <h1 className="mb-4 text-xl font-semibold">My Addresses</h1>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Addresses</h1>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditAddress(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editAddress ? 'Edit Address' : 'Add New Address'}
                </DialogTitle>
              </DialogHeader>
              <AddressForm 
                address={editAddress} 
                onSuccess={() => {
                  setIsOpen(false);
                  setEditAddress(null);
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {!addresses?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No addresses saved yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <AddressCard 
                key={address.id} 
                address={address}
                onEdit={() => {
                  setEditAddress(address);
                  setIsOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function AddressCard({ address, onEdit }: { address: Address; onEdit: () => void }) {
  const deleteAddress = useDeleteAddress();
  const updateAddress = useUpdateAddress();

  return (
    <div className={cn(
      'rounded-lg border bg-card p-4',
      address.is_default && 'border-primary'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{address.full_name}</span>
            {address.is_default && (
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{address.phone}</p>
          <p className="mt-2 text-sm">
            {address.address_line1}
            {address.address_line2 && `, ${address.address_line2}`}
          </p>
          <p className="text-sm">
            {address.city}, {address.state} - {address.postal_code}
          </p>
          {(address as any).location_link && (
            <a 
              href={(address as any).location_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <MapPin className="h-3 w-3" />
              View on Map
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={onEdit}
        >
          <Edit2 className="h-3 w-3" />
          Edit
        </Button>
        {!address.is_default && (
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1"
            onClick={() => updateAddress.mutate({ id: address.id, is_default: true })}
          >
            <Check className="h-3 w-3" />
            Set Default
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1 text-destructive hover:text-destructive"
          onClick={() => deleteAddress.mutate(address.id)}
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function AddressForm({ address, onSuccess }: { address?: Address | null; onSuccess: () => void }) {
  const addAddress = useAddAddress();
  const updateAddress = useUpdateAddress();
  const [phoneError, setPhoneError] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: address?.full_name || '',
    phone: address?.phone || '',
    address_line1: address?.address_line1 || '',
    address_line2: address?.address_line2 || '',
    city: address?.city || '',
    state: address?.state || '',
    postal_code: address?.postal_code || '',
    country: address?.country || 'India',
    is_default: address?.is_default || false,
    location_link: (address as any)?.location_link || '',
  });

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setFormData({ ...formData, phone: digits });
    if (digits.length > 0) {
      validatePhone(digits);
    } else {
      setPhoneError('');
    }
  };

  const openLocationPicker = () => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${formData.address_line1}, ${formData.city}, ${formData.state}, ${formData.postal_code}`
    )}`;
    window.open(mapsUrl, '_blank');
    toast({
      title: 'Copy Location Link',
      description: 'Find your location in Google Maps, click Share and paste the link below.',
    });
  };

  const shareLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
          setFormData({ ...formData, location_link: mapsLink });
          toast({ title: 'Location captured!', description: 'Your live location has been saved.' });
        },
        () => {
          toast({ title: 'Location access denied', description: 'Please enable location permission.', variant: 'destructive' });
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast({ title: 'Geolocation not supported', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(formData.phone)) {
      return;
    }
    
    if (address) {
      await updateAddress.mutateAsync({ id: address.id, ...formData });
    } else {
      await addAddress.mutateAsync(formData);
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (10 digits)</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="9876543210"
            className={phoneError ? 'border-destructive' : ''}
            required
          />
          {phoneError && (
            <p className="text-xs text-destructive">{phoneError}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line1">Address Line 1</Label>
        <Input
          id="address_line1"
          value={formData.address_line1}
          onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
          placeholder="House/Flat No., Building, Street"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
        <Input
          id="address_line2"
          value={formData.address_line2}
          onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
          placeholder="Landmark, Area"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Delivery Location</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={shareLiveLocation}
            >
              <Navigation className="h-3 w-3" />
              Share Live Location
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={openLocationPicker}
            >
              <MapPin className="h-3 w-3" />
              Open Maps
            </Button>
          </div>
        </div>
        <Input
          value={formData.location_link}
          onChange={(e) => setFormData({ ...formData, location_link: e.target.value })}
          placeholder="Paste Google Maps link or use Share Live Location"
        />
        {formData.location_link && (
          <a
            href={formData.location_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <MapPin className="h-3 w-3" />
            Preview on Google Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <p className="text-xs text-muted-foreground">
          Share your delivery location so the delivery person can navigate to you directly.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="is_default" className="text-sm font-normal">
          Set as default address
        </Label>
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={addAddress.isPending || updateAddress.isPending || (!!phoneError && formData.phone.length > 0)}
      >
        {address ? 'Update Address' : 'Add Address'}
      </Button>
    </form>
  );
}
