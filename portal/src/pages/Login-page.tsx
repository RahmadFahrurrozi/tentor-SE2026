"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/use-auth";
import { LoginIllustration } from "@/components/auth/login-illustration";

// ─── FLAG KEY ──────────────────────────────────────────────────────────────────
// Dipakai untuk menandai bahwa user baru saja logout — skip auto-SSO sekali
const JUST_LOGGED_OUT_KEY = "bspatial_just_logged_out";

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Sync dengan useAuth, disable default redirect
  const { form, login, isLoggingIn } = useAuth({ disableRedirect: true });

  // const watchEmail = form.watch("email");
  const watchPassword = form.watch("password");

  // ── AUTO SSO + LOGOUT HANDLER ────────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);

      // CASE 1: Streamlit redirect ke ?logout=true
      if (urlParams.get("logout") === "true") {
        // Bersihkan URL dulu
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        // Set flag "baru logout" di sessionStorage agar auto-SSO di-skip
        sessionStorage.setItem(JUST_LOGGED_OUT_KEY, "true");

        // Logout dari Supabase (hapus session browser)
        try {
          await authService.logout();
        } catch (e) {
          console.error("Gagal logout dari Supabase:", e);
        }

        // Selesai — tetap di halaman login, TIDAK lanjut cek session
        return;
      }

      // CASE 2: User baru saja logout, skip auto-SSO sekali ini
      if (sessionStorage.getItem(JUST_LOGGED_OUT_KEY) === "true") {
        // Hapus flag setelah dibaca agar kalau refresh lagi bisa auto-SSO normal
        sessionStorage.removeItem(JUST_LOGGED_OUT_KEY);
        return;
      }

      // CASE 3: Normal load — cek apakah ada Supabase session aktif
      try {
        const data = await authService.getSession();
        if (data?.session?.user) {
          setIsRedirecting(true);
          const otcData = await authService.generateOtc(data.session.user.id);
          window.location.href = `http://localhost:8501/?code=${otcData.token}`;
        }
      } catch (err) {
        // Tidak ada session — tetap di halaman login
      }
    };

    checkSession();
  }, []);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const authData = await login(values);
      setIsRedirecting(true);
      // Generate OTC Token dan redirect
      const otcData = await authService.generateOtc(authData.user.id);
      window.location.href = `http://localhost:8501/?code=${otcData.token}`;
    } catch (err: any) {
      setIsRedirecting(false);
    }
  });

  return (
    <>
      <LoadingOverlay isVisible={isRedirecting} />
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Content Section */}
        <LoginIllustration
          passwordLength={watchPassword.length}
          showPassword={showPassword}
          isTyping={isTyping}
        />

        {/* Right Login Section */}
        <div className="flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-[420px]">
            <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
              <div className="size-8 rounded-lg flex items-center justify-center">
                <img src="/logo.svg" alt="Logo-bps-bwi" className="size-8" />
              </div>
              <span>BPS Kabupaten Banyuwangi</span>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Welcome back!
              </h1>
              <p className="text-muted-foreground text-sm">
                Please enter your details
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="anna@gmail.com"
                  autoComplete="off"
                  {...form.register("email")}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  className="h-12 bg-background border-border/60 focus:border-primary"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...form.register("password")}
                    className="h-12 pr-10 bg-background border-border/60 focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                size="lg"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Signing in..." : "Log in"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{" "}
              <a
                href="#"
                className="text-foreground font-medium hover:underline"
              >
                Contact Admin
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
