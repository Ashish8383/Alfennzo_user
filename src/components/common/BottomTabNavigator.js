import React, { useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

import HomeScreen from '../../screens/home/HomeScreen';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import OrderHistory from '../../screens/orderHistory/OrderHistory';
import PrivacyDataScreen from '../../screens/Profile/PrivacyDataScreen';
import EditProfileScreen from '../../screens/auth/EditProfileScreen';
import ManageAccountScreen from '../../screens/Profile/ManageAccountScreen';

// ─── Tabs config ─────────────────────────────────────────────────────────────
const TABS = [
  { name: 'Home', icon: 'home', component: HomeScreen },
  { name: 'History', icon: 'time', component: OrderHistory },
  { name: 'Profile', icon: 'person', component: ProfileScreen },
];

const TAB_COUNT = 3;

// ─── Profile Stack Navigator ─────────────────────────────────────────────────
const ProfileStack = createNativeStackNavigator();

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="PrivacyData" component={PrivacyDataScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="ManageAccount" component={ManageAccountScreen} /> 
    </ProfileStack.Navigator>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────
function TabBar({ state, navigation }) {
  const { rs, SW: WINDOW_WIDTH } = useResponsive();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // ── Design tokens based on theme ───────────────────────────────────────────
  const BAR_BG = theme.green;
  const ACTIVE_BG = isDark ? '#F5A623' : '#FFD700';
  const ICON_INACTIVE = '#FFFFFF';
  const ICON_ACTIVE = isDark ? '#FFFFFF' : '#1a1a2e';
  const RING_BG = theme.background;
  const BAR_HEIGHT = Platform.OS === 'android' ? rs(55) : rs(50);
  const CIRCLE_SIZE = rs(50);
  const RING_SIZE = CIRCLE_SIZE + rs(25);
  const TAB_WIDTH = WINDOW_WIDTH / TAB_COUNT;
  const ICON_SIZE = rs(24);
  const SHADOW_HEIGHT = rs(6);
  const SHADOW_RADIUS = rs(10);
  const HIT_SLOP = rs(10);
  const CIRCLE_OFFSET = rs(14);

  // translateX drives both the yellow circle and the ring together
  const translateX = useRef(
    new Animated.Value(state.index * TAB_WIDTH)
  ).current;

  // bounce-up / settle animation for the active circle
  const circleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide circle to active tab
    Animated.spring(translateX, {
      toValue: state.index * TAB_WIDTH,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();

    // Quick bounce on tab press
    Animated.sequence([
      Animated.spring(circleScale, {
        toValue: 0.88,
        useNativeDriver: true,
        speed: 80,
        bounciness: 0,
      }),
      Animated.spring(circleScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 180,
      }),
    ]).start();
  }, [state.index]);

  // Circle bottom edge sits above the bar top
  const circleBottom = BAR_HEIGHT + insets.bottom + CIRCLE_OFFSET;

  return (
    <View style={{ backgroundColor: theme.background }}>

      {/* ── Floating active circle (ring + button) ── */}
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
        {/* Ring - uses theme background to blend */}
        <View
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            backgroundColor: RING_BG,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Active button */}
          <Animated.View
            style={{
              transform: [{ scale: circleScale }],
            }}
          >
            <Pressable
              onPress={() => {
                const tab = TABS[state.index];
                // Navigate to the main tab screen, not stack screen
                navigation.navigate(tab.name);
              }}
              style={{
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
              }}
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

      {/* ── Bar ── */}
      <View
        style={{
          width: WINDOW_WIDTH,
          height: BAR_HEIGHT + insets.bottom,
          backgroundColor: BAR_BG,
          flexDirection: 'row',
          alignItems: 'center',
          paddingBottom: insets.bottom,
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
              style={{
                width: TAB_WIDTH,
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{
                top: HIT_SLOP,
                bottom: HIT_SLOP,
                left: HIT_SLOP,
                right: HIT_SLOP
              }}
            >
              {/* Inactive tab icon */}
              {!isActive && (
                <Ionicons
                  name={`${tab.icon}-outline`}
                  size={ICON_SIZE}
                  color={ICON_INACTIVE}
                />
              )}
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

const getTabBarVisibility = (route) => {
  const routeName = getFocusedRouteNameFromRoute(route);
  
  const hiddenScreens = ['PrivacyData', 'EditProfile', 'ManageAccount'];
  
  if (hiddenScreens.includes(routeName)) {
    return false;
  }
  
  return true;
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => {
        // Get the current route name from the Profile stack
        const profileRoute = props.state.routes.find(route => route.name === 'Profile');
        let currentRouteName = 'ProfileMain';
        
        if (profileRoute?.state?.routes?.length > 0) {
          const profileStackState = profileRoute.state;
          currentRouteName = profileStackState.routes[profileStackState.index].name;
        }
        
        // List of screens where tab bar should be hidden
        const hiddenScreens = ['PrivacyData', 'EditProfile', 'ManageAccount'];
        
        // If current screen is in hidden list, don't render tab bar
        if (hiddenScreens.includes(currentRouteName)) {
          return null;
        }
        
        return <TabBar {...props} />;
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={OrderHistory} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}