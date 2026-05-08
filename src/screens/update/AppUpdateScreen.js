import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Linking, Animated, Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useResponsive } from '../../utils/responsive';
import { APP_VERSION } from '../../utils/appInfo';

const STORE_URL = {
  android: 'https://play.google.com/store/apps/details?id=com.alfennzo.alfennzo_user',
  ios:     'https://apps.apple.com/app/idYOURAPPID',
};

export default function AppUpdateScreen() {
  const { theme, isDark } = useTheme();
  const { rs, nz }        = useResponsive();
  const insets             = useSafeAreaInsets();
  const lottieRef          = useRef(null);
  const fadeAnim           = useRef(new Animated.Value(0)).current;
  const slideAnim          = useRef(new Animated.Value(40)).current;

  const C = {
    root:        isDark ? '#0D0F14' : '#F0F0F0',
    card:        isDark ? '#1C1F2E' : '#FFFFFF',
    cardBorder:  isDark ? '#2C3347' : '#E8EAF0',
    title:       isDark ? '#E2E6F0' : '#1A1D23',
    sub:         isDark ? '#8891A4' : '#6B7591',
    pill:        isDark ? '#13151F' : '#F4F6FB',
    pillBorder:  isDark ? '#2C3347' : '#E0E3EB',
    pillText:    isDark ? '#6B7591' : '#8891A4',
    lottieWrap:  isDark ? '#1A2E24' : '#EAF4EA',
    lottieBorder:isDark ? '#2B5E3A' : '#C3DFC3',
  };

  useEffect(() => {
    if (lottieRef.current) lottieRef.current.play();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 14, stiffness: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleUpdate = () => {
    const url = Platform.OS === 'android' ? STORE_URL.android : STORE_URL.ios;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[st.root, { backgroundColor: C.root, paddingTop: insets.top }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.root}
      />

      <Animated.View style={[st.card, {
        backgroundColor: C.card,
        borderColor: C.cardBorder,
        borderRadius: rs(28),
        marginHorizontal: rs(24),
        padding: rs(32),
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }]}>

        {/* Lottie */}
        <View style={[st.lottieWrap, {
          width: rs(120), height: rs(120),
          borderRadius: rs(60),
          backgroundColor: C.lottieWrap,
          borderColor: C.lottieBorder,
          marginBottom: rs(24),
        }]}>
          <LottieView
            ref={lottieRef}
            source={require('../../../assets/Rocket.json')}
            style={{ width: rs(160), height: rs(160) }}
            autoPlay
            loop
            useNativeLooping
          />
        </View>

        {/* Title */}
        <Text style={{ color: C.title, fontSize: nz(22), fontWeight: '800', textAlign: 'center', marginBottom: rs(10) }}>
          Update Available
        </Text>
        <Text style={{ color: C.sub, fontSize: nz(14), textAlign: 'center', lineHeight: nz(22), marginBottom: rs(20) }}>
          A new version of Alfennzo is available. Please update to continue using the app.
        </Text>

        {/* Version pill */}
        <View style={[st.pill, {
          backgroundColor: C.pill,
          borderColor: C.pillBorder,
          borderRadius: rs(20),
          paddingHorizontal: rs(16),
          paddingVertical: rs(6),
          marginBottom: rs(28),
        }]}>
          <Text style={{ color: C.pillText, fontSize: nz(12), fontWeight: '600' }}>
            Current version: {APP_VERSION}
          </Text>
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[st.btn, {
            backgroundColor: '#43A047',
            borderRadius: rs(16),
            height: rs(54),
            shadowColor: '#43A047',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.35,
            shadowRadius: 8,
            elevation: 6,
          }]}
          onPress={handleUpdate}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontSize: nz(16), fontWeight: '700' }}>
            Update Now
          </Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  root:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card:      { width: '100%', alignItems: 'center', borderWidth: 1 },
  lottieWrap:{ justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  pill:      { borderWidth: 1 },
  btn:       { width: '100%', alignItems: 'center', justifyContent: 'center' },
});