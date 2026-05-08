import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useResponsive } from "../utils/responsive";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = React.useState(true);
  const [isRetrying, setIsRetrying]   = React.useState(false);

  useEffect(() => {
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  const retry = async () => {
    setIsRetrying(true);
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected && state.isInternetReachable !== false);
    setTimeout(() => setIsRetrying(false), 1000);
  };

  return { isConnected, isRetrying, retry };
}

const AnimatedWifiOff = ({ size, color, rs }) => {
  const bounce = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0,   duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1,  duration: 2000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 2000, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0,  duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const deg = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <Animated.View style={{ transform: [{ translateY: bounce }, { rotate: deg }] }}>
      <View style={{
        width: rs(100),
        height: rs(100),
        borderRadius: rs(50),
        backgroundColor: color + '15',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: color + '30',
      }}>
        <Ionicons name="wifi-outline" size={rs(48)} color={color} style={{ opacity: 0.3 }} />
        {/* Cross slash line */}
        <View style={{
          position: 'absolute',
          width: rs(70),
          height: 2.5,
          backgroundColor: color,
          borderRadius: 2,
          transform: [{ rotate: '-45deg' }],
        }} />
      </View>
    </Animated.View>
  );
};

const DeadSignalBars = ({ color, rs }) => {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const pulse = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    anims.forEach((a, i) => pulse(a, i * 150));
  }, []);

  const heights = [rs(12), rs(18), rs(24)];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: rs(4) }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: rs(6),
            height: heights[i],
            borderRadius: rs(3),
            backgroundColor: color,
            opacity: anim,
          }}
        />
      ))}
    </View>
  );
};

