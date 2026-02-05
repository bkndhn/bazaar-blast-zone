 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { MessageCircle, Clock, CheckCircle, AlertCircle, ChevronRight, Send, Image as ImageIcon } from 'lucide-react';
 import { AdminLayout } from '@/components/layout/AdminLayout';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
 import { Badge } from '@/components/ui/badge';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from '@/hooks/use-toast';
 import { Skeleton } from '@/components/ui/skeleton';
 import { cn } from '@/lib/utils';
 import { format } from 'date-fns';
 
 interface Ticket {
   id: string;
   user_id: string;
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
 
 const statusIcons: Record<string, React.ElementType> = {
   open: AlertCircle,
   in_progress: Clock,
   resolved: CheckCircle,
   closed: CheckCircle,
 };
 
 export default function AdminSupportTickets() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
   const [statusFilter, setStatusFilter] = useState<string>('all');
 
   const { data: tickets, isLoading } = useQuery({
     queryKey: ['admin-tickets', user?.id],
     queryFn: async () => {
       if (!user) return [];
       const { data, error } = await supabase
         .from('support_tickets')
         .select('*')
         .eq('admin_id', user.id)
         .order('created_at', { ascending: false });
 
       if (error) throw error;
       return data as Ticket[];
     },
     enabled: !!user,
   });
 
   const filteredTickets = tickets?.filter(
     t => statusFilter === 'all' || t.status === statusFilter
   );
 
   return (
     <AdminLayout title="Support Tickets">
       <div className="mb-4 flex items-center justify-between">
         <Select value={statusFilter} onValueChange={setStatusFilter}>
           <SelectTrigger className="w-40">
             <SelectValue placeholder="Filter status" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="all">All Tickets</SelectItem>
             <SelectItem value="open">Open</SelectItem>
             <SelectItem value="in_progress">In Progress</SelectItem>
             <SelectItem value="resolved">Resolved</SelectItem>
             <SelectItem value="closed">Closed</SelectItem>
           </SelectContent>
         </Select>
         <span className="text-sm text-muted-foreground">
           {filteredTickets?.length || 0} tickets
         </span>
       </div>
 
       {isLoading ? (
         <div className="space-y-3">
           {Array.from({ length: 3 }).map((_, i) => (
             <Skeleton key={i} className="h-20 w-full" />
           ))}
         </div>
       ) : !filteredTickets?.length ? (
         <div className="rounded-lg border border-dashed border-border p-12 text-center">
           <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
           <p className="mt-4 text-lg font-medium">No support tickets</p>
           <p className="mt-1 text-muted-foreground">
             Customer issues will appear here
           </p>
         </div>
       ) : (
         <div className="space-y-2">
           {filteredTickets.map((ticket) => {
             const StatusIcon = statusIcons[ticket.status] || AlertCircle;
             return (
               <button
                 key={ticket.id}
                 className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                 onClick={() => setSelectedTicket(ticket)}
               >
                 <div className={cn('rounded-full p-2', statusColors[ticket.status])}>
                   <StatusIcon className="h-4 w-4" />
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
             );
           })}
         </div>
       )}
 
       <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
         <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col sm:max-w-lg">
           <DialogHeader>
             <DialogTitle>Ticket Details</DialogTitle>
           </DialogHeader>
           {selectedTicket && (
             <TicketDetail 
               ticket={selectedTicket} 
               onClose={() => setSelectedTicket(null)}
               onUpdate={() => {
                 queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
               }}
             />
           )}
         </DialogContent>
       </Dialog>
     </AdminLayout>
   );
 }
 
 function TicketDetail({ 
   ticket, 
   onClose, 
   onUpdate 
 }: { 
   ticket: Ticket; 
   onClose: () => void;
   onUpdate: () => void;
 }) {
   const { user } = useAuth();
   const [reply, setReply] = useState('');
   const [sending, setSending] = useState(false);
 
   const { data: replies, refetch: refetchReplies } = useQuery({
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
 
   const updateStatus = useMutation({
     mutationFn: async (status: string) => {
       const { error } = await supabase
         .from('support_tickets')
         .update({ status })
         .eq('id', ticket.id);
       if (error) throw error;
     },
     onSuccess: () => {
       onUpdate();
       toast({ title: 'Status updated' });
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
           is_admin_reply: true,
         });
 
       if (error) throw error;
 
       setReply('');
       refetchReplies();
       
       // Update status to in_progress if it was open
       if (ticket.status === 'open') {
         await updateStatus.mutateAsync('in_progress');
       }
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
           Type: {ticket.type.replace('_', ' ')} • Created: {format(new Date(ticket.created_at), 'PPpp')}
         </p>
         <p className="text-sm mt-2">{ticket.description}</p>
 
         {/* Images */}
         {images && images.length > 0 && (
           <div className="flex gap-2 mt-3 flex-wrap">
             {images.map((img) => (
               <a
                 key={img.id}
                 href={img.image_url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="relative h-16 w-16 rounded overflow-hidden border"
               >
                 <img src={img.image_url} alt="" className="h-full w-full object-cover" />
               </a>
             ))}
           </div>
         )}
 
         {/* Status Selector */}
         <div className="mt-4">
           <Select value={ticket.status} onValueChange={(v) => updateStatus.mutate(v)}>
             <SelectTrigger className="w-40">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="open">Open</SelectItem>
               <SelectItem value="in_progress">In Progress</SelectItem>
               <SelectItem value="resolved">Resolved</SelectItem>
               <SelectItem value="closed">Closed</SelectItem>
             </SelectContent>
           </Select>
         </div>
       </div>
 
       {/* Replies */}
       <div className="flex-1 overflow-y-auto space-y-3 mb-4">
         {replies?.map((r) => (
           <div
             key={r.id}
             className={cn(
               'max-w-[80%] rounded-lg p-3',
               r.is_admin_reply 
                 ? 'ml-auto bg-primary text-primary-foreground'
                 : 'bg-muted'
             )}
           >
             <p className="text-sm">{r.message}</p>
             <p className="text-xs opacity-70 mt-1">
               {format(new Date(r.created_at), 'p')}
             </p>
           </div>
         ))}
       </div>
 
       {/* Reply Input */}
       <div className="flex gap-2">
         <Input
           value={reply}
           onChange={(e) => setReply(e.target.value)}
           placeholder="Type your reply..."
           onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendReply()}
         />
         <Button onClick={sendReply} disabled={sending || !reply.trim()}>
           <Send className="h-4 w-4" />
         </Button>
       </div>
     </div>
   );
 }