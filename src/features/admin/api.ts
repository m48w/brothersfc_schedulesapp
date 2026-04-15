import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export interface AppUser {
  id: string;
  full_name: string;
  role: "admin" | "player";
  player_id: string | null;
  is_active_player: boolean;
}

export interface LocationMaster {
  id: number;
  facility_name: string;
  is_active: boolean;
}

export interface CategoryMaster {
  id: number;
  category_code: "practice" | "match" | "event";
  category_name: string;
  is_active: boolean;
  display_order: number;
}

export interface ScheduleItem {
  id: number;
  schedule_date: string;
  start_time: string | null;
  end_time: string | null;
  category_id: number;
  location_id: number | null;
  description: string | null;
}

export interface AttendanceItem {
  id: number;
  schedule_id: number;
  user_id: string;
  attendance_date: string;
  status: "present" | "absent" | "late";
  note: string | null;
}

function throwOnError(error: PostgrestError | null, fallbackMessage: string): void {
  if (error) {
    throw new Error(`${fallbackMessage}: ${error.message}`);
  }
}

export async function fetchUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("user")
    .select("id, full_name, role, player_id, is_active_player")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  throwOnError(error, "Failed to load users");
  return (data ?? []) as AppUser[];
}

export async function fetchLocations(): Promise<LocationMaster[]> {
  const { data, error } = await supabase
    .from("location_master")
    .select("id, facility_name, is_active")
    .order("facility_name", { ascending: true });
  throwOnError(error, "Failed to load locations");
  return (data ?? []) as LocationMaster[];
}

export async function fetchCategories(): Promise<CategoryMaster[]> {
  const { data, error } = await supabase
    .from("category_master")
    .select("id, category_code, category_name, is_active, display_order")
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });
  throwOnError(error, "Failed to load categories");
  return (data ?? []) as CategoryMaster[];
}

export async function fetchSchedules(): Promise<ScheduleItem[]> {
  const { data, error } = await supabase
    .from("schedule")
    .select("id, schedule_date, start_time, end_time, category_id, location_id, description")
    .order("schedule_date", { ascending: true })
    .order("start_time", { ascending: true });
  throwOnError(error, "Failed to load schedules");
  return (data ?? []) as ScheduleItem[];
}

export async function fetchAttendance(): Promise<AttendanceItem[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, schedule_id, user_id, attendance_date, status, note")
    .order("attendance_date", { ascending: true });
  throwOnError(error, "Failed to load attendance");
  return (data ?? []) as AttendanceItem[];
}

export async function upsertSchedule(input: {
  id?: number;
  schedule_date: string;
  start_time: string;
  end_time: string;
  category_id: number;
  location_id: number | null;
  description: string;
  created_by: string;
}): Promise<void> {
  const payload = {
    id: input.id,
    schedule_date: input.schedule_date,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    category_id: input.category_id,
    location_id: input.location_id,
    description: input.description || null,
    created_by: input.created_by,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("schedule").upsert(payload);
  throwOnError(error, "Failed to save schedule");
}

export async function deleteSchedule(id: number): Promise<void> {
  const { error } = await supabase.from("schedule").delete().eq("id", id);
  throwOnError(error, "Failed to delete schedule");
}

export async function upsertAttendance(input: {
  schedule_id: number;
  user_id: string;
  attendance_date: string;
  status: "present" | "absent" | "late";
  note: string;
}): Promise<void> {
  const { error } = await supabase.from("attendance").upsert({
    schedule_id: input.schedule_id,
    user_id: input.user_id,
    attendance_date: input.attendance_date,
    status: input.status,
    note: input.note || null,
    recorded_at: new Date().toISOString()
  });
  throwOnError(error, "Failed to save attendance");
}
