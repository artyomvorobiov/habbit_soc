import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { qk } from './queries';
import { supabase } from './supabase';

/**
 * Live updates through Supabase Realtime: new chat messages and notifications
 * refresh the screens that show them. Screens also poll from time to time, so
 * the app keeps working if Realtime is unavailable.
 */
export function useRealtime(userId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`live:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_messages' }, (payload) => {
        const row = (payload.new ?? payload.old) as { challenge_id?: string } | undefined;
        // deletions only carry the id, so refresh every chat then
        qc.invalidateQueries({ queryKey: row?.challenge_id ? qk.chat(row.challenge_id) : ['challenge'] });
        qc.invalidateQueries({ queryKey: qk.challenges });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: qk.notifications });
          qc.invalidateQueries({ queryKey: qk.friends });
          qc.invalidateQueries({ queryKey: qk.challenges });
          qc.invalidateQueries({ queryKey: qk.feed });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}
