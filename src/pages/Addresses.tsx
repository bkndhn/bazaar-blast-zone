import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAddresses, useAddAddress, useUpdateAddress, useDeleteAddress, Address } from '@/hooks/useAddresses';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
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
        disabled={addAddress.isPending || updateAddress.isPending}
      >
        {address ? 'Update Address' : 'Add Address'}
      </Button>
    </form>
  );
}
