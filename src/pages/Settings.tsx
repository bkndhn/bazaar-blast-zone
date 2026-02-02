import { MainLayout } from '@/components/layout/MainLayout';
import { Settings as SettingsIcon, Moon, Sun, Bell, Shield, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Settings() {
  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-6 text-xl font-semibold">Settings</h1>

        <div className="space-y-6">
          {/* Appearance */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Appearance</h2>
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark theme</p>
                  </div>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Notifications</h2>
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Order updates & offers</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Promotional emails</p>
                  </div>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Privacy</h2>
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Extra security</p>
                  </div>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* Language */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Language & Region</h2>
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">English (India)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
