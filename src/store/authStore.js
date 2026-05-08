import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,

      login: (user, token) => {
        set({
          user,
          token,
          isLoggedIn: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isLoggedIn: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      isAuthenticated: () => {
        const state = get();
        return state.isLoggedIn && !!state.token && !!state.user;
      },

      getAuthHeaders: () => {
        const state = get();
        return {
          Authorization: `Bearer ${state.token}`,
          "Content-Type": "application/json",
        };
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
      
     
    }
  )
);

export default useAuthStore;