const RetryButton = ({ onPress, isRetrying, C, rs, nz }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spin  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRetrying) {
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 800, useNativeDriver: true })
      ).start();
    } else {
      spin.setValue(0);
    }
  }, [isRetrying]);

  const deg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.accent,
          paddingHorizontal: rs(32),
          paddingVertical: rs(14),
          borderRadius: rs(50),
          gap: rs(10),
          shadowColor: C.accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Animated.View style={{ transform: [{ rotate: deg }] }}>
          <Ionicons
            name={isRetrying ? "sync" : "refresh"}
            size={rs(18)}
            color="#fff"
          />
        </Animated.View>
        <Text style={{ color: '#fff', fontSize: nz(15), fontWeight: '700', letterSpacing: 0.3 }}>
          {isRetrying ? 'Checking...' : 'Try Again'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export function NoInternetScreen({ onRetry, isRetrying }) {
  const { rs, nz }   = useResponsive();
  const { isDark }   = useTheme();
  const insets       = useSafeAreaInsets();

  const fadeIn       = useRef(new Animated.Value(0)).current;
  const slideUp      = useRef(new Animated.Value(40)).current;
  const dot1         = useRef(new Animated.Value(0.3)).current;
  const dot2         = useRef(new Animated.Value(0.3)).current;
  const dot3         = useRef(new Animated.Value(0.3)).current;

  const C = {
    bg:       isDark ? '#0D0F14' : '#F5F6FA',
    card:     isDark ? '#1C1F2E' : '#FFFFFF',
    border:   isDark ? '#2C3347' : '#E8EAF0',
    text:     isDark ? '#E2E6F0' : '#1A1D23',
    textSub:  isDark ? '#8891A4' : '#6B7591',
    textMuted:isDark ? '#4A5168' : '#9EA8BB',
    accent:   isDark ? '#FFB74D' : '#E65100',
    accentBg: isDark ? '#2A1F0F' : '#FFF3EC',
    red:      isDark ? '#EF9A9A' : '#D32F2F',
    dot:      isDark ? '#2C3347' : '#E8EAF0',
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, damping: 14, stiffness: 100, useNativeDriver: true }),
    ]).start();

    const pulseDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    pulseDot(dot1, 0);
    pulseDot(dot2, 200);
    pulseDot(dot3, 400);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.bg}
      />

      {/* ── Background decoration ── */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        {/* Top circle */}
        <View style={{
          position: 'absolute',
          top: -SCREEN_WIDTH * 0.3,
          right: -SCREEN_WIDTH * 0.2,
          width: SCREEN_WIDTH * 0.8,
          height: SCREEN_WIDTH * 0.8,
          borderRadius: SCREEN_WIDTH * 0.4,
          backgroundColor: C.accent + '08',
          borderWidth: 1,
          borderColor: C.accent + '15',
        }} />
        {/* Bottom circle */}
        <View style={{
          position: 'absolute',
          bottom: -SCREEN_WIDTH * 0.4,
          left: -SCREEN_WIDTH * 0.3,
          width: SCREEN_WIDTH * 0.9,
          height: SCREEN_WIDTH * 0.9,
          borderRadius: SCREEN_WIDTH * 0.45,
          backgroundColor: C.red + '06',
          borderWidth: 1,
          borderColor: C.red + '10',
        }} />
      </View>

      <Animated.View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: rs(32),
        paddingBottom: insets.bottom + rs(20),
        opacity: fadeIn,
        transform: [{ translateY: slideUp }],
      }}>

        {/* ── Icon ── */}
        <AnimatedWifiOff size={rs(48)} color={C.accent} rs={rs} />

        {/* ── Bouncing dots ── */}
        <View style={{ flexDirection: 'row', gap: rs(6), marginTop: rs(28), marginBottom: rs(8) }}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={{
                width: rs(7),
                height: rs(7),
                borderRadius: rs(4),
                backgroundColor: C.accent,
                opacity: dot,
              }}
            />
          ))}
        </View>

        {/* ── Dead signal bars ── */}
        <DeadSignalBars color={C.red} rs={rs} />

        {/* ── Text ── */}
        <Text style={{
          fontSize: nz(24),
          fontWeight: '800',
          color: C.text,
          marginTop: rs(28),
          textAlign: 'center',
          letterSpacing: -0.5,
        }}>
          No Internet Connection
        </Text>

        <Text style={{
          fontSize: nz(14),
          color: C.textSub,
          marginTop: rs(10),
          textAlign: 'center',
          lineHeight: nz(22),
          paddingHorizontal: rs(8),
        }}>
          Looks like you're offline. Check your WiFi or mobile data and try again.
        </Text>

        {/* ── Tips card ── */}
        <View style={{
          backgroundColor: C.card,
          borderRadius: rs(16),
          borderWidth: 1,
          borderColor: C.border,
          padding: rs(18),
          marginTop: rs(32),
          width: '100%',
          gap: rs(12),
        }}>
          {[
            { icon: 'wifi-outline',          text: 'Check your WiFi connection' },
            { icon: 'cellular-outline',       text: 'Enable mobile data' },
            { icon: 'airplane-outline',       text: 'Turn off Airplane mode' },
            { icon: 'router-outline',         text: 'Restart your router' },
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: rs(12) }}>
              <View style={{
                width: rs(34),
                height: rs(34),
                borderRadius: rs(10),
                backgroundColor: C.accentBg,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name={tip.icon} size={rs(16)} color={C.accent} />
              </View>
              <Text style={{ fontSize: nz(13), color: C.textSub, flex: 1 }}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Retry button ── */}
        <View style={{ marginTop: rs(32) }}>
          <RetryButton
            onPress={onRetry}
            isRetrying={isRetrying}
            C={C}
            rs={rs}
            nz={nz}
          />
        </View>

        <Text style={{ color: C.textMuted, fontSize: nz(11), marginTop: rs(20) }}>
          Your data is safe. We'll reconnect automatically.
        </Text>

      </Animated.View>
    </View>
  );
}

export function NetworkGuard({ children }) {
  const { isConnected, isRetrying, retry } = useNetworkStatus();

  if (!isConnected) {
    return <NoInternetScreen onRetry={retry} isRetrying={isRetrying} />;
  }

  return <>{children}</>;
}