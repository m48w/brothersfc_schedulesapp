import { AuthError } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export interface PlayerProfileDetail {
  user_id: string;
  photo_url: string | null;
  jersey_name: string | null;
  back_number: number | null;
  jersey_size: string | null;
  birth_date: string | null;
  nationality: string | null;
  position: string | null;
  current_status: boolean;
  remark: string | null;
}

export async function fetchPlayerProfile(userId: string): Promise<PlayerProfileDetail | null> {
  const { data, error } = await supabase
    .from("player_profile")
    .select(
      "user_id, photo_url, jersey_name, back_number, jersey_size, birth_date, nationality, position, current_status, remark"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AuthError("Failed to load player profile.");
  }

  return (data as PlayerProfileDetail | null) ?? null;
}

export async function upsertPlayerProfile(input: PlayerProfileDetail): Promise<void> {
  const { error } = await supabase.from("player_profile").upsert({
    user_id: input.user_id,
    photo_url: input.photo_url || null,
    jersey_name: input.jersey_name || null,
    back_number: input.back_number,
    jersey_size: input.jersey_size || null,
    birth_date: input.birth_date || null,
    nationality: input.nationality || null,
    position: input.position || null,
    current_status: input.current_status,
    remark: input.remark || null,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new AuthError("Failed to save player profile.");
  }
}
