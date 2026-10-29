import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  nationality?: string | null;
  tastePreferences?: any;
  dietaryRestrictions?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateOnboarding: (nationality: string, tastePreferences: any, dietaryRestrictions: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      updateOnboarding: (nationality, tastePreferences, dietaryRestrictions) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, nationality, tastePreferences, dietaryRestrictions }
            : null,
        })),
    }),
    {
      name: 'vft-auth-storage',
    }
  )
);
