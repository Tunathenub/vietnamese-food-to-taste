import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api-client';
import { useCartStore } from './cart-store';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  phone?: string | null;
  nationality?: string | null;
  tastePreferences?: any;
  dietaryRestrictions?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateOnboarding: (nationality: string, tastePreferences: any, dietaryRestrictions: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      login: (user, token) => set({ user, token: token ?? null }),
      logout: async () => {
        try {
          await api.post('/auth/logout', {});
        } catch {
          // ignore
        }
        set({ user: null, token: null });
        useCartStore.getState().clearCart();
      },
      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get<{ user: User }>('/auth/me');
          if (res.data?.user) {
            set({ user: res.data.user, isLoading: false });
          } else {
            set({ user: null, token: null, isLoading: false });
          }
        } catch {
          set({ user: null, token: null, isLoading: false });
        }
      },
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
