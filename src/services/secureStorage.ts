import * as SecureStore from 'expo-secure-store';
const TOKEN_KEY = 'smashpoint.access-token';
export const secureStorage = { getAccessToken: () => SecureStore.getItemAsync(TOKEN_KEY), setAccessToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token), removeAccessToken: () => SecureStore.deleteItemAsync(TOKEN_KEY) };
