"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export function useAuthSession(
  onSessionChange?: (session: Session | null) => void
) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      onSessionChange?.(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, [onSessionChange]);

  return session;
}
