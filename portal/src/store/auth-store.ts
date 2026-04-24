/**
 * auth-store.ts
 *
 * Fix: tambah persist middleware dari zustand agar session survive page refresh.
 *
 * Sebelumnya store reset ke null setiap refresh → AuthGuard baca null →
 * redirect ke /login, padahal Supabase session masih valid di localStorage.
 *
 * Dengan persist, store di-rehydrate dari localStorage saat app load,
 * jadi AuthGuard langsung dapat session tanpa perlu tunggu getSession() async.
 *
 * Yang di-persist: hanya session + profile (bukan isLoading).
 * user di-derive dari session.user supaya tidak double-store.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: "bspatial-auth", // key di localStorage
      // Hanya persist yang perlu, skip isLoading
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
        user: state.user,
      }),
    },
  ),
);
