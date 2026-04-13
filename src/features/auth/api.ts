import { AuthError } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { UserProfile } from "../../types/auth";

export async function loginWithPassword(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;

  if (!userId) {
    throw new AuthError("Unable to resolve the signed-in user.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw new AuthError("Failed to load user profile.");
  }

  return profile as UserProfile;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AuthError("Failed to logout.");
  }
}
