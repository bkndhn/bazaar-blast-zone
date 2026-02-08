import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'user';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }
      
      return (data?.map(r => r.role) || []) as AppRole[];
    } catch (err) {
      console.error('Error fetching roles:', err);
      return [];
    }
  };

  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error updating last login:', err);
    }
  };

  // Check if admin is paused - if so, force sign out
  const checkAdminActive = useCallback(async (userId: string, userRoles: AppRole[]) => {
    if (!userRoles.includes('admin')) return true;
    
    try {
      const { data } = await supabase
        .from('admin_accounts')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (data?.status === 'paused') {
        // Use a flag to prevent re-triggering from onAuthStateChange
        setRoles([]);
        setUser(null);
        setSession(null);
        // Sign out without triggering the loop
        await supabase.auth.signOut({ scope: 'local' });
        return false;
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
    return true;
  }, []);

  // Real-time listener for admin_accounts changes - force logout if paused
  useEffect(() => {
    if (!user || !roles.includes('admin')) return;

    const channel = supabase
      .channel('admin-status-watch')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'admin_accounts', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          if ((payload.new as any).status === 'paused') {
            setRoles([]);
            setUser(null);
            setSession(null);
            await supabase.auth.signOut({ scope: 'local' });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roles]);

  useEffect(() => {
    let isMounted = true;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          if (event === 'SIGNED_IN') {
            setTimeout(() => updateLastLogin(session.user.id), 0);
          }
          
          // Only fetch roles on sign in, not on token refresh or sign out
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            setTimeout(async () => {
              if (!isMounted) return;
              const userRoles = await fetchUserRoles(session.user.id);
              if (!isMounted) return;
              setRoles(userRoles);
              await checkAdminActive(session.user.id, userRoles);
            }, 0);
          }
        } else {
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userRoles = await fetchUserRoles(session.user.id);
        if (!isMounted) return;
        setRoles(userRoles);
        await checkAdminActive(session.user.id, userRoles);
      }
      
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminActive]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
  };

  const value = {
    user,
    session,
    roles,
    loading,
    signUp,
    signIn,
    signOut,
    isSuperAdmin: roles.includes('super_admin'),
    isAdmin: roles.includes('admin'),
    isUser: roles.includes('user'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
