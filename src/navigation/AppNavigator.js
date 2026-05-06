import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "../screens/auth/WelcomeScreen";
import BottomTabNavigator from "../components/common/BottomTabNavigator";

import useAuthStore from "../store/authStore";
import AuthService from "../api/apiService";
import ChatSupportScreen from "../screens/chat/ChatSupportScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const isAuthenticated = await AuthService.initializeAuth();
      if (isAuthenticated) console.log("✅ User is authenticated");
    } catch (error) {
      console.log("❌ Auth initialization error:", error);
      logout();
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f0f1a" }}>
        <ActivityIndicator size="large" color="#48BB78" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#0f0f1a" },
        animationEnabled: true,
      }}
    >
      {!isLoggedIn ? (
        // ── Unauthenticated Screens ───────────────────────────────────────
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen}
          options={{ gestureEnabled: false }}
        />
      ) : (
        // ── Authenticated Screens ─────────────────────────────────────────
        <>
          <Stack.Screen 
            name="MainTabs" 
            component={BottomTabNavigator}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="ChatSupport"
            component={ChatSupportScreen}
            options={{ 
              gestureEnabled: true,
              animationEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}