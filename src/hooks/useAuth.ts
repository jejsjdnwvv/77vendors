import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AuthState = {
  user: User | null;
  isAdmin: boolean;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    sound_enabled: boolean;
    email_notifications: boolean;
    created_at: string;
  } | null;
};

async function loadAuth(): Promise<AuthState> {
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  if (!user) return { user: null, isAdmin: false, profile: null };

  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  return {
    user,
    isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    profile: profile ?? null,
  };
}

export function useAuth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["auth"],
    queryFn: loadAuth,
    staleTime: 30_000,
  });

  return {
    user: query.data?.user ?? null,
    profile: query.data?.profile ?? null,
    isAdmin: query.data?.isAdmin ?? false,
    isLoading: query.isLoading,
  };
}
