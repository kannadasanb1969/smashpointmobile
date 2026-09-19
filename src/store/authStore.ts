import { create } from 'zustand';
import type { User } from '../types/auth';
import { secureStorage } from '../services/secureStorage';
import { startupDiagnostic, withStartupTimeout } from '../utils/startupDiagnostics';
export type Workspace = 'PLAYER' | 'ORGANIZER' | 'ADMIN';
type AuthState = {
  accessToken: string | null;
  user: User | null;
  activeWorkspace: Workspace | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionMessage: string | null;
  restoreSession: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
  setWorkspace: (workspace: Workspace) => Promise<void>;
  clearSession: () => Promise<void>;
  expireSession: () => Promise<void>;
};
function tokenUser(token: string): User | null {
  try {
    const part = token.split('.')[0];
    const json = JSON.parse(globalThis.atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (
      typeof json.sub !== 'string' ||
      typeof json.role !== 'string' ||
      (typeof json.exp === 'number' && json.exp <= Math.floor(Date.now() / 1000))
    )
      return null;
    return { id: json.sub, role: json.role };
  } catch {
    return null;
  }
}
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  activeWorkspace: null,
  isAuthenticated: false,
  isInitializing: true,
  sessionMessage: null,
  restoreSession: async () => {
    startupDiagnostic('AUTH_RESTORE_START');
    try {
      const token = await withStartupTimeout(secureStorage.getAccessToken());
      const savedWorkspace = await withStartupTimeout(secureStorage.getWorkspace());
      const user = token ? tokenUser(token) : null;
      const activeWorkspace =
        savedWorkspace === 'PLAYER' || savedWorkspace === 'ORGANIZER' || savedWorkspace === 'ADMIN'
          ? savedWorkspace
          : null;
      set({
        accessToken: user ? token : null,
        user,
        activeWorkspace: user ? activeWorkspace : null,
        isAuthenticated: Boolean(token && user),
        isInitializing: false,
        sessionMessage: token && !user ? 'Your session expired. Please log in again.' : null,
      });
      startupDiagnostic('AUTH_RESTORE_SUCCESS');
    } catch {
      set({
        accessToken: null,
        user: null,
        activeWorkspace: null,
        isAuthenticated: false,
        isInitializing: false,
        sessionMessage: null,
      });
      startupDiagnostic('AUTH_RESTORE_FAIL');
    }
  },
  setSession: async (accessToken, user) => {
    await secureStorage.setAccessToken(accessToken);
    set({ accessToken, user, isAuthenticated: true, isInitializing: false, sessionMessage: null });
  },
  setWorkspace: async (activeWorkspace) => {
    await secureStorage.setWorkspace(activeWorkspace);
    set({ activeWorkspace });
  },
  clearSession: async () => {
    await Promise.all([secureStorage.removeAccessToken(), secureStorage.removeWorkspace()]);
    set({
      accessToken: null,
      user: null,
      activeWorkspace: null,
      isAuthenticated: false,
      sessionMessage: null,
    });
  },
  expireSession: async () => {
    await Promise.all([secureStorage.removeAccessToken(), secureStorage.removeWorkspace()]);
    set({
      accessToken: null,
      user: null,
      activeWorkspace: null,
      isAuthenticated: false,
      sessionMessage: 'Your session expired. Please log in again.',
    });
  },
}));
