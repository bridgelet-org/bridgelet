export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpiresAt: number | null;
}

export interface AuthContextType extends AuthState {
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}
