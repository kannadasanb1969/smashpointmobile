import * as SecureStore from 'expo-secure-store';
const TOKEN_KEY = 'smashpoint.access-token';
const WORKSPACE_KEY = 'smashpoint.active-workspace';
export const secureStorage = {
  getAccessToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setAccessToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  removeAccessToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
  getWorkspace: () => SecureStore.getItemAsync(WORKSPACE_KEY),
  setWorkspace: (workspace: 'PLAYER' | 'ORGANIZER' | 'ADMIN') =>
    SecureStore.setItemAsync(WORKSPACE_KEY, workspace),
  removeWorkspace: () => SecureStore.deleteItemAsync(WORKSPACE_KEY),
};
