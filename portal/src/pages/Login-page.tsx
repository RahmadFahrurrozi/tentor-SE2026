/**
 * login-page.tsx
 *
 * Fix utama: pisahkan "logout" dari "kembali ke dashboard".
 *
 * Problem sebelumnya:
 * Streamlit sidebar punya dua tombol berbeda:
 *   - "Kembali ke Dashboard" → redirect ke LOGIN_URL (tanpa flag apapun)
 *   - "Logout"               → redirect ke LOGIN_URL?logout=true
 *
 * Tapi di login page, CASE 3 (auto-SSO) selalu dipanggil setelah logout check.
 * Kalau user klik "Kembali ke Dashboard" (tanpa ?logout), flow masuk ke CASE 3,
 * detect ada session Supabase → generate OTC baru → redirect balik ke Streamlit.
 * Ini BENAR dan harusnya jalan.
 *
 * Masalah sebenarnya: "Kembali ke Dashboard" di Streamlit lo redirect ke
 * LOGIN_URL (portal login), bukan ke Streamlit itu sendiri.
 * Harusnya kalau user sudah login dan klik "Kembali ke Dashboard",
 * generate OTC baru langsung dan redirect ke Streamlit — tidak perlu ke login page.
 *
 * Fix di sini:
 * 1. ?logout=true → logout Supabase + set flag, STOP (tidak generate OTC)
 * 2. ?back=true   → ada session → generate OTC → redirect Streamlit langsung
 * 3. Normal load  → ada session → auto redirect ke Streamlit (SSO)
 *
 * Di Streamlit, ganti tombol "Kembali ke Dashboard":
 *   href = LOGIN_URL?back=true   (bukan ?logout=true)
 *
 * Dan tombol "Logout":
 *   href = LOGIN_URL?logout=true (tetap sama)
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/hooks/use-auth";
import { LoginIllustration } from "@/components/auth/login-illustration";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useNavigate } from "react-router-dom";

const JUST_LOGGED_OUT_KEY = "bspatial_just_logged_out";

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const { form, login, isLoggingIn } = useAuth({ disableRedirect: true });
  const watchPassword = form.watch("password");

  useEffect(() => {
    const checkSession = async () => {
      const urlParams = new URLSearchParams(window.location.search);

      // ── CASE 1: ?logout=true ────────────────────────────────────────────────
      if (urlParams.get("logout") === "true") {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        sessionStorage.setItem(JUST_LOGGED_OUT_KEY, "true");
        try {
          await authService.logout();
        } catch (e) {
          console.error("Gagal logout dari Supabase:", e);
        }
        return;
      }

      // ── CASE 2: ?back=true ──────────────────────────────────────────────────
      if (urlParams.get("back") === "true") {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        try {
          const data = await authService.getSession();
          if (data?.session?.user) {
            setIsRedirecting(true);
            navigate("/dashboard");
          }
        } catch (e) {
          console.error("Gagal redirect:", e);
        }
        return;
      }

      // ── CASE 3: User baru logout, skip auto-SSO sekali ───────────────────────
      if (sessionStorage.getItem(JUST_LOGGED_OUT_KEY) === "true") {
        sessionStorage.removeItem(JUST_LOGGED_OUT_KEY);
        return;
      }

      // ── CASE 4: Normal load — cek session aktif untuk redirect langsung ─────────
      try {
        const data = await authService.getSession();
        if (data?.session?.user) {
          setIsRedirecting(true);
          navigate("/dashboard");
        }
      } catch {
        // Tidak ada session
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values);
      setIsRedirecting(true);
      navigate("/dashboard");
    } catch {
      setIsRedirecting(false);
    }
  });

  return (
    <>
      <LoadingOverlay isVisible={isRedirecting} />
      <div className="fixed top-6 right-6 z-50">
        <ModeToggle />
      </div>
      <div className="min-h-screen grid lg:grid-cols-2">
        <LoginIllustration
          passwordLength={watchPassword.length}
          showPassword={showPassword}
          isTyping={isTyping}
        />

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
                disabled={isLoggingIn || isRedirecting}
              >
                {isLoggingIn ? "Signing in..." : "Log in"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{" "}
              <a
                href="https://wa.me/+6285237923152"
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
