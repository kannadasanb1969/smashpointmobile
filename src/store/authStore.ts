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
  setAccessSession: (token: string, refreshToken: string, user: User) => Promise<void>;
  setWorkspace: (workspace: Workspace) => Promise<void>;
  clearSession: () => Promise<void>;
  expireSession: (reason?: string) => Promise<void>;
};
function tokenUser(token: string, allowExpired = false): User | null {
  try {
    const part = token.split('.')[0];
    const json = JSON.parse(globalThis.atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    if (
      typeof json.sub !== 'string' ||
      typeof json.role !== 'string' ||
      (!allowExpired && typeof json.exp === 'number' && json.exp <= Math.floor(Date.now() / 1000))
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
      const refreshToken = await withStartupTimeout(secureStorage.getRefreshToken());
      const savedWorkspace = await withStartupTimeout(secureStorage.getWorkspace());
      let user = token ? tokenUser(token, true) : null;
      let accessToken = user ? token : null;
      if (!user && refreshToken) {
        startupDiagnostic('AUTH_RESTORE_REFRESH_REQUIRED');
        // The API client owns refresh/retry; startup keeps the persisted session
        // recoverable and the first authenticated request will renew it.
      }
      startupDiagnostic('AUTH_RESTORE_SUCCESS', {
        storedSessionFound: Boolean(token),
        authenticatedUserRestored: Boolean(user),
        tokenValid: Boolean(token && user),
        workspaceFound: Boolean(savedWorkspace),
      });
      const activeWorkspace =
        savedWorkspace === 'PLAYER' || savedWorkspace === 'ORGANIZER' || savedWorkspace === 'ADMIN'
          ? savedWorkspace
          : null;
      set({
        accessToken,
        user,
        activeWorkspace: user ? activeWorkspace : null,
        isAuthenticated: Boolean((accessToken || refreshToken) && user),
        isInitializing: false,
        sessionMessage: token && !user ? 'Your session expired. Please log in again.' : null,
      });
    } catch {
      set({
        accessToken: null,
        user: null,
        activeWorkspace: null,
        isAuthenticated: false,
        isInitializing: false,
        sessionMessage: null,
      });
      startupDiagnostic('AUTH_RESTORE_FAIL', { reason: 'STORAGE_OR_STARTUP_TIMEOUT' });
    }
  },
  setSession: async (accessToken, user) => {
    await secureStorage.setAccessToken(accessToken);
    startupDiagnostic('AUTH_SESSION_STORED', { userId: user.id, role: user.role });
    set({ accessToken, user, isAuthenticated: true, isInitializing: false, sessionMessage: null });
  },
  setAccessSession: async (accessToken, refreshToken, user) => {
    await Promise.all([secureStorage.setAccessToken(accessToken), secureStorage.setRefreshToken(refreshToken)]);
    set({ accessToken, user, isAuthenticated: true, isInitializing: false, sessionMessage: null });
  },
  setWorkspace: async (activeWorkspace) => {
    await secureStorage.setWorkspace(activeWorkspace);
    set({ activeWorkspace });
  },
  clearSession: async () => {
    await Promise.all([secureStorage.removeAccessToken(), secureStorage.removeRefreshToken(), secureStorage.removeWorkspace()]);
    if (__DEV__) console.info('[Auth] logout triggered', { reason: 'USER_REQUESTED' });
    set({
      accessToken: null,
      user: null,
      activeWorkspace: null,
      isAuthenticated: false,
      sessionMessage: null,
    });
  },
  expireSession: async (reason = 'AUTHENTICATION_FAILURE') => {
    await Promise.all([secureStorage.removeAccessToken(), secureStorage.removeRefreshToken(), secureStorage.removeWorkspace()]);
    if (__DEV__) console.info('[Auth] logout triggered', { reason });
    set({
      accessToken: null,
      user: null,
      activeWorkspace: null,
      isAuthenticated: false,
      sessionMessage: 'Your session expired. Please log in again.',
    });
  },
}));
