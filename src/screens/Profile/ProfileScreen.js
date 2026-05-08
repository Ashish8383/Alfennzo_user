import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "../../utils/responsive";
import { useTheme } from "../../context/ThemeContext";
import useAuthStore from "../../store/authStore";
import AuthService from "../../api/apiService";

export default function ProfileScreen() {
    const { rs, nz } = useResponsive();
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const user = useAuthStore((state) => state.user);
    const navigation = useNavigation();
    const lottieRef = useRef(null);

    const C = {
        bg: isDark ? '#0D0F14' : '#F0F0F0',
        card: isDark ? '#33333467' : '#FFFFFF',
        cardBorder: isDark ? '#2C3347' : '#E8EAF0',
        text: isDark ? '#E2E6F0' : '#1A1D23',
        textSub: isDark ? '#8891A4' : '#6B7591',
        iconBg: isDark ? '#1A1F2E' : '#F4F6FB',
        greenBg: isDark ? '#1A2E24' : '#EAF4EA',
        green: isDark ? '#66BB6A' : '#2B8A5A',
        tealBg: isDark ? '#132238' : '#E0F7FA',
        teal: isDark ? '#4DD0E1' : '#00838F',
        blueBg: isDark ? '#1B2A4A' : '#E3F2FD',
        blue: isDark ? '#64B5F6' : '#1976D2',
        redBg: isDark ? '#2A1515' : '#FFEBEE',
        red: isDark ? '#EF9A9A' : '#D32F2F',
        divider: isDark ? '#2C3347' : '#E8EAF0',
        purpleBg: isDark ? '#1E1A38' : '#EDE7F6',
        purple: isDark ? '#B39DDB' : '#6A1B9A',
    };

    useEffect(() => {
        if (lottieRef.current) lottieRef.current.play();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: insets.top + rs(30), paddingBottom: rs(100) }}
            >
                {/* Profile Card */}
                <View style={[st.profileCard, {
                    marginHorizontal: rs(20), padding: rs(20),
                    borderRadius: rs(24), backgroundColor: C.card, borderColor: C.cardBorder,
                }]}>
                    <View style={[st.avatarWrapper, {
                        width: rs(70), height: rs(70),
                        borderRadius: rs(35), backgroundColor: C.greenBg,
                    }]}>
                        <LottieView
                            ref={lottieRef}
                            source={require("../../../assets/profile.json")}
                            style={{ width: rs(100), height: rs(100) }}
                            autoPlay loop
                            useNativeLooping
                        />
                    </View>
                    <View style={[st.profileInfo, { marginLeft: rs(16) }]}>
                        <View style={st.nameRow}>
                            <Text style={{ fontSize: nz(20), fontWeight: '700', color: C.text, flex: 1 }}>
                                {user?.fullname || "User"}
                            </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('EditProfile')}
                                style={[st.editIcon, {
                                    backgroundColor: C.iconBg,
                                    marginLeft: rs(8), width: rs(32),
                                    height: rs(32), borderRadius: rs(16),
                                }]}
                            >
                                <Ionicons name="pencil" size={rs(16)} color={C.textSub} />
                            </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: nz(14), marginTop: rs(4), color: C.textSub }}>
                            +91 {user?.phone || "N/A"}
                        </Text>
                    </View>
                </View>

                {/* Menu Card */}
                <View style={[st.menuCard, {
                    marginTop: rs(24), marginHorizontal: rs(20),
                    borderRadius: rs(18), backgroundColor: C.card, borderColor: C.cardBorder,
                }]}>
                    {[
                        { label: 'My Orders', icon: 'cart-outline', iconColor: C.green, iconBg: C.greenBg, onPress: () => navigation.navigate('History') },
                        { label: 'Privacy & Data', icon: 'shield-checkmark-outline', iconColor: C.teal, iconBg: C.tealBg, onPress: () => navigation.navigate('PrivacyData') },
                        { label: 'Contact Support', icon: 'chatbubble-ellipses-outline', iconColor: C.blue, iconBg: C.blueBg, onPress: () => navigation.navigate('ChatSupport', { orderData: null }) },
                        { label: 'Manage Account', icon: 'settings-outline', iconColor: C.purple, iconBg: C.purpleBg, onPress: () => navigation.navigate('ManageAccount') },
                    ].map((item, i, arr) => (
                        <React.Fragment key={item.label}>
                            <TouchableOpacity
                                style={[st.menuItem, { padding: rs(14) }]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[st.menuIcon, {
                                    backgroundColor: item.iconBg,
                                    width: rs(38), height: rs(38),
                                    borderRadius: rs(12), marginRight: rs(14),
                                }]}>
                                    <Ionicons name={item.icon} size={rs(20)} color={item.iconColor} />
                                </View>
                                <Text style={{ flex: 1, fontSize: nz(15), fontWeight: '500', color: C.text }}>
                                    {item.label}
                                </Text>
                                <Ionicons name="chevron-forward" size={rs(18)} color={C.textSub} />
                            </TouchableOpacity>
                            {i < arr.length - 1 && (
                                <View style={{ height: 1, backgroundColor: C.divider, marginLeft: rs(66) }} />
                            )}
                        </React.Fragment>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    profileCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
    avatarWrapper: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    profileInfo: { flex: 1, justifyContent: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    editIcon: { justifyContent: 'center', alignItems: 'center' },
    menuCard: { borderWidth: 1, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center' },
    menuIcon: { justifyContent: 'center', alignItems: 'center' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});