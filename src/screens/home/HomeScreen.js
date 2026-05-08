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
const TAB_BAR_HEIGHT = 90; // Approximate tab bar height with safe area

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
    <View style={{ flex: 1, backgroundColor: C.root }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.headerBg} />

      {/* ── Sticky Header ── */}
      <Animated.View style={[st.stickyHeader, {
        paddingTop: insets.top + rs(8), 
        paddingBottom: rs(8),
        backgroundColor: C.headerBg, 
        borderBottomColor: C.headerBorder,
        opacity: headerOpacity,
      }]}>
        <View style={st.headerContent}>
          <Image 
            source={require('../../../assets/logo.png')} 
            style={{ width: rs(130), height: rs(40) }} 
            resizeMode="contain" 
          />
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingTop: insets.top + rs(12) + rs(50),
          // Add extra padding at bottom to prevent tab bar overlap
          paddingBottom: TAB_BAR_HEIGHT + rs(32),
          paddingHorizontal: rs(16),
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }], 
          { useNativeDriver: false }
        )}
        // Add these props for better scrolling
        bounces={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero Section ── */}
        <View style={[st.hero, { minHeight: rs(225), marginBottom: rs(12) }]}>
          <View style={[st.heroLeft, { paddingRight: rs(16), paddingTop: rs(8) }]}>
            <Text style={{ 
              fontSize: nz(22), 
              lineHeight: nz(28), 
              fontWeight: '800', 
              color: C.heroTitle 
            }}>
              Sit back, relax
            </Text>
            <Text style={{ 
              fontSize: nz(22), 
              lineHeight: nz(28), 
              fontWeight: '800', 
              color: GOLD, 
              marginBottom: rs(8) 
            }}>
              We've got you!
            </Text>
            <Text style={{ 
              fontSize: nz(11), 
              lineHeight: nz(17),
              color: C.heroDesc, 
              marginBottom: rs(16) 
            }}>
              Scan the QR at your seat to explore the{'\n'}menu and place your order instantly.
            </Text>
            <TouchableOpacity
              style={[st.scanBtn, {
                paddingHorizontal: rs(16), 
                paddingVertical: rs(10),
                gap: rs(8), 
                borderRadius: rs(10),
                backgroundColor: C.scanBtnBg, 
                borderColor: C.scanBtnBorder,
              }]}
              activeOpacity={0.85}
              onPress={openComingSoon}
            >
              <QrCode size={rs(18)} color={GREEN} strokeWidth={2.2} />
              <Text style={{ fontSize: nz(12), fontWeight: '700', color: GREEN }}>
                Scan Now
              </Text>
              <ChevronRight size={rs(16)} color={GREEN} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          <View style={[st.heroRight, { 
            width: SW * 0.38, 
            height: rs(180), 
            borderRadius: rs(14),
          }]}>
            <Image 
              source={require('../../../assets/banner.png')} 
              style={st.heroImg} 
              resizeMode="cover" 
            />
          </View>
        </View>

        {/* ── Features Section (Smaller & Compact) ── */}
        <View style={[st.featureCard, {
          borderRadius: rs(14),
          paddingVertical: rs(12),
          paddingHorizontal: rs(12),
          marginBottom: rs(20),
          gap: rs(12),
          backgroundColor: C.featureCard, 
          borderColor: C.featureBorder,
        }]}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <React.Fragment key={i}>
                <View style={st.featureCol}>
                  <View style={[st.featureIconWrap, { 
                    width: rs(36), 
                    height: rs(36), 
                    borderRadius: rs(8), 
                    marginBottom: rs(6), 
                    backgroundColor: C.featureIcon 
                  }]}>
                    <Icon size={rs(20)} color={GREEN} strokeWidth={1.8} />
                  </View>
                  <Text style={{ 
                    fontSize: nz(11), 
                    lineHeight: nz(15), 
                    fontWeight: '700', 
                    color: C.featureLabel, 
                    textAlign: 'center', 
                    marginBottom: rs(2) 
                  }}>
                    {f.label}
                  </Text>
                  <Text style={{ 
                    fontSize: nz(10), 
                    lineHeight: nz(13), 
                    color: C.featureSub, 
                    textAlign: 'center', 
                    fontWeight: '500' 
                  }}>
                    {f.sub}
                  </Text>
                </View>
                {i < FEATURES.length - 1 && (
                  <View style={{ 
                    width: 1, 
                    height: rs(35), 
                    backgroundColor: C.featureDivider, 
                    alignSelf: 'center' 
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Promo Section ── */}
        <LinearGradient
          colors={C.promoGradient}
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }}
          style={[st.promoCard, { 
            borderRadius: rs(18), 
            padding: rs(16), 
            marginBottom: rs(20), 
            minHeight: rs(160),
          }]}
        >
          <View style={[st.promoLeft, { paddingRight: rs(12) }]}>
            <Text style={{ 
              fontSize: nz(18), 
              lineHeight: nz(24), 
              fontWeight: '800', 
              color: C.promoTitle 
            }}>
              Make Every{' '}
              <Text style={{ color: GOLD }}>Movie Moment</Text>
            </Text>
            <Text style={{ 
              fontSize: nz(18), 
              lineHeight: nz(24), 
              fontWeight: '800', 
              color: GOLD,
              marginBottom: rs(8),
            }}>
              Extra Special
            </Text>
            <View style={{ 
              width: rs(30), 
              height: rs(2), 
              backgroundColor: GOLD, 
              borderRadius: 2, 
              marginBottom: rs(8) 
            }} />
            <Text style={{ 
              fontSize: nz(12), 
              lineHeight: nz(17), 
              color: C.promoDesc 
            }}>
              Order your favorites, earn rewards{'\n'}and enjoy more!
            </Text>
          </View>
          <View style={{ 
            width: SW * 0.3, 
            height: rs(140), 
            borderRadius: rs(12), 
            justifyContent: 'center', 
            alignItems: 'center',
          }}>
            <LottieView 
              ref={lottieRef} 
              source={require('../../../assets/entertainment.json')} 
              style={{ width: SW * 0.38, height: rs(150) }} 
              autoPlay 
              loop 
            />
          </View>
        </LinearGradient>

        {/* ── Footer ── */}
        <View style={{ 
          paddingVertical: rs(24),
          paddingBottom: rs(32), // Extra padding at bottom
          alignItems: 'center', 
          justifyContent: 'center',
        }}>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <Text style={{ fontSize: nz(13), color: C.footerText, fontWeight: '500' }}>
              Made with{' '}
            </Text>
            <Heart size={rs(18)} color="#FF4B4B" fill="#FF4B4B" strokeWidth={2} />
            <Text style={{ fontSize: nz(13), color: C.footerText, fontWeight: '500' }}>
              {' '}by{' '}
            </Text>
            <Text style={{ fontSize: nz(14), color: C.footerBrand, fontWeight: '700' }}>
              Alfennzo
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Coming Soon Modal ── */}
      <Modal 
        visible={comingSoon} 
        transparent 
        animationType="none" 
        onRequestClose={closeComingSoon} 
        statusBarTranslucent
      >
        <Pressable 
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.55)', 
            justifyContent: 'center', 
            alignItems: 'center', 
            paddingHorizontal: rs(32) 
          }} 
          onPress={closeComingSoon}
        >
          <Animated.View
            style={{
              backgroundColor: C.modalBg,
              borderRadius: rs(24), 
              padding: rs(28),
              borderWidth: 1, 
              borderColor: C.modalBorder,
              width: '100%', 
              alignItems: 'center',
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.5 : 0.15, 
              shadowRadius: 20, 
              elevation: 12,
              transform: [
                { scale: modalAnim.interpolate({ 
                  inputRange: [0, 1], 
                  outputRange: [0.85, 1] 
                })},
              ],
              opacity: modalAnim,
            }}
          >
            <View style={{ 
              width: rs(160), 
              height: rs(110), 
              marginBottom: rs(14)
            }}>
              <LottieView
                source={require('../../../assets/coming_soon.json')}
                style={{ width: rs(160), height: rs(110) }}
                autoPlay 
                loop
                useNativeLooping
              />
            </View>
            <Text style={{ 
              fontSize: nz(18), 
              fontWeight: '800', 
              color: C.modalText, 
              textAlign: 'center', 
              marginBottom: rs(8) 
            }}>
              QR Scan Feature
            </Text>
            <Text style={{ 
              fontSize: nz(12), 
              color: C.modalSub, 
              textAlign: 'center', 
              lineHeight: nz(18), 
              marginBottom: rs(20) 
            }}>
              Not available in app. Scan QR code{'\n'}to order on website.
            </Text>
            <TouchableOpacity
              style={{ 
                backgroundColor: GREEN, 
                borderRadius: rs(14), 
                paddingVertical: rs(13), 
                width: '100%', 
                alignItems: 'center' 
              }}
              onPress={closeComingSoon}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontSize: nz(14), fontWeight: '700' }}>
                Got it!
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  stickyHeader: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 1000, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 4 
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16 
  },
  hero: { 
    flexDirection: 'row', 
    alignItems: 'flex-start',
  },
  heroLeft: { 
    flex: 1,
  },
  heroRight: { 
    overflow: 'hidden',
    marginLeft: 8, // Small gap from text
  },
  heroImg: { 
    width: '100%', 
    height: '100%', 
    position: 'absolute', 
    zIndex: 10, 
    top: 0, 
    right: 0,
  },
  scanBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    alignSelf: 'flex-start', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3,
  },
  featureCard: { 
    flexDirection: 'row', 
    borderWidth: 1.5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3,
    justifyContent: 'space-around',
  },
  featureCol: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  featureIconWrap: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 2,
  },
  promoCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 3,
  },
  promoLeft: { 
    flex: 1,
  },
});