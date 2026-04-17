import { supabase } from "@/lib/supabase";

export const authService = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(`Failed Logout ${error.message}`);
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`Failed Get Session ${error.message}`);
    return data;
  },

  generateOtc: async (userId: string) => {
    const { data, error } = await supabase
      .from("otc_tokens")
      .insert({ user_id: userId })
      .select()
      .single();

    if (error) throw new Error(`Failed to generate OTC: ${error.message}`);
    return data;
  },
};
