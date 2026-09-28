import type { Role } from '../constants/roles';
export type User = {
  id: string;
  mobile?: string;
  role: Role;
  fullName?: string;
  name?: string;
  // Actual field name returned by the backend's user mapper (mapUserRow -> displayName, from
  // the `users.display_name` column) — the authoritative name source for non-player workspaces
  // (organizer/admin), which have no player_profile to draw a name from.
  displayName?: string;
  isActive?: boolean;
  playerProfile?: { id: string; playerCode?: string } | null;
};
export type Session = { accessToken: string; user: User };
