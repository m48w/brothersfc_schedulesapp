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

export async function updatePasswordWithCurrentPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    throw new AuthError("Failed to resolve current user.");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (signInError) {
    throw new AuthError("Current password is incorrect.");
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    throw new AuthError("Failed to update password.");
  }

  // Update the password in the public.user table as well
  const { data, error: userTableUpdateError } = await supabase
    .from("user")
    .update({
      password: newPassword,
      updated_at: new Date().toISOString()
    })
    .eq("id", user.id)
    .select();

  if (userTableUpdateError) {
    throw new AuthError("Failed to update password in user table. " + userTableUpdateError.message);
  }

  if (!data || data.length === 0) {
    throw new AuthError("Failed to reflect password update in the user table. RLS update policy might be missing.");
  }
}
