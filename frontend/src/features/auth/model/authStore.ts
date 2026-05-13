import { create } from "zustand";
import type { UserInfo } from "@/shared/types/api";

type AuthState = {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserInfo, accessToken: string, refreshToken: string) => void;
  updateUser: (patch: Partial<UserInfo>) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("accessToken"),
  isLoading: true,

  setUser: (user, accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  updateUser: (patch) => set((state) => ({
    user: state.user ? { ...state.user, ...patch } : state.user,
  })),

  clearAuth: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
