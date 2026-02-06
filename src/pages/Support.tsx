import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { HelpCircle, MessageCircle, Phone, Mail, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// TODO: In multi-admin setup, get admin_id from context/route
// For now, we'll fetch from first available admin
function useSupportData() {
  return useQuery({
    queryKey: ['support-page-data'],
    queryFn: async () => {
      // Get first admin's support settings and FAQs
      // In production, this should be filtered by admin_id from context
      const [settingsRes, faqsRes] = await Promise.all([
        supabase
          .from('admin_support_settings')
          .select('*')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      return {
        settings: settingsRes.data,
        faqs: faqsRes.data || [],
      };
    },
  });
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { data, isLoading } = useSupportData();

  const settings = data?.settings;
  const faqs = data?.faqs || [];

  const handleCall = () => {
    if (settings?.phone_number) {
      window.location.href = `tel:${settings.phone_number}`;
    }
  };

  const handleEmail = () => {
    if (settings?.email_address) {
      window.location.href = `mailto:${settings.email_address}`;
    }
  };

  const handleWhatsApp = () => {
    if (settings?.whatsapp_number) {
      const phone = settings.whatsapp_number.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  const handleChat = () => {
    if (settings?.chat_url) {
      window.open(settings.chat_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-6 text-xl font-semibold">Help & Support</h1>

        <div className="space-y-4">
          {/* Chat Support */}
          {(settings?.chat_enabled || !settings) && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Chat with us</h3>
                  <p className="text-sm text-muted-foreground">Get instant help</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleChat}
                  disabled={!settings?.chat_url}
                >
                  Start Chat
                </Button>
              </div>
            </div>
          )}

          {/* Phone Support */}
          {(settings?.phone_enabled || !settings) && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <Phone className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Call us</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings?.phone_number || 'Contact number not set'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCall}
                  disabled={!settings?.phone_number}
                >
                  Call Now
                </Button>
              </div>
            </div>
          )}

          {/* Email Support */}
          {(settings?.email_enabled || !settings) && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                  <Mail className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Email support</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings?.email_address || 'Email not set'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEmail}
                  disabled={!settings?.email_address}
                >
                  Send Email
                </Button>
              </div>
            </div>
          )}

          {/* WhatsApp Support */}
          {settings?.whatsapp_enabled && settings?.whatsapp_number && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/10">
                  <svg 
                    viewBox="0 0 24 24" 
                    className="h-5 w-5 text-[#25D366]" 
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    {settings.whatsapp_number}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleWhatsApp}
                  className="gap-1"
                >
                  Chat
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-semibold">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((faq: any) => (
                <FAQItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        )}

        {/* Fallback if no FAQs from backend */}
        {faqs.length === 0 && (
          <div className="mt-8">
            <h2 className="mb-4 font-semibold">Frequently Asked Questions</h2>
            <div className="space-y-3">
              <FAQItem 
                question="How do I track my order?" 
                answer="You can track your order from the Orders page in your account. Once your order is shipped, you'll see the tracking number and a link to the courier website."
              />
              <FAQItem 
                question="What is the return policy?" 
                answer="You can raise a support ticket within 7 days of delivery for damaged, wrong, or missing items. Our team will assist you with returns and refunds."
              />
              <FAQItem 
                question="How do I cancel an order?" 
                answer="To cancel an order, please contact our support team as soon as possible. Orders that have already been shipped cannot be cancelled."
              />
              <FAQItem 
                question="How long does delivery take?" 
                answer="Delivery typically takes 3-5 business days within Tamil Nadu and 5-7 business days for other locations. You'll see the estimated delivery date on your order page."
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
