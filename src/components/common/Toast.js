import React, { useEffect, useRef } from "react";
import { Animated, Text, StyleSheet, TouchableOpacity, Platform, View, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "../../utils/responsive";

const TOAST_TYPES = {
  success: {
    backgroundColor: "#48BB78",
    icon: "checkmark-circle",
    iconColor: "#fff",
    lightBackgroundColor: "#F0FFF4",
    lightIconColor: "#48BB78",
  },
  error: {
    backgroundColor: "#FF3B30",
    icon: "close-circle",
    iconColor: "#fff",
    lightBackgroundColor: "#FFF5F5",
    lightIconColor: "#FF3B30",
  },
  info: {
    backgroundColor: "#2196F3",
    icon: "information-circle",
    iconColor: "#fff",
    lightBackgroundColor: "#F0F8FF",
    lightIconColor: "#2196F3",
  },
  warning: {
    backgroundColor: "#FF9800",
    icon: "warning",
    iconColor: "#fff",
    lightBackgroundColor: "#FFF8F0",
    lightIconColor: "#FF9800",
  },
  loading: {
    backgroundColor: "#333",
    icon: "hourglass",
    iconColor: "#48BB78",
    lightBackgroundColor: "#F5F5F5",
    lightIconColor: "#333",
  },
};

export default function Toast({ 
  message, 
  type = "info", 
  visible = false, 
  duration = 3000, 
  onHide,
  variant = "filled", // "filled" or "light"
}) {
  const { rs, nz } = useResponsive();
  
  const insets = useSafeAreaInsets();
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible && message) {
      // Show toast with spring animation
      Animated.parallel([
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
      ]).start();

      // Auto hide after duration (except loading)
      if (type !== "loading") {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, message]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  if (!message) return null;

  const toastStyle = TOAST_TYPES[type] || TOAST_TYPES.info;
  
  // Status bar height handling
  const statusBarHeight = Platform.OS === "ios" 
    ? insets?.top || 47 
    : StatusBar.currentHeight || 24;
  
  // Positioning - Account for status bar
  const topPosition = statusBarHeight + rs(8);
  
  // Single sizes
  const horizontalMargin = rs(20);
  const iconSize = rs(24);
  const closeIconSize = rs(20);
  const padding = rs(14);
  const paddingHorizontal = rs(18);
  const borderRadius = rs(12);
  const gap = rs(10);
  
  // Typography
  const fontSize = nz(15);
  const lineHeight = fontSize * 1.4;
  
  // Colors based on variant
  const bgColor = variant === "light" 
    ? toastStyle.lightBackgroundColor 
    : toastStyle.backgroundColor;
  const iconColor = variant === "light" 
    ? toastStyle.lightIconColor 
    : toastStyle.iconColor;
  const textColor = variant === "light" ? "#333" : "#fff";
  const closeColor = variant === "light" 
    ? "rgba(0,0,0,0.5)" 
    : "rgba(255,255,255,0.7)";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          opacity,
          transform: [
            { translateY },
            { scale },
          ],
          top: topPosition,
          left: horizontalMargin,
          right: horizontalMargin,
          borderRadius,
          paddingVertical: padding,
          paddingHorizontal: paddingHorizontal,
        },
      ]}
      pointerEvents={visible ? "auto" : "none"}
      importantForAccessibility="yes"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Ionicons
          name={toastStyle.icon}
          size={iconSize}
          color={iconColor}
          style={[styles.icon, { marginRight: gap }]}
        />
        <Text 
          style={[
            styles.message, 
            { 
              fontSize,
              lineHeight,
              color: textColor,
              marginRight: gap,
            }
          ]} 
          numberOfLines={3}
        >
          {message}
        </Text>
        <TouchableOpacity 
          onPress={hideToast} 
          style={[styles.closeButton, { padding: rs(4) }]}
          hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}
          accessibilityLabel="Close notification"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={closeIconSize} color={closeColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontWeight: "500",
  },
  closeButton: {
    flexShrink: 0,
  },
});