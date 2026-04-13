export type UserRole = "admin" | "player";

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
}
