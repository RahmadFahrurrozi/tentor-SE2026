import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthError } from "@supabase/supabase-js";
import { useAuthStore } from "@/store/auth-store";
import { authService } from "@/services/auth.service";
import { profileService } from "@/services/profile.service";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(4, "Password minimal 4 karakter"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

interface UseAuthOptions {
  disableRedirect?: boolean;
}

export const useAuth = (options?: UseAuthOptions) => {
  const navigate = useNavigate();
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      setLoading(true);
      const data = await authService.login(values.email, values.password);
      const profile = await profileService.getById(data.user.id);
      return { session: data.session, profile, user: data.user };
    },
    onSuccess: ({ session, profile }) => {
      setAuth(session, profile);
      toast.success("Login Berhasil!", {
        description: `Selamat datang, ${profile.full_name ?? profile.email}`,
      });
      if (!options?.disableRedirect) {
        navigate(profile.role === "admin" ? "/admin" : "/users");
      }
    },
    onError: (error) => {
      const message =
        error instanceof AuthError
          ? error.message
          : "Email atau password salah";
      toast.error("Login Gagal", { description: message });
      console.error("Login Error:", error);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authService.logout();
    },
    onSuccess: () => {
      clearAuth();
      if (!options?.disableRedirect) {
        navigate("/login");
      }
      toast.info("Anda telah logout");
    },
    onError: (error) => {
      const message =
        error instanceof AuthError ? error.message : "Terjadi kesalahan";
      toast.error("Logout Gagal", { description: message });
    },
  });

  return {
    form,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
};
