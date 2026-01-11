import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'uploader';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  canUpload: boolean;
  pendingInviteCode: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, inviteCode: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (inviteCode: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  validateInviteCode: (code: string) => Promise<boolean>;
  consumeInviteCode: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
      return;
    }
    
    setRoles((data || []).map(r => r.role as AppRole));
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchRoles(user.id);
    }
  };

  // Validate invite code without consuming it
  const validateInviteCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase
      .rpc('validate_invite_code', { invite_code: code });
    return !error && data === true;
  };

  // Consume invite code after successful account creation
  const consumeInviteCode = async (code: string): Promise<boolean> => {
    const { data, error } = await supabase
      .rpc('use_invite_code', { invite_code: code });
    if (!error && data === true) {
      setPendingInviteCode(null);
    }
    return !error && data === true;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // When user confirms email (SIGNED_IN event after email verification), consume the pending invite code
        if (event === 'SIGNED_IN' && session?.user) {
          const storedCode = localStorage.getItem('pendingInviteCode');
          if (storedCode) {
            setTimeout(async () => {
              await supabase.rpc('use_invite_code', { invite_code: storedCode });
              localStorage.removeItem('pendingInviteCode');
            }, 0);
          }
        }
        
        // Defer role fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        fetchRoles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, inviteCode: string) => {
    // First validate the invite code without consuming it
    const isValid = await validateInviteCode(inviteCode);
    
    if (!isValid) {
      return { error: new Error('Invalid or expired invite code') };
    }
    
    // Store the invite code to consume after email confirmation
    localStorage.setItem('pendingInviteCode', inviteCode);
    setPendingInviteCode(inviteCode);
    
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    // If signup failed, remove the pending code
    if (error) {
      localStorage.removeItem('pendingInviteCode');
      setPendingInviteCode(null);
    }
    
    return { error };
  };

  const signInWithGoogle = async (inviteCode: string) => {
    // First validate the invite code
    const isValid = await validateInviteCode(inviteCode);
    
    if (!isValid) {
      return { error: new Error('Invalid or expired invite code') };
    }
    
    // Store the invite code to consume after OAuth callback
    localStorage.setItem('pendingInviteCode', inviteCode);
    setPendingInviteCode(inviteCode);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      }
    });
    
    return { error: error || null };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    localStorage.removeItem('pendingInviteCode');
    setPendingInviteCode(null);
  };

  const isAdmin = roles.includes('admin');
  const canUpload = roles.includes('admin') || roles.includes('uploader');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      roles,
      isAdmin,
      canUpload,
      pendingInviteCode,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshRoles,
      resetPassword,
      updatePassword,
      validateInviteCode,
      consumeInviteCode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
