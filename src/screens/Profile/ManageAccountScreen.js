import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StatusBar, Pressable, Animated, Modal, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import useAuthStore from '../../store/authStore';
import AuthService from '../../api/apiService';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ManageAccountScreen() {
  const { rs, nz }        = useResponsive();
  const insets             = useSafeAreaInsets();
  const { isDark, themeMode, setTheme } = useTheme();
  const { success, error } = useToast();
  const navigation         = useNavigation();
  const user               = useAuthStore((s) => s.user);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const logoutModalScaleAnim = useRef(new Animated.Value(0)).current;
  const logoutModalOpacityAnim = useRef(new Animated.Value(0)).current;

  const C = {
    bg:          isDark ? '#0D0F14' : '#F0F0F0',
    card:        isDark ? '#1C1F2E' : '#FFFFFF',
    cardBorder:  isDark ? '#2C3347' : '#E8EAF0',
    text:        isDark ? '#E2E6F0' : '#1A1D23',
    textSub:     isDark ? '#8891A4' : '#6B7591',
    textMuted:   isDark ? '#4A5168' : '#9EA8BB',
    iconBg:      isDark ? '#1A1F2E' : '#F4F6FB',
    divider:     isDark ? '#2C3347' : '#E8EAF0',
    greenBg:     isDark ? '#1A2E24' : '#EAF4EA',
    green:       isDark ? '#66BB6A' : '#2B8A5A',
    purpleBg:    isDark ? '#1E1A38' : '#EDE7F6',
    purple:      isDark ? '#B39DDB' : '#6A1B9A',
    redBg:       isDark ? '#2A1515' : '#FFEBEE',
    red:         isDark ? '#EF9A9A' : '#D32F2F',
    redDark:     isDark ? '#FF5252' : '#C62828',
    radioSelected: isDark ? '#2B8A5A' : '#43A047',
    radioUnselected: isDark ? '#2C3347' : '#E0E3EB',
    radioDot: isDark ? '#FFFFFF' : '#FFFFFF',
    modalBg:    isDark ? '#1C1F2E' : '#FFFFFF',
    warningBg:  isDark ? '#2A1515' : '#FFF3E0',
    warningBorder: isDark ? '#4A1515' : '#FFE0B2',
    orangeBg:   isDark ? '#2A1F10' : '#FFF3E0',
    orange:     isDark ? '#FFB74D' : '#F57C00',
  };

  const themeOptions = [
    {
      id: 'light',
      label: 'Light',
      description: 'Always use light theme',
      icon: 'sunny',
    },
    {
      id: 'dark',
      label: 'Dark',
      description: 'Always use dark theme',
      icon: 'moon',
    },
    {
      id: 'system',
      label: 'System',
      description: 'Match your device theme',
      icon: 'phone-portrait-outline',
    },
  ];

  const openLogoutModal = () => {
    setShowLogoutModal(true);
    
    Animated.parallel([
      Animated.spring(logoutModalScaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 100,
        useNativeDriver: true,
      }),
      Animated.timing(logoutModalOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLogoutModal = () => {
    Animated.parallel([
      Animated.timing(logoutModalScaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(logoutModalOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLogoutModal(false);
    });
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await AuthService.logout();
      closeLogoutModal();
      setTimeout(() => success("Logged out successfully"), 300);
    } catch (err) {
      closeLogoutModal();
      setTimeout(() => error("Failed to logout"), 300);
    } finally {
      setLoggingOut(false);
    }
  };

  const RadioButton = ({ selected, onPress }) => (
    <Pressable
      onPress={onPress}
      style={{
        width: rs(24),
        height: rs(24),
        borderRadius: rs(12),
        borderWidth: 2,
        borderColor: selected ? C.radioSelected : C.radioUnselected,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: selected ? C.radioSelected : 'transparent',
      }}
    >
      {selected && (
        <View style={{
          width: rs(12),
          height: rs(12),
          borderRadius: rs(6),
          backgroundColor: C.radioDot,
        }} />
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={{
        paddingTop: insets.top + rs(12), paddingBottom: rs(12),
        paddingHorizontal: rs(16), backgroundColor: C.bg,
        borderBottomWidth: 0.5, borderBottomColor: C.divider,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: rs(38), height: rs(38), borderRadius: rs(19), backgroundColor: C.iconBg, justifyContent: 'center', alignItems: 'center', marginRight: rs(12) }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={rs(22)} color={C.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: nz(18), fontWeight: '700', color: C.text }}>Manage Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: rs(20), paddingBottom: rs(60) }}>
        {/* Appearance Card */}
        <Text style={{ fontSize: nz(12), fontWeight: '600', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: rs(10) }}>
          Appearance
        </Text>
        <View style={{ backgroundColor: C.card, borderRadius: rs(18), borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: rs(24) }}>
          {themeOptions.map((option, index) => (
            <React.Fragment key={option.id}>
              <Pressable
                onPress={() => setTheme(option.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: rs(14),
                  backgroundColor: 'transparent',
                }}
                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              >
                <View style={{
                  backgroundColor: option.id === 'light' ? C.greenBg : 
                                  option.id === 'dark' ? C.purpleBg : C.iconBg,
                  width: rs(38),
                  height: rs(38),
                  borderRadius: rs(12),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: rs(14),
                }}>
                  <Ionicons 
                    name={option.icon} 
                    size={rs(20)} 
                    color={option.id === 'light' ? C.green : 
                           option.id === 'dark' ? C.purple : C.textSub} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: nz(15), fontWeight: '600', color: C.text }}>
                    {option.label}
                  </Text>
                  <Text style={{ fontSize: nz(12), color: C.textSub, marginTop: rs(2) }}>
                    {option.description}
                  </Text>
                </View>
                <RadioButton 
                  selected={themeMode === option.id} 
                  onPress={() => setTheme(option.id)} 
                />
              </Pressable>
              {index < themeOptions.length - 1 && (
                <View style={{ height: 0.5, backgroundColor: C.divider, marginLeft: rs(66) }} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Alfennzo Coins Card */}
        {user?.AlfennzoCoin !== undefined && (
          <>
            <Text style={{ fontSize: nz(12), fontWeight: '600', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: rs(10) }}>
              Rewards
            </Text>
            <View style={{ backgroundColor: C.card, borderRadius: rs(18), borderWidth: 1, borderColor: C.cardBorder, padding: rs(16), marginBottom: rs(24), flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: C.greenBg, width: rs(44), height: rs(44), borderRadius: rs(14), justifyContent: 'center', alignItems: 'center', marginRight: rs(14) }}>
                <Ionicons name="logo-bitcoin" size={rs(24)} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: nz(13), color: C.textSub, fontWeight: '500' }}>Alfennzo Coins</Text>
                <Text style={{ fontSize: nz(20), color: C.green, fontWeight: '800', marginTop: rs(2) }}>
                  {user.AlfennzoCoin?.toFixed(2)}
                </Text>
              </View>
            </View>
          </>
        )}
        {/* Logout Button */}
        <Text style={{ fontSize: nz(12), fontWeight: '600', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: rs(10) }}>
          Session
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: C.redBg, borderWidth: 1,
            borderColor: isDark ? '#4A1515' : 'rgba(211,47,47,0.2)',
            borderRadius: rs(16), padding: rs(16),
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: rs(8),
          }}
          onPress={openLogoutModal}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={rs(20)} color={C.red} />
          <Text style={{ fontSize: nz(15), fontWeight: '600', color: C.red }}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="none"
        onRequestClose={closeLogoutModal}
        statusBarTranslucent
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Overlay */}
          <Animated.View 
            style={[
              {
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'rgba(0,0,0,0.75)',
              },
              { opacity: logoutModalOpacityAnim }
            ]}
          >
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={closeLogoutModal}
            />
          </Animated.View>

          {/* Modal Content */}
          <Animated.View 
            style={{
              backgroundColor: C.modalBg,
              borderRadius: rs(24),
              width: Math.min(SCREEN_WIDTH - rs(40), 400),
              padding: rs(24),
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
              transform: [{ scale: logoutModalScaleAnim }],
            }}
          >
            {/* Icon */}
            <View style={{
              backgroundColor: C.warningBg,
              borderColor: C.warningBorder,
              borderWidth: 2,
              width: rs(72),
              height: rs(72),
              borderRadius: rs(36),
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: rs(16),
            }}>
              <Ionicons name="log-out" size={rs(36)} color={C.redDark} />
            </View>

            {/* Title */}
            <Text style={{
              fontSize: nz(20),
              fontWeight: '700',
              color: C.text,
              marginBottom: rs(30),
              textAlign: 'center',
            }}>
              Ready to Leave?
            </Text>

            {/* Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: rs(12),
              width: '100%',
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: C.iconBg,
                  paddingVertical: rs(14),
                  borderRadius: rs(12),
                  alignItems: 'center',
                }}
                onPress={closeLogoutModal}
                activeOpacity={0.7}
                disabled={loggingOut}
              >
                <Text style={{
                  fontSize: nz(15),
                  fontWeight: '600',
                  color: C.text,
                }}>
                  Stay
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: C.redDark,
                  paddingVertical: rs(14),
                  borderRadius: rs(12),
                  alignItems: 'center',
                  opacity: loggingOut ? 0.7 : 1,
                }}
                onPress={handleLogout}
                activeOpacity={0.7}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{
                    fontSize: nz(15),
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}>
                    Logout
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const StyleSheet = {
  absoluteFillObject: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};