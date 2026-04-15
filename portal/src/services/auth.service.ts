import { supabase } from "@/lib/supabase";
import { AuthError } from "@supabase/supabase-js";

export const authService = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw `Failed Login ${error.message}`;
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw `Failed Logout ${error.message}`;
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw `Failed Get Session ${error.message}`;
    return data;
  },
};
