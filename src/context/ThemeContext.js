import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const themes = {
  dark: {
    background: "#1a1a2e",
    surface: "#16213e",
    card: "#0f3460",
    text: "#FFFFFF",
    textSecondary: "#AAAAAA",
    textMuted: "#666666",
    border: "rgba(255,255,255,0.05)",
    green: "#48BB78",
    greenBg: "rgba(72,187,120,0.15)",
    red: "#FF3B30",
    redBg: "rgba(255,59,48,0.1)",
    blue: "#2196F3",
    blueBg: "rgba(33,150,243,0.15)",
    teal: "#4ECDC4",
    tealBg: "rgba(78,205,196,0.15)",
    purple: "#9C27B0",
    purpleBg: "rgba(156,39,176,0.15)",
    orange: "#FF9800",
    orangeBg: "rgba(255,152,0,0.15)",
    iconBg: "rgba(255,255,255,0.1)",
    inputBg: "#1a1a2e",
    inputBorder: "rgba(255,255,255,0.1)",
    statusBar: "light-content",
  },
  light: {
    background: "#FFFFFF",
    surface: "#F5F5F5",
    card: "#FFFFFF",
    text: "#1a1a2e",
    textSecondary: "#666666",
    textMuted: "#999999",
    border: "rgba(0,0,0,0.05)",
    green: "#48BB78",
    greenBg: "rgba(72,187,120,0.1)",
    red: "#FF3B30",
    redBg: "rgba(255,59,48,0.05)",
    blue: "#2196F3",
    blueBg: "rgba(33,150,243,0.1)",
    teal: "#4ECDC4",
    tealBg: "rgba(78,205,196,0.1)",
    purple: "#9C27B0",
    purpleBg: "rgba(156,39,176,0.1)",
    orange: "#FF9800",
    orangeBg: "rgba(255,152,0,0.1)",
    iconBg: "rgba(0,0,0,0.05)",
    inputBg: "#F5F5F5",
    inputBorder: "#E0E0E0",
    statusBar: "dark-content",
  },
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedThemeMode = await AsyncStorage.getItem("themeMode");
      if (savedThemeMode !== null) {
        setThemeMode(savedThemeMode);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem("themeMode", mode);
    } catch (error) {
    }
  };

  console.log(systemColorScheme,"asdsad",themeMode);

  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  const theme = isDark ? themes.dark : themes.light;

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDark, 
      themeMode,
      setTheme,
      toggleTheme: () => setTheme(isDark ? 'light' : 'dark')
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};