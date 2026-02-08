import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStorePath } from '@/hooks/useStorePath';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { getPath, isStoreRoute } = useStorePath();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (isSuperAdmin) {
        navigate('/super-admin');
      } else if (isAdmin) {
        navigate('/admin');
      } else if (isStoreRoute) {
        navigate(getPath('/account'));
      } else {
        navigate('/account');
      }
    }
  }, [user, isAdmin, isSuperAdmin, navigate, isStoreRoute, getPath]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldown) return;
    setLoading(true);

    // Prevent rapid repeated clicks
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);

    try {
      if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          if (error.message?.includes('rate') || error.status === 429) {
            toast({ title: 'Too many requests', description: 'Please wait a moment before trying again.', variant: 'destructive' });
          } else {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Email sent!', description: 'Check your email for a password reset link.' });
          setMode('login');
        }
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.includes('rate') || (error as any).status === 429) {
            toast({ title: 'Too many attempts', description: 'Please wait before trying again.', variant: 'destructive' });
          } else {
            toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Welcome back!' });
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message?.includes('rate') || (error as any).status === 429) {
            toast({ title: 'Too many attempts', description: 'Please wait a minute before signing up again.', variant: 'destructive' });
          } else {
            toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Account created!', description: 'Please check your email to verify your account.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Sign in to access your account';
      case 'signup': return 'Sign up to start shopping';
      case 'forgot-password': return 'Enter your email to receive a reset link';
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-nav-height items-center gap-3 px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ShoppingBag className="h-6 w-6 text-primary" />
        <span className="font-semibold">ShopHub</span>
      </header>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-4 pb-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot-password' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setMode('forgot-password')}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading || cooldown}>
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Sign In'
                    : mode === 'signup'
                      ? 'Create Account'
                      : 'Send Reset Link'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setMode('signup')}
                    >
                      Sign up
                    </button>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setMode('login')}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Remember your password?{' '}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setMode('login')}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
