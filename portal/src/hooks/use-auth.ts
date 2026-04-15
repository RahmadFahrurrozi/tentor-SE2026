import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
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
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const login = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      // Ambil data profile dari tabel profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      // Update global state
      setAuth(data.session, profile);

      toast.success("Login Berhasil!", {
        description: `Selamat datang kembali, ${profile.full_name || profile.email}`,
      });

      // Redirect berdasarkan role
      if (profile.role === "admin") {
        navigate("/admin"); // Sesuaikan route admin
      } else {
        navigate("/users"); // Default ke users dulu atau /petugas nanti
      }
    } catch (error: any) {
      toast.error("Login Gagal", {
        description: error.message || "Email atau password salah",
      });
      console.error("Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      clearAuth();
      navigate("/login");
      toast.info("Anda telah logout");
    } catch (error: any) {
      toast.error("Logout Gagal", {
        description: error.message,
      });
    }
  };

  return {
    form,
    login,
    logout,
  };
};
