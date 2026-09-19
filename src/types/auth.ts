import type { Role } from '../constants/roles';
export type User = {
  id: string;
  mobile?: string;
  role: Role;
  fullName?: string;
  name?: string;
  isActive?: boolean;
  playerProfile?: { id: string; playerCode?: string } | null;
};
export type Session = { accessToken: string; user: User };
