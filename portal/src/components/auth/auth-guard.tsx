import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth-store";
import { supabase } from "@/lib/supabase";

export function AuthGuard({ allowedRoles }: { allowedRoles?: string[] }) {
  const { session, profile, setAuth, isLoading, setLoading } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setLoading(true);
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession?.user) {
          // If we have a session but no profile yet, fetch it
          if (!profile) {
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", currentSession.user.id)
              .single();

            if (mounted) {
              setAuth(currentSession, userProfile);
            }
          }
        } else if (mounted) {
          setAuth(null, null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) {
          setIsInitializing(false);
          setLoading(false);
        }
      }
    }

    if (isInitializing) {
      initializeAuth();
    }

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (mounted && event === "SIGNED_IN" && currentSession) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentSession.user.id)
          .single();
        setAuth(currentSession, userProfile);
      } else if (mounted && event === "SIGNED_OUT") {
        setAuth(null, null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Show loading state while checking session
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check if roles are specified
  if (allowedRoles && allowedRoles.length > 0 && profile) {
    if (!allowedRoles.includes(profile.role ?? "")) {
      // User doesn't have required role
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
