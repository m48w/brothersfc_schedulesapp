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
    .from("user")
    .select("id, full_name, role, player_id, is_active_player")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw new AuthError("Failed to load user profile.");
  }

  const resolvedProfile = profile as UserProfile;

  if (resolvedProfile.role === "player" && !resolvedProfile.is_active_player) {
    throw new AuthError("This player account is currently inactive.");
  }

  return resolvedProfile;
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AuthError("Failed to logout.");
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user")
    .select("id, full_name, role, player_id, is_active_player")
    .eq("id", user.id)
    .single();

  if (error) {
    throw new AuthError("Failed to load current user profile.");
  }

  return data as UserProfile;
}
