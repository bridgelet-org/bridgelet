import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SESSION_EXPIRY_KEY = 'session_expiry';
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const sessionUtils = {
  async saveSession(token: string, user: any) {
    const expiry = Date.now() + DEFAULT_EXPIRY_MS;
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
    await AsyncStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
  },

  async getSession() {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const userJson = await SecureStore.getItemAsync(USER_DATA_KEY);
    const expiry = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);

    if (!token || !userJson || !expiry) return null;

    const expiryTime = parseInt(expiry, 10);
    if (Date.now() > expiryTime) {
      await this.clearSession();
      return null;
    }

    return {
      token,
      user: JSON.parse(userJson),
      expiresAt: expiryTime,
    };
  },

  async clearSession() {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
  },

  isExpired(expiryTime: number | null): boolean {
    if (!expiryTime) return true;
    return Date.now() > expiryTime;
  },
};
