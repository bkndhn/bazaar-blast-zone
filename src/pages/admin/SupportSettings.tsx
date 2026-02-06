import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminSupportSettings, useUpdateSupportSettings } from '@/hooks/useAdminSupportSettings';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function AdminSupportSettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: supportSettings, isLoading: settingsLoading } = useAdminSupportSettings();
  const updateSupportSettings = useUpdateSupportSettings();
  
  const [contactForm, setContactForm] = useState({
    chat_enabled: false,
    chat_url: '',
    phone_enabled: true,
    phone_number: '',
    email_enabled: true,
    email_address: '',
    whatsapp_enabled: false,
    whatsapp_number: '',
  });

  // Load existing settings
  useState(() => {
    if (supportSettings) {
      setContactForm({
        chat_enabled: supportSettings.chat_enabled,
        chat_url: supportSettings.chat_url || '',
        phone_enabled: supportSettings.phone_enabled,
        phone_number: supportSettings.phone_number || '',
        email_enabled: supportSettings.email_enabled,
        email_address: supportSettings.email_address || '',
        whatsapp_enabled: supportSettings.whatsapp_enabled,
        whatsapp_number: supportSettings.whatsapp_number || '',
      });
    }
  });

  // FAQs
  const { data: faqs, isLoading: faqsLoading } = useQuery({
    queryKey: ['admin-faqs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('admin_id', user.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const saveFaq = useMutation({
    mutationFn: async (data: { id?: string; question: string; answer: string }) => {
      if (!user) throw new Error('Not authenticated');

      if (data.id) {
        const { error } = await supabase
          .from('faqs')
          .update({ question: data.question, answer: data.answer })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('faqs')
          .insert({ admin_id: user.id, question: data.question, answer: data.answer });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      setFaqDialogOpen(false);
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '' });
      toast({ title: 'FAQ saved' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
      toast({ title: 'FAQ deleted' });
    },
  });

  const toggleFaqActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('faqs')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
  });

  const handleSaveContactSettings = () => {
    updateSupportSettings.mutate(contactForm);
  };

  const handleOpenFaqDialog = (faq?: any) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqForm({ question: faq.question, answer: faq.answer });
    } else {
      setEditingFaq(null);
      setFaqForm({ question: '', answer: '' });
    }
    setFaqDialogOpen(true);
  };

  return (
    <AdminLayout title="Support Settings">
      <Tabs defaultValue="contact" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>

        {/* Contact Settings Tab */}
        <TabsContent value="contact" className="space-y-4">
          {settingsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Phone */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Phone Support</Label>
                  <Switch
                    checked={contactForm.phone_enabled}
                    onCheckedChange={(checked) =>
                      setContactForm({ ...contactForm, phone_enabled: checked })
                    }
                  />
                </div>
                {contactForm.phone_enabled && (
                  <Input
                    placeholder="Phone number (e.g., 1800-123-4567)"
                    value={contactForm.phone_number}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, phone_number: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Email */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Email Support</Label>
                  <Switch
                    checked={contactForm.email_enabled}
                    onCheckedChange={(checked) =>
                      setContactForm({ ...contactForm, email_enabled: checked })
                    }
                  />
                </div>
                {contactForm.email_enabled && (
                  <Input
                    type="email"
                    placeholder="support@example.com"
                    value={contactForm.email_address}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email_address: e.target.value })
                    }
                  />
                )}
              </div>

              {/* WhatsApp */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">WhatsApp Support</Label>
                  <Switch
                    checked={contactForm.whatsapp_enabled}
                    onCheckedChange={(checked) =>
                      setContactForm({ ...contactForm, whatsapp_enabled: checked })
                    }
                  />
                </div>
                {contactForm.whatsapp_enabled && (
                  <Input
                    placeholder="WhatsApp number (e.g., +91 98765 43210)"
                    value={contactForm.whatsapp_number}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, whatsapp_number: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Chat */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Live Chat</Label>
                  <Switch
                    checked={contactForm.chat_enabled}
                    onCheckedChange={(checked) =>
                      setContactForm({ ...contactForm, chat_enabled: checked })
                    }
                  />
                </div>
                {contactForm.chat_enabled && (
                  <Input
                    placeholder="Chat URL (e.g., https://tawk.to/...)"
                    value={contactForm.chat_url}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, chat_url: e.target.value })
                    }
                  />
                )}
              </div>

              <Button
                onClick={handleSaveContactSettings}
                disabled={updateSupportSettings.isPending}
                className="w-full"
              >
                {updateSupportSettings.isPending ? 'Saving...' : 'Save Contact Settings'}
              </Button>
            </>
          )}
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">{faqs?.length || 0} FAQs</p>
            <Button onClick={() => handleOpenFaqDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add FAQ
            </Button>
          </div>

          {faqsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !faqs?.length ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <p className="text-lg font-medium">No FAQs yet</p>
              <p className="mt-1 text-muted-foreground">
                Add frequently asked questions for your customers
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 mt-0.5 text-muted-foreground cursor-grab" />
                    <div className="flex-1">
                      <p className="font-medium">{faq.question}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {faq.answer}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={faq.is_active}
                        onCheckedChange={(checked) =>
                          toggleFaqActive.mutate({ id: faq.id, is_active: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenFaqDialog(faq)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteConfirm({ open: true, id: faq.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={faqForm.question}
                onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                placeholder="How do I track my order?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                value={faqForm.answer}
                onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                placeholder="You can track your order from the Orders page..."
                rows={4}
              />
            </div>
            <Button
              onClick={() =>
                saveFaq.mutate({
                  id: editingFaq?.id,
                  question: faqForm.question,
                  answer: faqForm.answer,
                })
              }
              disabled={saveFaq.isPending || !faqForm.question || !faqForm.answer}
              className="w-full"
            >
              {saveFaq.isPending ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Add FAQ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete FAQ?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => deleteConfirm.id && deleteFaq.mutate(deleteConfirm.id)}
        loading={deleteFaq.isPending}
      />
    </AdminLayout>
  );
}
