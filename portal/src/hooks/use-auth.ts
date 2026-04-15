import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthError } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(4, "Password minimal 4 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const useAuth = () => {
  const navigate = useNavigate();
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const data = await authService.login(values.email, values.password);
      const profile = await profileService.getById(data.user.id);

      setAuth(data.session, profile);

      toast.success("Login Berhasil!", {
        description: `Selamat datang, ${profile.full_name ?? profile.email}`,
      });

      navigate(profile.role === "admin" ? "/admin" : "/users");
    } catch (error) {
      const message =
        error instanceof AuthError
          ? error.message
          : "Email atau password salah";

      toast.error("Login Gagal", { description: message });
      console.error("Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      clearAuth();
      navigate("/login");
      toast.info("Anda telah logout");
    } catch (error) {
      const message =
        error instanceof AuthError ? error.message : "Terjadi kesalahan";
      toast.error("Logout Gagal", { description: message });
    }
  };

  return { form, login, logout };
};
