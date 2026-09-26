import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { getProfile } from './api';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  /** true until we know whether the user is signed in and has a profile */
  loading: boolean;
  /** the profile could not be loaded (e.g. no internet) */
  profileError: boolean;
  retryProfile: () => void;
};

const AuthContext = createContext<AuthState>({
  session: null,
  userId: null,
  profile: null,
  loading: true,
  profileError: false,
  retryProfile: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'SIGNED_OUT') queryClient.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;
  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const value: AuthState = {
    session,
    userId,
    profile: profileQuery.data ?? null,
    loading: !sessionLoaded || (!!userId && profileQuery.isPending && !profileQuery.isError),
    profileError: !!userId && profileQuery.isError,
    retryProfile: () => profileQuery.refetch(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

const SIGNED_OUT: Profile = { id: '', username: '', display_name: '', avatar: '🙂', created_at: '' };

/**
 * The signed-in user's profile, for screens behind the auth guard.
 * While signing out those screens may render once more, so instead of
 * throwing this returns an empty profile (id === '').
 */
export function useMe(): Profile {
  return useAuth().profile ?? SIGNED_OUT;
}
