import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = "https://cjefigpeozlfnleutuok.supabase.co";
const supabaseAnonKey = "sb_publishable_HxYFf_LVHWun2YROsD1GKA_arWvs8MP";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
