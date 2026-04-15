import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  setAuth: (session: Session | null, profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  setAuth: (session, profile) =>
    set({
      session,
      user: session?.user ?? null,
      profile,
      isLoading: false,
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  clearAuth: () =>
    set({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
    }),
}));
