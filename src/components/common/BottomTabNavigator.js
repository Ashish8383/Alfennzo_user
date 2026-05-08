import React, { useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Platform,
  Animated,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';
import {
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';

import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';

// Screens
import HomeScreen from '../../screens/home/HomeScreen';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import OrderHistory from '../../screens/orderHistory/OrderHistory';
import PrivacyDataScreen from '../../screens/Profile/PrivacyDataScreen';
import EditProfileScreen from '../../screens/auth/EditProfileScreen';
import ManageAccountScreen from '../../screens/Profile/ManageAccountScreen';

// ─────────────────────────────────────────────────────────────
// Tabs Config
// ─────────────────────────────────────────────────────────────

const TABS = [
  {
    name: 'Home',
    icon: 'home',
    component: HomeScreen,
  },
  {
    name: 'History',
    icon: 'time',
    component: OrderHistory,
  },
  {
    name: 'Profile',
    icon: 'person',
    component: ProfileScreen,
  },
];

const TAB_COUNT = 3;

// Hide bottom tabs on these screens
const HIDDEN_SCREENS = [
  'PrivacyData',
  'EditProfile',
  'ManageAccount',
];

// ─────────────────────────────────────────────────────────────
// Profile Stack
// ─────────────────────────────────────────────────────────────

const ProfileStack = createNativeStackNavigator();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="PrivacyData"
        component={PrivacyDataScreen}
        options={{ title: 'Privacy & Data' }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <ProfileStack.Screen
        name="ManageAccount"
        component={ManageAccountScreen}
        options={{ title: 'Manage Account' }}
      />
    </ProfileStack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// Custom TabBar Component
// ─────────────────────────────────────────────────────────────

function TabBar({ state, navigation }) {
  const { rs, SW: WINDOW_WIDTH } = useResponsive();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // Get the current route name from the focused tab
  const focusedRoute =
    getFocusedRouteNameFromRoute(state.routes[state.index]) ?? 'ProfileMain';

  // Check if we should hide the tab bar
  const shouldHide = HIDDEN_SCREENS.includes(focusedRoute);

  // ───────────────────────────────────────────
  // Theme Tokens
  // ───────────────────────────────────────────
  const BAR_BG = theme.green || '#4CAF50';
  const ACTIVE_BG = isDark ? '#F5A623' : '#FFD700';
  const ICON_INACTIVE = '#FFFFFF';
  const ICON_ACTIVE = isDark ? '#FFFFFF' : '#1a1a2e';
  const RING_BG = isDark ? '#0D0F14' : '#F0F0F0';

  const BAR_HEIGHT = Platform.OS === 'android' ? rs(55) : rs(50);
  const CIRCLE_SIZE = rs(50);
  const RING_SIZE = CIRCLE_SIZE + rs(25);
  const TAB_WIDTH = WINDOW_WIDTH / TAB_COUNT;
  const ICON_SIZE = rs(24);
  const SHADOW_HEIGHT = rs(6);
  const SHADOW_RADIUS = rs(10);
  const HIT_SLOP = rs(10);
  const CIRCLE_OFFSET = rs(14);

  // ───────────────────────────────────────────
  // Animation for TabBar Hide/Show
  // ───────────────────────────────────────────
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const tabBarOpacity = useRef(new Animated.Value(1)).current;
  const tabBarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shouldHide) {
      // Animate tab bar out
      Animated.parallel([
        Animated.spring(tabBarTranslateY, {
          toValue: BAR_HEIGHT + insets.bottom + 20,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }),
        Animated.timing(tabBarOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(tabBarScale, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate tab bar in
      Animated.parallel([
        Animated.spring(tabBarTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
          mass: 0.8,
        }),
        Animated.timing(tabBarOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(tabBarScale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldHide]);

  // ───────────────────────────────────────────
  // Animation for Active Tab Indicator
  // ───────────────────────────────────────────
  const translateX = useRef(
    new Animated.Value(state.index * TAB_WIDTH)
  ).current;

  const circleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.8,
    }).start();

    // Bounce animation for circle
    Animated.sequence([
      Animated.timing(circleScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(circleScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 180,
        mass: 0.5,
      }),
    ]).start();
  }, [state.index]);

  const circleBottom = BAR_HEIGHT + insets.bottom + CIRCLE_OFFSET;

  // ───────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────
  return (
    <Animated.View
      pointerEvents={shouldHide ? 'none' : 'auto'}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        transform: [
          { translateY: tabBarTranslateY },
          { scale: tabBarScale },
        ],
        opacity: tabBarOpacity,
        zIndex: 100,
      }}
    >
      {/* Floating Active Circle */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: circleBottom - CIRCLE_SIZE / 0.83,
          left: (TAB_WIDTH - RING_SIZE) / 2,
          transform: [{ translateX }],
          zIndex: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer Ring */}
        <View
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            backgroundColor: RING_BG,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          {/* Active Button with Scale Animation */}
          <Animated.View
            style={{
              transform: [{ scale: circleScale }],
            }}
          >
            <Pressable
              onPress={() => {
                const tab = TABS[state.index];
                const event = navigation.emit({
                  type: 'tabPress',
                  target: tab.name,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  navigation.navigate(tab.name);
                }
              }}
              style={({ pressed }) => [
                {
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  borderRadius: CIRCLE_SIZE / 2,
                  backgroundColor: ACTIVE_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: ACTIVE_BG,
                  shadowOffset: { width: 0, height: SHADOW_HEIGHT },
                  shadowOpacity: 0.45,
                  shadowRadius: SHADOW_RADIUS,
                  elevation: 12,
                },
                pressed && {
                  opacity: 0.9,
                  transform: [{ scale: 0.95 }],
                },
              ]}
            >
              <Ionicons
                name={TABS[state.index].icon}
                size={ICON_SIZE}
                color={ICON_ACTIVE}
              />
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Bottom Bar Background */}
      <View
        style={{
          width: WINDOW_WIDTH,
          height: BAR_HEIGHT + insets.bottom,
          backgroundColor: BAR_BG,
          flexDirection: 'row',
          alignItems: 'center',
          paddingBottom: insets.bottom,
          borderTopLeftRadius: rs(20),
          borderTopRightRadius: rs(20),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10,
        }}
      >
        {TABS.map((tab, index) => {
          const isActive = state.index === index;
          return (
            <Pressable
              key={tab.name}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: tab.name,
                  canPreventDefault: true,
                });

                if (!event.defaultPrevented) {
                  navigation.navigate(tab.name);
                }
              }}
              onLongPress={() => {
                // Optional: Add haptic feedback or long press action
                if (Platform.OS === 'ios') {
                  // Add haptic feedback logic here if needed
                }
              }}
              style={({ pressed }) => [
                {
                  width: TAB_WIDTH,
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && {
                  opacity: 0.7,
                },
              ]}
              hitSlop={{
                top: HIT_SLOP,
                bottom: HIT_SLOP,
                left: HIT_SLOP,
                right: HIT_SLOP,
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.name} tab`}
            >
              {!isActive && (
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={`${tab.icon}-outline`}
                    size={ICON_SIZE}
                    color={ICON_INACTIVE}
                  />
                  {Platform.OS === 'android' && (
                    <View
                      style={{
                        height: 3,
                        width: 4,
                        borderRadius: 1.5,
                        backgroundColor: 'transparent',
                        marginTop: 2,
                      }}
                    />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────
// Memoized TabBar for Performance
// ─────────────────────────────────────────────────────────────
const MemoizedTabBar = React.memo(TabBar);

// ─────────────────────────────────────────────────────────────
// Bottom Tab Navigator
// ─────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <MemoizedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
      screenListeners={{
        tabPress: (e) => {
          // Optional: Add analytics or custom logic on tab press
          console.log(`Tab pressed: ${e.target}`);
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="History"
        component={OrderHistory}
        options={{
          tabBarLabel: 'History',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

export { ProfileStackNavigator };