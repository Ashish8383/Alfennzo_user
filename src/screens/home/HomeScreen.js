import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  ScrollView, Dimensions, Image, Animated, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QrCode, Sandwich, Zap, ChevronRight, Heart, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';

const { width: SW } = Dimensions.get('window');
const GREEN = '#2B8A5A';
const GOLD  = '#F5B800';

const FEATURES = [
  { icon: QrCode,   label: 'Scan at\nSeat', sub: 'No seat number,\nno hassle.'  },
  { icon: Sandwich, label: 'Order\nFood',   sub: 'Quick & easy\nordering.'      },
  { icon: Zap,      label: 'Fast\nService', sub: 'Lightning fast\ndelivery.'    },
];

export default function HomeScreen() {
  const insets        = useSafeAreaInsets();
  const { rs, nz }    = useResponsive();
  const { isDark }    = useTheme();
  const scrollY       = useRef(new Animated.Value(0)).current;
  const lottieRef     = useRef(null);
  const modalAnim     = useRef(new Animated.Value(0)).current;

  const [comingSoon, setComingSoon] = useState(false);

  const C = {
    root:          isDark ? '#0D0F14' : '#F0F0F0',
    headerBg:      isDark ? '#18181e' : '#FFFFFF',
    headerBorder:  isDark ? '#252C3E' : '#E8E8E8',
    heroTitle:     isDark ? '#F0F0F0' : '#1A1A1A',
    heroDesc:      isDark ? '#9EA8BB' : '#555555',
    scanBtnBg:     isDark ? '#1A2E24' : '#FFFFFF',
    scanBtnBorder: isDark ? '#2B8A5A' : GREEN,
    featureCard:   isDark ? '#33333467' : '#FFFFFF',
    featureBorder: isDark ? '#F5B80060' : GOLD,
    featureIcon:   isDark ? '#1A2E24' : '#F4FAF4',
    featureDivider:isDark ? '#2C3347' : '#F0F0F0',
    featureLabel:  isDark ? '#E2E6F0' : '#1A1A1A',
    featureSub:    isDark ? '#6B7591' : '#888888',
    promoGradient: isDark ? ['#1A2E24', '#1C1F2E'] : ['#FFFFFF', '#95B893'],
    promoTitle:    isDark ? '#E2E6F0' : '#1A1A1A',
    promoDesc:     isDark ? '#9EA8BB' : '#444444',
    lottieWrap:    isDark ? '#13201A' : '#EAF4EA',
    footerText:    isDark ? '#6B7591' : '#666666',
    footerBrand:   isDark ? '#E2E6F0' : '#1A1A1A',
    modalBg:       isDark ? '#121212' : '#FFFFFF',
    modalBorder:   isDark ? '#2C3347' : '#E8EAF0',
    modalText:     isDark ? '#E2E6F0' : '#1A1D23',
    modalSub:      isDark ? '#8891A4' : '#6B7591',
    closeBg:       isDark ? '#2C3347' : '#F4F6FB',
  };

  const openComingSoon = () => {
    setComingSoon(true);
    Animated.spring(modalAnim, {
      toValue: 1, useNativeDriver: true, damping: 15, stiffness: 120,
    }).start();
  };

  const closeComingSoon = () => {
    Animated.timing(modalAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => setComingSoon(false));
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50], outputRange: [1, 0.98], extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.root, paddingTop: rs(22) }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.headerBg} />

      {/* ── Sticky Header ── */}
      <Animated.View style={[st.stickyHeader, {
        paddingTop: insets.top + rs(8), paddingBottom: rs(8),
        backgroundColor: C.headerBg, borderBottomColor: C.headerBorder,
        opacity: headerOpacity,
      }]}>
        <View style={st.headerContent}>
          <Image source={require('../../../assets/logo.png')} style={{ width: rs(150), height: rs(50) }} resizeMode="contain" />
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + rs(12) + rs(50), paddingBottom: rs(32), paddingHorizontal: rs(16) }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        {/* ── Hero ── */}
        <View style={[st.hero, { minHeight: rs(240), marginBottom: rs(6) }]}>
          <View style={[st.heroLeft, { paddingRight: rs(8), paddingTop: rs(4) }]}>
            <Text style={{ fontSize: nz(24), lineHeight: nz(30), fontWeight: '800', color: C.heroTitle }}>Sit back, relax</Text>
            <Text style={{ fontSize: nz(24), lineHeight: nz(30), fontWeight: '800', color: GOLD, marginBottom: rs(10) }}>We've got you!</Text>
            <Text style={{ fontSize: nz(12), lineHeight: nz(19), color: C.heroDesc, marginBottom: rs(20) }}>
              Scan the QR at your seat to explore the menu and place your order instantly.
            </Text>
            <TouchableOpacity
              style={[st.scanBtn, {
                paddingHorizontal: rs(14), paddingVertical: rs(10),
                gap: rs(6), borderRadius: rs(10),
                backgroundColor: C.scanBtnBg, borderColor: C.scanBtnBorder,
              }]}
              activeOpacity={0.85}
              onPress={openComingSoon}  // ← wired here
            >
              <QrCode size={rs(18)} color={GREEN} strokeWidth={2.2} />
              <Text style={{ fontSize: nz(12), fontWeight: '700', color: GREEN }}>Scan Now</Text>
              <ChevronRight size={rs(16)} color={GREEN} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={[st.heroRight, { width: SW * 0.43, height: rs(210), borderRadius: rs(16) }]}>
            <Image source={require('../../../assets/banner.png')} style={st.heroImg} resizeMode="cover" />
          </View>
        </View>

        {/* ── Features ── */}
        <View style={[st.featureCard, {
          borderRadius: rs(16), paddingVertical: rs(16),
          paddingHorizontal: rs(8), marginBottom: rs(25), gap: rs(8),
          backgroundColor: C.featureCard, borderColor: C.featureBorder,
        }]}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <React.Fragment key={i}>
                <View style={st.featureCol}>
                  <View style={[st.featureIconWrap, { width: rs(40), height: rs(40), borderRadius: rs(10), marginBottom: rs(8), backgroundColor: C.featureIcon }]}>
                    <Icon size={rs(22)} color={GREEN} strokeWidth={1.8} />
                  </View>
                  <Text style={{ fontSize: nz(11), lineHeight: nz(14), fontWeight: '700', color: C.featureLabel, textAlign: 'center', marginBottom: rs(4) }}>{f.label}</Text>
                  <Text style={{ fontSize: nz(10), lineHeight: nz(13), color: C.featureSub, textAlign: 'center', fontWeight: '500' }}>{f.sub}</Text>
                </View>
                {i < FEATURES.length - 1 && <View style={{ width: 1, height: rs(40), backgroundColor: C.featureDivider, alignSelf: 'center' }} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Promo ── */}
        <LinearGradient
          colors={C.promoGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[st.promoCard, { borderRadius: rs(20), padding: rs(20), marginBottom: rs(12), minHeight: rs(180) }]}
        >
          <View style={[st.promoLeft, { paddingRight: rs(8) }]}>
            <Text style={{ fontSize: nz(20), lineHeight: nz(32), fontWeight: '800', color: C.promoTitle }}>Make Every</Text>
            <Text style={{ fontSize: nz(20), lineHeight: nz(16), fontWeight: '800', color: C.promoTitle }}>Movie Moment</Text>
            <Text style={{ fontSize: nz(20), lineHeight: nz(36), fontWeight: '800', color: GOLD, marginBottom: rs(6) }}>Extra Special</Text>
            <View style={{ width: rs(36), height: rs(2.5), backgroundColor: GOLD, borderRadius: 2, marginBottom: rs(10) }} />
            <Text style={{ fontSize: nz(13), lineHeight: nz(18), color: C.promoDesc }}>Order your favorites, earn rewards and enjoy more!</Text>
          </View>
          <View style={{ width: SW * 0.3, height: rs(160), borderRadius: rs(12), justifyContent: 'center', alignItems: 'center' }}>
            <LottieView ref={lottieRef} source={require('../../../assets/entertainment.json')} style={{ width: SW * 0.42, height: rs(170) }} autoPlay loop />
          </View>
        </LinearGradient>

        {/* ── Footer ── */}
        <View style={{ paddingVertical: rs(20), alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: nz(13), color: C.footerText, fontWeight: '500' }}>Made with </Text>
            <Heart size={rs(19)} color="#FF4B4B" fill="#FF4B4B" strokeWidth={2} />
            <Text style={{ fontSize: nz(13), color: C.footerText, fontWeight: '500' }}> by </Text>
            <Text style={{ fontSize: nz(14), color: C.footerBrand, fontWeight: '700' }}>Alfennzo</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Coming Soon Modal ── */}
      <Modal visible={comingSoon} transparent animationType="none" onRequestClose={closeComingSoon} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: rs(32) }} onPress={closeComingSoon}>
          <Animated.View
            style={{
              backgroundColor: C.modalBg,
              borderRadius: rs(24), padding: rs(28),
              borderWidth: 1, borderColor: C.modalBorder,
              width: '100%', alignItems: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 20, elevation: 12,
              transform: [
                { scale: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
              opacity: modalAnim,
            }}
          >

            {/* Lottie */}
            <View style={{ width: rs(180), height: rs(120), marginBottom: rs(16) }}>
              <LottieView
                source={require('../../../assets/coming_soon.json')}
                style={{ width: rs(180), height: rs(120) }}
                autoPlay loop
              />
            </View>
            <Text style={{ fontSize: nz(20), fontWeight: '800', color: C.modalText, textAlign: 'center', marginBottom: rs(10) }}>
              QR Scan Feature
            </Text>
            <Text style={{ fontSize: nz(13), color: C.modalSub, textAlign: 'center', lineHeight: nz(20), marginBottom: rs(24) }}>
             Not available in app. Scan QR code to order on website.
            </Text>
            {/* Close button */}
            <TouchableOpacity
              style={{ backgroundColor: GREEN, borderRadius: rs(14), paddingVertical: rs(13), width: '100%', alignItems: 'center' }}
              onPress={closeComingSoon}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontSize: nz(15), fontWeight: '700' }}>Got it!</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  stickyHeader:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, borderBottomWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 4 },
  headerContent:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  hero:            { flexDirection: 'row', alignItems: 'flex-start' },
  heroLeft:        { flex: 1 },
  heroRight:       { overflow: 'hidden' },
  heroImg:         { width: '100%', height: '100%', position: 'absolute', zIndex: 10, top: 0, right: 0 },
  scanBtn:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, alignSelf: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  featureCard:     { flexDirection: 'row', borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  featureCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  featureIconWrap: { alignItems: 'center', justifyContent: 'center', elevation: 2 },
  promoCard:       { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  promoLeft:       { flex: 1 },
});