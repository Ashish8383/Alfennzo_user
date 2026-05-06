import React, { useState, useRef, useEffect } from "react";
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    StatusBar, Linking, ActivityIndicator,
    Animated, Modal, TextInput, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useResponsive } from "../../utils/responsive";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import AuthService from "../../api/apiService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PrivacyDataScreen() {
    const { rs, nz } = useResponsive();
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const { success, error } = useToast();
    const navigation = useNavigation();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleteStep, setDeleteStep] = useState(1); // 1: confirmation, 2: type confirmation

    // Animation refs
    const modalScaleAnim = useRef(new Animated.Value(0)).current;
    const modalOpacityAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const C = {
        bg:         isDark ? '#0D0F14' : '#F5F7FA',
        card:       isDark ? '#1C1F2E' : '#FFFFFF',
        cardBorder: isDark ? '#2C3347' : '#E8EAF0',
        text:       isDark ? '#E2E6F0' : '#1A1D23',
        textSub:    isDark ? '#8891A4' : '#6B7591',
        textMuted:  isDark ? '#4A5168' : '#9EA8BB',
        iconBg:     isDark ? '#1A1F2E' : '#F4F6FB',
        divider:    isDark ? '#2C3347' : '#E8EAF0',
        purpleBg:   isDark ? '#1E1A38' : '#EDE7F6',
        purple:     isDark ? '#B39DDB' : '#6A1B9A',
        blueBg:     isDark ? '#1B2A4A' : '#E3F2FD',
        blue:       isDark ? '#64B5F6' : '#1976D2',
        tealBg:     isDark ? '#132238' : '#E0F7FA',
        teal:       isDark ? '#4DD0E1' : '#00838F',
        redBg:      isDark ? '#2A1515' : '#FFEBEE',
        red:        isDark ? '#EF9A9A' : '#C62828',
        redDark:    isDark ? '#FF5252' : '#D32F2F',
        modalBg:    isDark ? '#1C1F2E' : '#FFFFFF',
        modalOverlay: 'rgba(0,0,0,0.75)',
        inputBg:    isDark ? '#13151F' : '#F5F5F5',
        inputBorder: isDark ? '#2C3347' : '#E0E0E0',
        inputText:  isDark ? '#E2E6F0' : '#1A1D23',
        warningBg:  isDark ? '#2A1515' : '#FFF3E0',
        warningBorder: isDark ? '#4A1515' : '#FFE0B2',
    };

    // Open modal animation
    const openDeleteModal = () => {
        setShowDeleteModal(true);
        setDeleteStep(1);
        setConfirmText('');
        
        Animated.parallel([
            Animated.spring(modalScaleAnim, {
                toValue: 1,
                damping: 15,
                stiffness: 100,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // Close modal animation
    const closeDeleteModal = () => {
        Animated.parallel([
            Animated.timing(modalScaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowDeleteModal(false);
            setDeleteStep(1);
            setConfirmText('');
        });
    };

    // Shake animation for wrong input
    const shakeModal = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const openURL = async (url) => {
        try {
            if (await Linking.canOpenURL(url)) await Linking.openURL(url);
            else error("Unable to open this link");
        } catch { error("Something went wrong"); }
    };

    const handleDeleteConfirm = () => {
        if (deleteStep === 1) {
            // Move to step 2 - type confirmation
            setDeleteStep(2);
        } else if (deleteStep === 2) {
            // Check if user typed DELETE correctly
            if (confirmText.trim().toUpperCase() === 'DELETE') {
                executeDelete();
            } else {
                shakeModal();
                error("Please type DELETE to confirm");
            }
        }
    };

    const executeDelete = async () => {
        try {
            setDeleting(true);
            const res = await AuthService.deleteAccount();
            if (res.success) {
                closeDeleteModal();
                setTimeout(() => success("Account deleted successfully"), 300);
            } else {
                closeDeleteModal();
                setTimeout(() => error(res.message || "Failed to delete account"), 300);
            }
        } catch {
            closeDeleteModal();
            setTimeout(() => error("Something went wrong"), 300);
        } finally {
            setDeleting(false);
        }
    };

    const items = [
        { label: 'About Us',         icon: 'information-circle-outline', color: C.purple, bg: C.purpleBg, url: 'https://www.alfennzo.com/about-us' },
        { label: 'Privacy Policy',   icon: 'document-text-outline',      color: C.blue,   bg: C.blueBg,   url: 'https://www.alfennzo.com/privacy-policy' },
        { label: 'Terms of Service', icon: 'reader-outline',             color: C.teal,   bg: C.tealBg,   url: 'https://www.alfennzo.com/terms-and-conditions' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

            {/* Header */}
            <View style={[st.header, {
                paddingTop: insets.top + rs(20),
                paddingHorizontal: rs(20), paddingBottom: rs(16),
                backgroundColor: C.bg,
            }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[st.backBtn, { backgroundColor: C.iconBg, width: rs(40), height: rs(40), borderRadius: rs(20) }]}
                >
                    <Ionicons name="arrow-back" size={rs(22)} color={C.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: nz(20), fontWeight: '700', color: C.text, marginLeft: rs(12) }}>
                    Privacy & Data
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: rs(20), paddingBottom: rs(100) }}>
                <Text style={{ fontSize: nz(14), color: C.textSub, marginBottom: rs(24), lineHeight: nz(22) }}>
                    Manage your privacy settings and account data.
                </Text>

                {/* Menu Card */}
                <View style={[st.card, { borderRadius: rs(18), backgroundColor: C.card, borderColor: C.cardBorder, marginBottom: rs(24) }]}>
                    {items.map((item, i) => (
                        <React.Fragment key={item.label}>
                            <TouchableOpacity
                                style={[st.menuItem, { padding: rs(14) }]}
                                onPress={() => openURL(item.url)}
                                activeOpacity={0.7}
                            >
                                <View style={[st.menuIcon, { backgroundColor: item.bg, width: rs(38), height: rs(38), borderRadius: rs(12), marginRight: rs(14) }]}>
                                    <Ionicons name={item.icon} size={rs(20)} color={item.color} />
                                </View>
                                <Text style={{ flex: 1, fontSize: nz(15), fontWeight: '600', color: C.text }}>{item.label}</Text>
                                <Ionicons name="open-outline" size={rs(17)} color={C.textMuted} />
                            </TouchableOpacity>
                            {i < items.length - 1 && <View style={{ height: 1, backgroundColor: C.divider, marginLeft: rs(66) }} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Delete Card */}
                <TouchableOpacity
                    style={[st.menuItem, {
                        padding: rs(14), borderRadius: rs(18),
                        backgroundColor: C.redBg,
                        borderWidth: 1,
                        borderColor: isDark ? '#4A1515' : 'rgba(211,47,47,0.2)',
                        opacity: deleting ? 0.6 : 1,
                    }]}
                    onPress={openDeleteModal}
                    activeOpacity={0.7}
                    disabled={deleting}
                >
                    <View style={[st.menuIcon, {
                        backgroundColor: isDark ? '#3A1515' : 'rgba(211,47,47,0.1)',
                        width: rs(38), height: rs(38), borderRadius: rs(12), marginRight: rs(14),
                    }]}>
                        {deleting
                            ? <ActivityIndicator size={rs(18)} color={C.red} />
                            : <Ionicons name="trash-outline" size={rs(20)} color={C.red} />
                        }
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: nz(15), fontWeight: '600', color: C.red }}>
                            {deleting ? "Deleting Account..." : "Delete Account & Data"}
                        </Text>
                        <Text style={{ fontSize: nz(11), fontWeight: '500', color: C.red, marginTop: rs(2), opacity: 0.7 }}>
                            This action cannot be undone
                        </Text>
                    </View>
                    {!deleting && <Ionicons name="chevron-forward" size={rs(18)} color={C.red} />}
                </TouchableOpacity>
            </ScrollView>

            {/* Custom Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="none"
                onRequestClose={closeDeleteModal}
                statusBarTranslucent
            >
                <View style={st.modalContainer}>
                    {/* Overlay */}
                    <Animated.View 
                        style={[
                            st.modalOverlay,
                            { opacity: modalOpacityAnim }
                        ]}
                    >
                        <TouchableOpacity 
                            style={st.modalOverlayTouch} 
                            activeOpacity={1} 
                            onPress={closeDeleteModal}
                        />
                    </Animated.View>

                    {/* Modal Content */}
                    <Animated.View 
                        style={[
                            st.modalContent,
                            {
                                backgroundColor: C.modalBg,
                                borderRadius: rs(24),
                                width: Math.min(SCREEN_WIDTH - rs(40), 400),
                                transform: [
                                    { scale: modalScaleAnim },
                                    { translateX: shakeAnim }
                                ],
                            }
                        ]}
                    >
                        {/* Warning Icon */}
                        <View style={st.modalIconContainer}>
                            <View style={[st.modalIconBg, { 
                                backgroundColor: C.warningBg,
                                borderColor: C.warningBorder,
                                width: rs(64), 
                                height: rs(64), 
                                borderRadius: rs(32) 
                            }]}>
                                <Ionicons 
                                    name="warning" 
                                    size={rs(32)} 
                                    color={C.redDark} 
                                />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={[st.modalTitle, { 
                            fontSize: nz(20), 
                            color: C.text,
                            marginTop: rs(16)
                        }]}>
                            Delete Account
                        </Text>

                        {/* Description */}
                        <Text style={[st.modalDescription, { 
                            fontSize: nz(14), 
                            color: C.textSub,
                            marginTop: rs(8),
                            marginBottom: rs(20)
                        }]}>
                            {deleteStep === 1 
                                ? "This will permanently delete your account and all associated data. This action cannot be reversed."
                                : 'Type "DELETE" to confirm you want to permanently remove your account.'
                            }
                        </Text>

                        {/* Step 2: Text Input */}
                        {deleteStep === 2 && (
                            <View style={[st.inputContainer, {
                                backgroundColor: C.inputBg,
                                borderColor: C.inputBorder,
                                borderRadius: rs(12),
                                marginBottom: rs(20),
                            }]}>
                                <TextInput
                                    style={[st.input, {
                                        fontSize: nz(16),
                                        color: C.inputText,
                                    }]}
                                    placeholder='Type "DELETE" here'
                                    placeholderTextColor={C.textMuted}
                                    value={confirmText}
                                    onChangeText={setConfirmText}
                                    autoCapitalize="characters"
                                    autoFocus
                                />
                            </View>
                        )}

                        {/* Warning Box */}
                        {deleteStep === 2 && (
                            <View style={[st.warningBox, {
                                backgroundColor: C.warningBg,
                                borderColor: C.warningBorder,
                                borderRadius: rs(12),
                                padding: rs(12),
                                marginBottom: rs(20),
                            }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                    <Ionicons name="alert-circle" size={rs(16)} color={C.redDark} style={{ marginRight: rs(8), marginTop: 2 }} />
                                    <Text style={{ flex: 1, fontSize: nz(12), color: C.redDark, lineHeight: nz(18) }}>
                                        Once deleted, your data cannot be recovered. Consider exporting your data first.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Buttons */}
                        <View style={st.buttonContainer}>
                            <TouchableOpacity
                                style={[st.cancelButton, {
                                    backgroundColor: C.iconBg,
                                    borderRadius: rs(12),
                                    paddingVertical: rs(12),
                                }]}
                                onPress={closeDeleteModal}
                                activeOpacity={0.7}
                            >
                                <Text style={[st.cancelButtonText, {
                                    fontSize: nz(15),
                                    color: C.text,
                                }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[st.deleteButton, {
                                    backgroundColor: C.redDark,
                                    borderRadius: rs(12),
                                    paddingVertical: rs(12),
                                    opacity: (deleteStep === 2 && confirmText.trim().toUpperCase() !== 'DELETE') ? 0.5 : 1,
                                }]}
                                onPress={handleDeleteConfirm}
                                activeOpacity={0.7}
                                disabled={deleteStep === 2 && confirmText.trim().toUpperCase() !== 'DELETE'}
                            >
                                {deleting ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={[st.deleteButtonText, {
                                        fontSize: nz(15),
                                    }]}>
                                        {deleteStep === 1 ? "Continue" : "Delete Forever"}
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

const st = StyleSheet.create({
    header:   { flexDirection: 'row', alignItems: 'center' },
    backBtn:  { justifyContent: 'center', alignItems: 'center' },
    card:     { borderWidth: 1, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', alignItems: 'center' },
    menuIcon: { justifyContent: 'center', alignItems: 'center' },
    
    // Modal styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.75)',
    },
    modalOverlayTouch: {
        flex: 1,
    },
    modalContent: {
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconContainer: {
        marginTop: 8,
    },
    modalIconBg: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    modalTitle: {
        fontWeight: '700',
        textAlign: 'center',
    },
    modalDescription: {
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    inputContainer: {
        width: '100%',
        borderWidth: 1,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    warningBox: {
        width: '100%',
        borderWidth: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});