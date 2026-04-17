"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";

// ─── FLAG KEY ──────────────────────────────────────────────────────────────────
// Dipakai untuk menandai bahwa user baru saja logout — skip auto-SSO sekali
const JUST_LOGGED_OUT_KEY = "bspatial_just_logged_out";

// ─── PUPIL & EYEBALL (tidak berubah) ──────────────────────────────────────────
interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY,
}: PupilProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;
    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2),
      maxDistance,
    );
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;
    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(
      Math.sqrt(deltaX ** 2 + deltaY ** 2),
      maxDistance,
    );
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? "2px" : `${size}px`,
        backgroundColor: eyeColor,
        overflow: "hidden",
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )}
    </div>
  );
};

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking effects
  useEffect(() => {
    const scheduleBlink = (setter: (v: boolean) => void) => {
      const t = setTimeout(
        () => {
          setter(true);
          setTimeout(() => {
            setter(false);
            scheduleBlink(setter);
          }, 150);
        },
        Math.random() * 4000 + 3000,
      );
      return t;
    };
    const t1 = scheduleBlink(setIsPurpleBlinking);
    const t2 = scheduleBlink(setIsBlackBlinking);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(
        () => {
          setIsPurplePeeking(true);
          setTimeout(() => setIsPurplePeeking(false), 800);
        },
        Math.random() * 3000 + 2000,
      );
      return () => clearTimeout(t);
    } else {
      setIsPurplePeeking(false);
    }
  }, [password, showPassword, isPurplePeeking]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const authData = await authService.login(email, password);
      if (!authData.user) throw new Error("Terjadi kesalahan saat login.");

      toast.success("Login Berhasil!", {
        description: "Mengarahkan ke dashboard...",
      });

      setIsRedirecting(true);
      const otcData = await authService.generateOtc(authData.user.id);
      window.location.href = `http://localhost:8501/?code=${otcData.token}`;
    } catch (err: any) {
      console.error("Login failed:", err);
      const msg = err.message || err.toString();
      const displayMsg = msg.includes("Invalid login credentials")
        ? "Email atau password salah."
        : msg;

      toast.error("Login Gagal", {
        description: displayMsg,
      });

      setError(displayMsg || "Gagal melakukan proses login.");
      setIsRedirecting(false);
      setIsLoading(false);
    }
  };

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));
    return { faceX, faceY, bodySkew };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <>
      <LoadingOverlay isVisible={isRedirecting} />
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Content Section */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-12 text-primary-foreground">
          <div className="relative z-20">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <div className="size-8 rounded-lg flex items-center justify-center">
                <img src="/logo.svg" alt="Logo-bps-bwi" className="size-8" />
              </div>
              <span>BPS Kabupaten Banyuwangi</span>
            </div>
          </div>

          <div className="relative z-20 flex items-end justify-center h-[500px]">
            <div
              className="relative"
              style={{ width: "550px", height: "400px" }}
            >
              {/* Purple character */}
              <div
                ref={purpleRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                  left: "70px",
                  width: "180px",
                  height:
                    isTyping || (password.length > 0 && !showPassword)
                      ? "440px"
                      : "400px",
                  backgroundColor: "#68B92E",
                  borderRadius: "10px 10px 0 0",
                  zIndex: 1,
                  transform:
                    password.length > 0 && showPassword
                      ? `skewX(0deg)`
                      : isTyping || (password.length > 0 && !showPassword)
                        ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                        : `skewX(${purplePos.bodySkew || 0}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <div
                  className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                  style={{
                    left:
                      password.length > 0 && showPassword
                        ? `${20}px`
                        : isLookingAtEachOther
                          ? `${55}px`
                          : `${45 + purplePos.faceX}px`,
                    top:
                      password.length > 0 && showPassword
                        ? `${35}px`
                        : isLookingAtEachOther
                          ? `${65}px`
                          : `${40 + purplePos.faceY}px`,
                  }}
                >
                  {[0, 1].map((i) => (
                    <EyeBall
                      key={i}
                      size={18}
                      pupilSize={7}
                      maxDistance={5}
                      eyeColor="white"
                      pupilColor="#2D2D2D"
                      isBlinking={isPurpleBlinking}
                      forceLookX={
                        password.length > 0 && showPassword
                          ? isPurplePeeking
                            ? 4
                            : -4
                          : isLookingAtEachOther
                            ? 3
                            : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword
                          ? isPurplePeeking
                            ? 5
                            : -4
                          : isLookingAtEachOther
                            ? 4
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Black character */}
              <div
                ref={blackRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                  left: "240px",
                  width: "120px",
                  height: "310px",
                  backgroundColor: "#2D2D2D",
                  borderRadius: "8px 8px 0 0",
                  zIndex: 2,
                  transform:
                    password.length > 0 && showPassword
                      ? `skewX(0deg)`
                      : isLookingAtEachOther
                        ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                        : isTyping || (password.length > 0 && !showPassword)
                          ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                          : `skewX(${blackPos.bodySkew || 0}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <div
                  className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                  style={{
                    left:
                      password.length > 0 && showPassword
                        ? `${10}px`
                        : isLookingAtEachOther
                          ? `${32}px`
                          : `${26 + blackPos.faceX}px`,
                    top:
                      password.length > 0 && showPassword
                        ? `${28}px`
                        : isLookingAtEachOther
                          ? `${12}px`
                          : `${32 + blackPos.faceY}px`,
                  }}
                >
                  {[0, 1].map((i) => (
                    <EyeBall
                      key={i}
                      size={16}
                      pupilSize={6}
                      maxDistance={4}
                      eyeColor="white"
                      pupilColor="#2D2D2D"
                      isBlinking={isBlackBlinking}
                      forceLookX={
                        password.length > 0 && showPassword
                          ? -4
                          : isLookingAtEachOther
                            ? 0
                            : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword
                          ? -4
                          : isLookingAtEachOther
                            ? -4
                            : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Orange character */}
              <div
                ref={orangeRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                  left: "0px",
                  width: "240px",
                  height: "200px",
                  zIndex: 3,
                  backgroundColor: "#EB891B",
                  borderRadius: "120px 120px 0 0",
                  transform:
                    password.length > 0 && showPassword
                      ? `skewX(0deg)`
                      : `skewX(${orangePos.bodySkew || 0}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <div
                  className="absolute flex gap-8 transition-all duration-200 ease-out"
                  style={{
                    left:
                      password.length > 0 && showPassword
                        ? `${50}px`
                        : `${82 + (orangePos.faceX || 0)}px`,
                    top:
                      password.length > 0 && showPassword
                        ? `${85}px`
                        : `${90 + (orangePos.faceY || 0)}px`,
                  }}
                >
                  {[0, 1].map((i) => (
                    <Pupil
                      key={i}
                      size={12}
                      maxDistance={5}
                      pupilColor="#2D2D2D"
                      forceLookX={
                        password.length > 0 && showPassword ? -5 : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword ? -4 : undefined
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Yellow character */}
              <div
                ref={yellowRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                  left: "310px",
                  width: "140px",
                  height: "230px",
                  backgroundColor: "#E8D754",
                  borderRadius: "70px 70px 0 0",
                  zIndex: 4,
                  transform:
                    password.length > 0 && showPassword
                      ? `skewX(0deg)`
                      : `skewX(${yellowPos.bodySkew || 0}deg)`,
                  transformOrigin: "bottom center",
                }}
              >
                <div
                  className="absolute flex gap-6 transition-all duration-200 ease-out"
                  style={{
                    left:
                      password.length > 0 && showPassword
                        ? `${20}px`
                        : `${52 + (yellowPos.faceX || 0)}px`,
                    top:
                      password.length > 0 && showPassword
                        ? `${35}px`
                        : `${40 + (yellowPos.faceY || 0)}px`,
                  }}
                >
                  {[0, 1].map((i) => (
                    <Pupil
                      key={i}
                      size={12}
                      maxDistance={5}
                      pupilColor="#2D2D2D"
                      forceLookX={
                        password.length > 0 && showPassword ? -5 : undefined
                      }
                      forceLookY={
                        password.length > 0 && showPassword ? -4 : undefined
                      }
                    />
                  ))}
                </div>
                <div
                  className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                  style={{
                    left:
                      password.length > 0 && showPassword
                        ? `${10}px`
                        : `${40 + (yellowPos.faceX || 0)}px`,
                    top:
                      password.length > 0 && showPassword
                        ? `${88}px`
                        : `${88 + (yellowPos.faceY || 0)}px`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="relative z-20 flex items-center gap-8 text-sm text-primary-foreground/60">
            <a
              href="/privacy-policy"
              className="hover:text-primary-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-service"
              className="hover:text-primary-foreground transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="hover:text-primary-foreground transition-colors"
            >
              Contact
            </a>
          </div>

          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-1/4 right-1/4 size-64 bg-primary-foreground/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 size-96 bg-primary-foreground/5 rounded-full blur-3xl" />
        </div>

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
                  value={email}
                  autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  required
                  className="h-12 bg-background border-border/60 focus:border-primary"
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              </div>

              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-100 border rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Log in"}
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
