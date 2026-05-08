import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/context/ThemeContext";
import { ToastProvider } from "./src/context/ToastContext";
import AppNavigator from "./src/navigation/AppNavigator";
import AuthService from "./src/api/apiService";
import AppUpdateScreen from "./src/screens/update/AppUpdateScreen";
import { NetworkGuard } from "./src/components/Nointernet";

export default function App() {
  const [versionChecked, setVersionChecked] = useState(false);
  const [needsUpdate,    setNeedsUpdate]    = useState(false);

  useEffect(() => {
    AuthService.matchVersion().then((res) => {
      setNeedsUpdate(res.isVersionMatched);
      setVersionChecked(true);
    });
  }, []);


  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <NetworkGuard>
            {!versionChecked ? null : !needsUpdate ? (
              <AppUpdateScreen />
            ) : (
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            )}
          </NetworkGuard>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}