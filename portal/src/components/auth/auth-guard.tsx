/**
 * auth-guard.tsx
 *
 * Fix race condition antara Zustand rehydration dan async getSession().
 *
 * Problem sebelumnya:
 * - Store di-rehydrate dari localStorage (sync) → session ada
 * - Tapi AuthGuard juga panggil getSession() async
 * - Selama async belum selesai, isInitializing=true → spinner
 * - Kalau ada timing issue, session sempat null → redirect /login
 *
 * Fix:
 * - Cek store dulu (hasil rehydrate dari localStorage)
 * - Kalau sudah ada session di store → langsung render, skip spinner
 * - getSession() tetap dipanggil untuk validasi token masih valid
 *   tapi dilakukan di background, bukan blocking render
 * - onAuthStateChange tetap jaga jika token expired di tengah jalan
 */

import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase";
import { profileService } from "@/services/profile.service";

export function AuthGuard({ allowedRoles }: { allowedRoles?: string[] }) {
  const { session, profile, setAuth, clearAuth } = useAuthStore();
  const location = useLocation();

  // isInitializing hanya true saat pertama load DAN store kosong (belum ada data)
  // Kalau store sudah ada session (dari persist), langsung false
  const [isInitializing, setIsInitializing] = useState(!session);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession?.user) {
          // Session masih valid di Supabase
          // Fetch profile kalau belum ada (misalnya pertama login atau store corrupt)
          try {
            const userProfile = await profileService.getById(
              currentSession.user.id,
            );
            setAuth(currentSession, userProfile);
          } catch {
            setAuth(currentSession, profile || null);
          }
        } else {
          // Supabase tidak punya session valid → clear store
          clearAuth();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    }

    // Kalau store sudah ada session, validasi di background (non-blocking)
    if (session) {
      // Langsung render dulu, validasi belakangan
      setIsInitializing(false);
      initializeAuth(); // background check
    } else {
      // Store kosong, perlu async check dulu sebelum render
      initializeAuth();
    }

    // Subscribe untuk handle token expired / logout dari tab lain
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === "SIGNED_IN" && currentSession) {
        try {
          const userProfile = await profileService.getById(
            currentSession.user.id,
          );
          setAuth(currentSession, userProfile);
        } catch {
          setAuth(currentSession, null);
        }
      } else if (event === "SIGNED_OUT") {
        clearAuth();
      } else if (event === "TOKEN_REFRESHED" && currentSession) {
        // Token di-refresh otomatis oleh Supabase — update store
        setAuth(currentSession, profile);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!profile || !allowedRoles.includes(profile.role ?? "")) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
