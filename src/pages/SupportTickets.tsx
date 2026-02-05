 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { Plus, MessageCircle, Clock, CheckCircle, AlertCircle, ChevronRight, Send, ImagePlus, X } from 'lucide-react';
 import { useParams, Link } from 'react-router-dom';
 import { MainLayout } from '@/components/layout/MainLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Badge } from '@/components/ui/badge';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { useImageUpload } from '@/hooks/useImageUpload';
 import { toast } from '@/hooks/use-toast';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 import { format } from 'date-fns';
 
 interface Ticket {
   id: string;
   admin_id: string;
   order_id: string | null;
   type: string;
   subject: string;
   description: string;
   status: string;
   created_at: string;
 }
 
 interface TicketReply {
   id: string;
   message: string;
   is_admin_reply: boolean;
   created_at: string;
 }
 
 const statusColors: Record<string, string> = {
   open: 'bg-warning/20 text-warning',
   in_progress: 'bg-primary/20 text-primary',
   resolved: 'bg-success/20 text-success',
   closed: 'bg-muted text-muted-foreground',
 };
 
 export default function SupportTickets() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [isOpen, setIsOpen] = useState(false);
   const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
 
   const { data: tickets, isLoading } = useQuery({
     queryKey: ['my-tickets', user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from('support_tickets')
         .select('*')
         .eq('user_id', user.id)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return data as Ticket[];
     },
     enabled: !!user,
   });
 
   if (!user) {
     return (
       <MainLayout>
         <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
           <MessageCircle className="h-16 w-16 text-muted-foreground/50" />
           <h2 className="mt-4 text-lg font-semibold">Support Tickets</h2>
           <p className="mt-2 text-sm text-muted-foreground">
             Sign in to view or create support tickets
           </p>
           <Button asChild className="mt-6">
             <Link to="/auth">Sign In</Link>
           </Button>
         </div>
       </MainLayout>
     );
   }
 
   return (
     <MainLayout>
       <div className="p-4">
         <div className="mb-4 flex items-center justify-between">
           <h1 className="text-xl font-semibold">My Tickets</h1>
           <Dialog open={isOpen} onOpenChange={setIsOpen}>
             <DialogTrigger asChild>
               <Button size="sm" className="gap-2">
                 <Plus className="h-4 w-4" />
                 New Ticket
               </Button>
             </DialogTrigger>
             <DialogContent className="max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle>Create Support Ticket</DialogTitle>
               </DialogHeader>
               <CreateTicketForm
                 onSuccess={() => {
                   setIsOpen(false);
                   queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
                 }}
               />
             </DialogContent>
           </Dialog>
         </div>
 
         {isLoading ? (
           <div className="space-y-3">
             {Array.from({ length: 3 }).map((_, i) => (
               <Skeleton key={i} className="h-20 w-full" />
             ))}
           </div>
         ) : !tickets?.length ? (
           <div className="rounded-lg border border-dashed border-border p-12 text-center">
             <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
             <p className="mt-4 text-lg font-medium">No tickets yet</p>
             <p className="mt-1 text-muted-foreground">
               Create a ticket if you have any issues with your orders
             </p>
           </div>
         ) : (
           <div className="space-y-3">
             {tickets.map((ticket) => (
               <button
                 key={ticket.id}
                 className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                 onClick={() => setSelectedTicket(ticket)}
               >
                 <div className={cn('rounded-full p-2', statusColors[ticket.status])}>
                   {ticket.status === 'open' && <AlertCircle className="h-4 w-4" />}
                   {ticket.status === 'in_progress' && <Clock className="h-4 w-4" />}
                   {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                     <CheckCircle className="h-4 w-4" />
                   )}
                 </div>
 
                 <div className="flex-1 min-w-0">
                   <p className="font-medium truncate">{ticket.subject}</p>
                   <p className="text-xs text-muted-foreground">
                     {ticket.type.replace('_', ' ')} • {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                   </p>
                 </div>
 
                 <Badge variant="secondary" className={statusColors[ticket.status]}>
                   {ticket.status.replace('_', ' ')}
                 </Badge>
                 <ChevronRight className="h-4 w-4 text-muted-foreground" />
               </button>
             ))}
           </div>
         )}
 
         {/* Ticket Detail Dialog */}
         <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
           <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-lg">
             <DialogHeader>
               <DialogTitle>Ticket Details</DialogTitle>
             </DialogHeader>
             {selectedTicket && (
               <TicketConversation 
                 ticket={selectedTicket}
                 onUpdate={() => {
                   queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
                 }}
               />
             )}
           </DialogContent>
         </Dialog>
       </div>
     </MainLayout>
   );
 }
 
 function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
   const { user } = useAuth();
   const { upload, uploading } = useImageUpload({ bucket: 'store-assets', maxSizeKB: 200 });
   const [loading, setLoading] = useState(false);
   const [images, setImages] = useState<string[]>([]);
   const [formData, setFormData] = useState({
     type: 'general',
     subject: '',
     description: '',
     order_id: '',
   });
 
   // Get user's orders for selection
   const { data: orders } = useQuery({
     queryKey: ['user-orders-for-ticket', user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from('orders')
         .select('id, order_number, admin_id')
         .eq('user_id', user.id)
         .order('created_at', { ascending: false })
         .limit(10);
 
       if (error) throw error;
       return data;
     },
     enabled: !!user,
   });
 
   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = e.target.files;
     if (!files) return;
 
     for (const file of Array.from(files)) {
       const url = await upload(file);
       if (url) {
         setImages(prev => [...prev, url]);
       }
     }
   };
 
   const removeImage = (index: number) => {
     setImages(prev => prev.filter((_, i) => i !== index));
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user) return;
 
     // Need to determine admin_id
     let adminId = '';
     if (formData.order_id && orders) {
       const order = orders.find(o => o.id === formData.order_id);
       if (order) adminId = order.admin_id;
     }
 
     if (!adminId) {
       toast({
         title: 'Please select an order',
         description: 'You need to select an order related to this issue',
         variant: 'destructive',
       });
       return;
     }
 
     setLoading(true);
     try {
       const { data: ticket, error: ticketError } = await supabase
         .from('support_tickets')
         .insert({
           user_id: user.id,
           admin_id: adminId,
           order_id: formData.order_id || null,
           type: formData.type,
           subject: formData.subject,
           description: formData.description,
         })
         .select()
         .single();
 
       if (ticketError) throw ticketError;
 
       // Add images
       if (images.length > 0) {
         const imageRecords = images.map(url => ({
           ticket_id: ticket.id,
           image_url: url,
         }));
         await supabase.from('ticket_images').insert(imageRecords);
       }
 
       toast({ title: 'Ticket created successfully' });
       onSuccess();
     } catch (error: any) {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-2">
         <Label>Related Order</Label>
         <Select
           value={formData.order_id}
           onValueChange={(value) => setFormData({ ...formData, order_id: value })}
         >
           <SelectTrigger>
             <SelectValue placeholder="Select order" />
           </SelectTrigger>
           <SelectContent>
             {orders?.map((order) => (
               <SelectItem key={order.id} value={order.id}>
                 {order.order_number}
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>
 
       <div className="space-y-2">
         <Label>Issue Type</Label>
         <Select
           value={formData.type}
           onValueChange={(value) => setFormData({ ...formData, type: value })}
         >
           <SelectTrigger>
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="damaged">Damaged Product</SelectItem>
             <SelectItem value="wrong_item">Wrong Item Received</SelectItem>
             <SelectItem value="missing_item">Missing Item</SelectItem>
             <SelectItem value="other">Other Issue</SelectItem>
           </SelectContent>
         </Select>
       </div>
 
       <div className="space-y-2">
         <Label htmlFor="subject">Subject</Label>
         <Input
           id="subject"
           value={formData.subject}
           onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
           placeholder="Brief description of the issue"
           required
         />
       </div>
 
       <div className="space-y-2">
         <Label htmlFor="description">Description</Label>
         <Textarea
           id="description"
           value={formData.description}
           onChange={(e) => setFormData({ ...formData, description: e.target.value })}
           placeholder="Describe your issue in detail..."
           rows={4}
           required
         />
       </div>
 
       {/* Image Upload */}
       <div className="space-y-2">
         <Label>Attach Images (Optional)</Label>
         <div className="flex flex-wrap gap-2">
           {images.map((url, index) => (
             <div key={index} className="relative h-16 w-16">
               <img src={url} alt="" className="h-full w-full rounded object-cover" />
               <button
                 type="button"
                 className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
                 onClick={() => removeImage(index)}
               >
                 <X className="h-3 w-3" />
               </button>
             </div>
           ))}
           <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border-2 border-dashed border-border hover:border-primary">
             <input
               type="file"
               accept="image/*"
               multiple
               className="hidden"
               onChange={handleImageUpload}
             />
             <ImagePlus className="h-5 w-5 text-muted-foreground" />
           </label>
         </div>
       </div>
 
       <Button type="submit" className="w-full" disabled={loading || uploading}>
         {loading ? 'Creating...' : 'Create Ticket'}
       </Button>
     </form>
   );
 }
 
 function TicketConversation({ ticket, onUpdate }: { ticket: Ticket; onUpdate: () => void }) {
   const { user } = useAuth();
   const [reply, setReply] = useState('');
   const [sending, setSending] = useState(false);
 
   const { data: replies, refetch } = useQuery({
     queryKey: ['ticket-replies', ticket.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('ticket_replies')
         .select('*')
         .eq('ticket_id', ticket.id)
         .order('created_at', { ascending: true });
 
       if (error) throw error;
       return data as TicketReply[];
     },
   });
 
   const { data: images } = useQuery({
     queryKey: ['ticket-images', ticket.id],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('ticket_images')
         .select('*')
         .eq('ticket_id', ticket.id);
 
       if (error) throw error;
       return data;
     },
   });
 
   const sendReply = async () => {
     if (!reply.trim() || !user) return;
 
     setSending(true);
     try {
       const { error } = await supabase
         .from('ticket_replies')
         .insert({
           ticket_id: ticket.id,
           user_id: user.id,
           message: reply,
           is_admin_reply: false,
         });
 
       if (error) throw error;
       setReply('');
       refetch();
     } catch (error: any) {
       toast({ title: 'Error', description: error.message, variant: 'destructive' });
     } finally {
       setSending(false);
     }
   };
 
   return (
     <div className="flex flex-col flex-1 overflow-hidden">
       {/* Ticket Info */}
       <div className="border-b border-border pb-4 mb-4">
         <h3 className="font-semibold">{ticket.subject}</h3>
         <p className="text-sm text-muted-foreground mt-1">
           {ticket.type.replace('_', ' ')} • {format(new Date(ticket.created_at), 'PPpp')}
         </p>
         <p className="text-sm mt-2">{ticket.description}</p>
 
         {images && images.length > 0 && (
           <div className="flex gap-2 mt-3 flex-wrap">
             {images.map((img) => (
               <a
                 key={img.id}
                 href={img.image_url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="h-16 w-16 rounded overflow-hidden border"
               >
                 <img src={img.image_url} alt="" className="h-full w-full object-cover" />
               </a>
             ))}
           </div>
         )}
 
         <Badge className={cn('mt-3', statusColors[ticket.status])}>
           Status: {ticket.status.replace('_', ' ')}
         </Badge>
       </div>
 
       {/* Replies */}
       <div className="flex-1 overflow-y-auto space-y-3 mb-4">
         {replies?.map((r) => (
           <div
             key={r.id}
             className={cn(
               'max-w-[80%] rounded-lg p-3',
               r.is_admin_reply 
                 ? 'bg-muted'
                 : 'ml-auto bg-primary text-primary-foreground'
             )}
           >
             <p className="text-sm">{r.message}</p>
             <p className="text-xs opacity-70 mt-1">
               {format(new Date(r.created_at), 'p')}
             </p>
           </div>
         ))}
       </div>
 
       {/* Reply Input - only if not closed */}
       {ticket.status !== 'closed' && (
         <div className="flex gap-2">
           <Input
             value={reply}
             onChange={(e) => setReply(e.target.value)}
             placeholder="Type a message..."
             onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendReply()}
           />
           <Button onClick={sendReply} disabled={sending || !reply.trim()}>
             <Send className="h-4 w-4" />
           </Button>
         </div>
       )}
     </div>
   );
 }