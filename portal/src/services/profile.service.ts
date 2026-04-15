import { supabase } from "@/lib/supabase";

export const profileService = {
  getById: async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },
};
