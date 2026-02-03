import { MainLayout } from '@/components/layout/MainLayout';
import { Moon, Sun, Bell, Shield, Globe, Monitor } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="mb-6 text-xl font-semibold">Settings</h1>

        <div className="space-y-6">
          {/* Appearance */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Appearance</h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <Label className="mb-3 block">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <Icon className={cn(
                        'h-5 w-5',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <span className={cn(
                        'text-sm',
                        isSelected ? 'font-medium text-primary' : 'text-muted-foreground'
                      )}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Current theme: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                {theme === 'system' && ' (based on system preference)'}
              </p>
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
