import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoggedIn: false,

      // Login action
      login: (user, token) => {
        console.log("🏪 Store: Login - User:", user?.fullname);
        set({
          user,
          token,
          isLoggedIn: true,
        });
      },

      // Logout action
      logout: () => {
        console.log("🏪 Store: Logout");
        set({
          user: null,
          token: null,
          isLoggedIn: false,
        });
      },

      // Update user profile
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      // Check if authenticated
      isAuthenticated: () => {
        const state = get();
        return state.isLoggedIn && !!state.token && !!state.user;
      },

      // Get auth headers for API calls
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
      
      // Only persist these fields
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
      }),
      
     
    }
  )
);

export default useAuthStore;