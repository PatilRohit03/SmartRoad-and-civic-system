import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  setAuth: (user, token) => {
    localStorage.setItem('smartroad_token', token);
    localStorage.setItem('smartroad_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('smartroad_token');
    localStorage.removeItem('smartroad_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  loadFromStorage: () => {
    const token = localStorage.getItem('smartroad_token');
    const userStr = localStorage.getItem('smartroad_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },
}));
