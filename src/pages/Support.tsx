import { MainLayout } from '@/components/layout/MainLayout';
import { HelpCircle, MessageCircle, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Support() {
  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-6 text-xl font-semibold">Help & Support</h1>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Chat with us</h3>
                <p className="text-sm text-muted-foreground">Get instant help</p>
              </div>
              <Button size="sm">Start Chat</Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <Phone className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Call us</h3>
                <p className="text-sm text-muted-foreground">1800-123-4567</p>
              </div>
              <Button variant="outline" size="sm">Call Now</Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                <Mail className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Email support</h3>
                <p className="text-sm text-muted-foreground">support@shophub.com</p>
              </div>
              <Button variant="outline" size="sm">Send Email</Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-4 font-semibold">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              'How do I track my order?',
              'What is the return policy?',
              'How do I cancel an order?',
              'How long does delivery take?',
            ].map((question) => (
              <div
                key={question}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <p className="font-medium">{question}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
