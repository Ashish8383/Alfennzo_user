import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    View, Text, PanResponder, Animated, Platform,
    TextInput, TouchableOpacity, KeyboardAvoidingView,
    Keyboard, StyleSheet, ActivityIndicator, Vibration,
} from "react-native";
import { Ionicons }          from "@expo/vector-icons";
import { Audio, Video }      from "expo-av";
import { OtpInput }          from "react-native-otp-entry";
import { useShakeAnimation } from "../../hooks/useShakeAnimation";
import AuthService           from "../../api/apiService";
import { useToast }          from "../../context/ToastContext";
import { useResponsive }     from "../../utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme }          from "../../context/ThemeContext";

function useKeyboardVisible() {
    const [isVisible,      setIsVisible]      = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => { setIsVisible(true); setKeyboardHeight(e.endCoordinates.height); }
        );
        const hide = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => { setIsVisible(false); setKeyboardHeight(0); }
        );
        return () => { show.remove(); hide.remove(); };
    }, []);
    return { isVisible, keyboardHeight };
}

export default function WelcomeScreen() {
    const { rs, nz, SW: SCREEN_WIDTH, SH: SCREEN_HEIGHT } = useResponsive();
    const { isDark } = useTheme();
    const { isVisible: isKeyboardVisible } = useKeyboardVisible();
    const { shakeAnimation, startShake }   = useShakeAnimation();
    const { success, error, warning, loading, hideToast } = useToast();
    const insets = useSafeAreaInsets();

    const C = {
        cardBg:       isDark ? '#1C1F2E' : '#FFFFFF',
        cardBorder:   isDark ? '#2C3347' : 'rgba(0,0,0,0.08)',
        text:         isDark ? '#E2E6F0' : '#333333',
        textSub:      isDark ? '#8891A4' : '#666666',
        textMuted:    isDark ? '#4A5168' : '#999999',
        inputBg:      isDark ? '#13151F' : '#F5F5F5',
        inputBorder:  isDark ? '#2C3347' : '#E0E0E0',
        inputText:    isDark ? '#E2E6F0' : '#333333',
        placeholder:  isDark ? '#4A5168' : '#999999',
        divider:      isDark ? '#2C3347' : '#E0E0E0',
        green:        '#48BB78',
        greenDark:    '#43A047',
        greenDisabled:'#A0D9B8',
        otpBg:        isDark ? '#13151F' : '#F5F5F5',
        otpBorder:    isDark ? '#2C3347' : '#E0E0E0',
        otpText:      isDark ? '#E2E6F0' : '#333333',
        otpErrBg:     isDark ? '#2A1515' : '#FFF5F5',
        otpErrBorder: '#FF3B30',
        otpFocus:     '#48BB78',
        labelColor:   isDark ? '#8891A4' : '#666666',
        sliderTrackBg:'rgba(255,255,255,0.21)',
        sliderBorder: 'rgba(225,225,225,0.64)',
        sliderText:   'rgba(255,255,255,0.79)',
        sliderProgress:'rgba(72,187,120,0.3)',
        thumbBg:      '#FFFFFF',
    };

    const SLIDER_H_PAD  = rs(40);
    const SLIDER_WIDTH  = SCREEN_WIDTH - SLIDER_H_PAD;
    const THUMB_SIZE    = rs(56);
    const TRACK_HEIGHT  = rs(64);
    const TRACK_PADDING = rs(4);
    const THUMB_GAP     = TRACK_PADDING;
    const MAX_SLIDE     = SLIDER_WIDTH - THUMB_SIZE - THUMB_GAP * 2;
    const THRESHOLD     = MAX_SLIDE * 0.7;
    const ICON_SIZE     = THUMB_SIZE * 0.5;

    const [screenState,    setScreenState]    = useState("welcome");
    const [isSliding,      setIsSliding]      = useState(false);
    const [phoneNumber,    setPhoneNumber]    = useState("");
    const [isSubmitting,   setIsSubmitting]   = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpValue,       setOtpValue]       = useState("");
    const [otpError,       setOtpError]       = useState("");
    const [shakeOtp,       setShakeOtp]       = useState(false);
    const [resendTimer,    setResendTimer]    = useState(60);
    const [canResend,      setCanResend]      = useState(false);
    const [isResending,    setIsResending]    = useState(false);

    const videoRef         = useRef(null);
    const soundRef         = useRef(null);
    const phoneInputRef    = useRef(null);
    const otpInputRef      = useRef(null);
    const timerIntervalRef = useRef(null);
    const pulseAnimRef     = useRef(null);
    const slideAnim        = useRef(new Animated.Value(0)).current;
    const thumbPulseAnim   = useRef(new Animated.Value(0)).current;

    const thumbTranslate = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, MAX_SLIDE], extrapolate: "clamp" });
    const progressScale  = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" });
    const thumbScale     = thumbPulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.2, 1] });

    const startPulse = useCallback(() => {
        pulseAnimRef.current = Animated.loop(
            Animated.sequence([
                Animated.spring(thumbPulseAnim, { toValue: 1, duration: 100, useNativeDriver: true, speed: 1, bounciness: 8 }),
                Animated.spring(thumbPulseAnim, { toValue: 0, duration: 100, useNativeDriver: true, speed: 1, bounciness: 8 }),
            ])
        );
        pulseAnimRef.current.start();
    }, [thumbPulseAnim]);

    const stopPulse = useCallback(() => {
        if (pulseAnimRef.current) { pulseAnimRef.current.stop(); thumbPulseAnim.setValue(0); }
    }, [thumbPulseAnim]);

    useEffect(() => {
        if (screenState === "welcome" && !isSliding) startPulse();
        else stopPulse();
        return () => stopPulse();
    }, [screenState, isSliding, startPulse, stopPulse]);

    useEffect(() => {
        if (screenState === "otpInput" && resendTimer > 0) {
            timerIntervalRef.current = setInterval(() => {
                setResendTimer(prev => {
                    if (prev <= 1) { clearInterval(timerIntervalRef.current); setCanResend(true); return 0; }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [screenState, resendTimer]);

    useEffect(() => {
        if (screenState === "phoneInput") setTimeout(() => phoneInputRef.current?.focus(), 300);
    }, [screenState]);

    useEffect(() => {
        if (screenState === "otpInput") {
            setResendTimer(60); setCanResend(false); setIsResending(false);
            setOtpError(""); setOtpValue(""); setShakeOtp(false);
            setTimeout(() => otpInputRef.current?.focus(), 150);
        }
    }, [screenState]);

    useEffect(() => {
        let mounted = true;
        Audio.Sound.createAsync(
            require("../../../assets/sounds/swipe_success.mp3"),
            { shouldPlay: false, volume: 0.8 }
        ).then(({ sound }) => { if (mounted) soundRef.current = sound; })
         .catch(() => {});
        return () => { mounted = false; soundRef.current?.unloadAsync(); };
    }, []);

    useEffect(() => () => {
        if (timerIntervalRef.current)  clearInterval(timerIntervalRef.current);
        if (pulseAnimRef.current)      pulseAnimRef.current.stop();
        hideToast();
    }, [hideToast]);

    const handleSwipeComplete = useCallback(async () => {
        try { await soundRef.current?.replayAsync(); } catch {}
        Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 })
            .start(() => setScreenState("phoneInput"));
    }, [slideAnim]);

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => screenState === "welcome",
        onMoveShouldSetPanResponder:  (_, g) => Math.abs(g.dx) > rs(8) && Math.abs(g.dy) < rs(25),
        onPanResponderGrant: () => { setIsSliding(true); slideAnim.extractOffset(); },
        onPanResponderMove:  (_, g) => { slideAnim.setValue(Math.max(0, Math.min(1, g.dx / MAX_SLIDE))); },
        onPanResponderRelease: (_, g) => {
            setIsSliding(false); slideAnim.flattenOffset();
            if (g.dx > THRESHOLD) handleSwipeComplete();
            else Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 100, bounciness: 0 }).start();
        },
        onPanResponderTerminate: () => {
            setIsSliding(false);
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 100, bounciness: 0 }).start();
        },
    })).current;

    const handlePhoneChange = useCallback((text) => {
        const cleaned = text.replace(/\D/g, "");
        if (cleaned.length <= 10) setPhoneNumber(cleaned);
    }, []);

    const validateForm = useCallback(() => {
        if (!phoneNumber.trim()) { warning("Please enter your phone number"); phoneInputRef.current?.focus(); return false; }
        if (phoneNumber.length !== 10) { warning("Please enter a valid 10-digit phone number"); phoneInputRef.current?.focus(); return false; }
        return true;
    }, [phoneNumber, warning]);

    const handleSubmit = useCallback(async () => {
        Keyboard.dismiss();
        if (!validateForm()) return;
        setIsSubmitting(true); setOtpError("");
        loading("Sending OTP to your phone...");
        try {
            const result = await AuthService.login(phoneNumber);
            hideToast();
            if (result.success) { success(result.message || "OTP sent successfully!"); setScreenState("otpInput"); }
            else error(result.message || "Failed to send OTP");
        } catch { hideToast(); error("Something went wrong. Please try again later."); }
        finally { setIsSubmitting(false); }
    }, [phoneNumber, validateForm, loading, success, error, hideToast]);

    const handleOtpComplete = useCallback(async (otp) => {
        setIsVerifyingOtp(true); setOtpError(""); setOtpValue(otp);
        loading("Verifying OTP...");
        try {
            const result = await AuthService.verifyOTP(phoneNumber, otp);
            hideToast();
            if (result.success) { Keyboard.dismiss(); success(`Welcome ${result.user?.fullname || "back"}!`, 2000); }
            else {
                setOtpError(result.message || "Invalid OTP");
                setOtpValue(""); setShakeOtp(true);
                error(result.message || "Invalid OTP. Please try again.", 4000);
                startShake(); Vibration.vibrate(100); otpInputRef.current?.clear();
                setTimeout(() => { setShakeOtp(false); otpInputRef.current?.focus(); }, 600);
            }
        } catch {
            hideToast(); setOtpError("Something went wrong"); setOtpValue(""); setShakeOtp(true);
            error("Verification failed. Please try again.");
            startShake(); Vibration.vibrate(100); otpInputRef.current?.clear();
            setTimeout(() => { setShakeOtp(false); otpInputRef.current?.focus(); }, 600);
        } finally { setIsVerifyingOtp(false); }
    }, [phoneNumber, loading, success, error, hideToast, startShake]);

    const handleResendOtp = useCallback(async () => {
        if (!canResend || isResending) return;
        setIsResending(true); setOtpError("");
        loading("Resending OTP...");
        try {
            const result = await AuthService.resendOTP(phoneNumber);
            hideToast();
            if (result.success) {
                success("OTP sent again!");
                setResendTimer(60); setCanResend(false); setOtpValue("");
                otpInputRef.current?.clear();
            } else error(result.message || "Could not resend OTP");
        } catch { hideToast(); error("Failed to resend OTP"); }
        finally { setIsResending(false); }
    }, [canResend, isResending, phoneNumber, loading, success, error, hideToast]);

    const handleEditNumber = useCallback(() => {
        setScreenState("phoneInput"); setOtpError(""); setOtpValue(""); setShakeOtp(false); hideToast();
    }, [hideToast]);

    const formatTimer = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

    const otpTheme = useMemo(() => ({
        containerStyle: { width: "100%", flexDirection: "row", justifyContent: "space-evenly", marginBottom: rs(20) },
        pinCodeContainerStyle: {
            width: rs(48), height: rs(56),
            backgroundColor: otpError ? C.otpErrBg    : C.otpBg,
            borderColor:     otpError ? C.otpErrBorder : C.otpBorder,
            borderRadius: rs(12), borderWidth: rs(2),
        },
        pinCodeTextStyle:           { fontSize: nz(20), color: otpError ? C.otpErrBorder : C.otpText },
        focusedPinCodeContainerStyle: { borderColor: otpError ? C.otpErrBorder : C.otpFocus, borderWidth: rs(2.5) },
    }), [rs, nz, otpError, isDark]);

    const renderWelcome = () => (
        <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center" }}>
            <View style={{ paddingBottom: Math.max(insets.bottom + rs(30)), alignItems: "center", paddingHorizontal: rs(20) }}>
                <View style={{
                    width: SLIDER_WIDTH, height: TRACK_HEIGHT,
                    borderRadius: TRACK_HEIGHT / 2,
                    backgroundColor: C.sliderTrackBg,
                    justifyContent: "center", alignItems: "center",
                    overflow: "hidden", borderWidth: rs(1.5), borderColor: C.sliderBorder,
                    marginTop: rs(50),
                }}>
                    <Text style={{ color: C.sliderText, position: "absolute", zIndex: 1, fontWeight: "600", letterSpacing: 1, fontSize: nz(16), paddingLeft: THUMB_SIZE + THUMB_GAP * -1 }}>
                        Slide to Get Started
                    </Text>
                    <Animated.View style={{
                        position: "absolute", left: 0, top: 0,
                        width: SLIDER_WIDTH, height: TRACK_HEIGHT,
                        borderRadius: TRACK_HEIGHT / 2,
                        backgroundColor: C.sliderProgress,
                        transform: [{ scaleX: progressScale }],
                        transformOrigin: "0% 50%",
                    }} />
                    <Animated.View
                        style={{
                            position: "absolute",
                            width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
                            top: (TRACK_HEIGHT - THUMB_SIZE) / 4, left: THUMB_GAP,
                            backgroundColor: C.thumbBg,
                            justifyContent: "center", alignItems: "center",
                            zIndex: 2, elevation: 8,
                            shadowColor: "#000", shadowOffset: { width: 0, height: rs(3) },
                            shadowOpacity: 0.3, shadowRadius: rs(6),
                            transform: [{ translateX: thumbTranslate }, { scale: isSliding ? 1 : thumbScale }],
                        }}
                        {...panResponder.panHandlers}
                    >
                        <Ionicons name="chevron-forward" size={ICON_SIZE} color={C.green} />
                    </Animated.View>
                </View>
            </View>
        </View>
    );

    const renderPhoneInput = () => (
        <View style={{ width: "100%" }}>
            <Text style={{ color: C.labelColor, fontWeight: "600", letterSpacing: 1.5, fontSize: nz(13), marginBottom: rs(10), marginLeft: rs(4) }}>
                PHONE NUMBER
            </Text>
            <View style={{
                flexDirection: "row", alignItems: "center",
                borderRadius: rs(14), borderWidth: rs(1),
                borderColor: C.inputBorder, backgroundColor: C.inputBg,
                paddingHorizontal: rs(18),
                paddingVertical: Platform.OS === "ios" ? rs(16) : rs(14),
                marginBottom: rs(18),
            }}>
                <Ionicons name="call-outline" size={rs(22)} color={C.textSub} />
                <Text style={{ fontSize: nz(17), color: C.text, fontWeight: "700", marginLeft: rs(10), marginRight: rs(10) }}>+91</Text>
                <View style={{ width: rs(1.5), height: rs(22), backgroundColor: C.divider, marginRight: rs(10) }} />
                <TextInput
                    ref={phoneInputRef}
                    style={{ flex: 1, padding: 0, color: C.inputText, fontWeight: "500", letterSpacing: 1, fontSize: nz(17) }}
                    placeholder="**********"
                    placeholderTextColor={C.placeholder}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={10}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    editable={!isSubmitting}
                />
            </View>
            <TouchableOpacity
                style={{
                    flexDirection: "row", justifyContent: "center", alignItems: "center",
                    backgroundColor: isSubmitting ? C.greenDisabled : C.green,
                    borderRadius: rs(28), paddingVertical: rs(18),
                    elevation: 4, shadowColor: C.green,
                    shadowOffset: { width: 0, height: rs(4) },
                    shadowOpacity: 0.3, shadowRadius: rs(8),
                }}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
            >
                {isSubmitting ? (
                    <>
                        <ActivityIndicator size="small" color="#fff" style={{ marginRight: rs(10) }} />
                        <Text style={{ fontSize: nz(17), color: "#fff", fontWeight: "bold" }}>Sending OTP...</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="checkmark-circle" size={rs(24)} color="#fff" />
                        <Text style={{ fontSize: nz(17), color: "#fff", fontWeight: "bold", marginLeft: rs(10) }}>Verify & Continue</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderOtpInput = () => (
        <TouchableOpacity style={{ width: "100%" }} activeOpacity={1} onPress={() => otpInputRef.current?.focus()}>
            <Animated.View style={[{ alignItems: "center", paddingVertical: rs(10) }, shakeOtp && { transform: [{ translateX: shakeAnimation }] }]}>
                <Text style={{ color: C.text, fontWeight: "bold", letterSpacing: 1.5, textAlign: "center", fontSize: nz(13), marginBottom: rs(10) }}>
                    ENTER VERIFICATION CODE
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: rs(24) }}>
                    <Text style={{ color: C.textSub, textAlign: "center", lineHeight: nz(20), fontSize: nz(12) }}>
                        Code sent to{" "}
                        <Text style={{ fontWeight: "700", color: C.text }}>+91 {phoneNumber}</Text>
                    </Text>
                    <TouchableOpacity onPress={handleEditNumber} style={{ padding: rs(4), marginLeft: rs(6) }}>
                        <Ionicons name="pencil" size={rs(16)} color={C.green} />
                    </TouchableOpacity>
                </View>

                <OtpInput
                    ref={otpInputRef}
                    numberOfDigits={6}
                    onFilled={handleOtpComplete}
                    focusColor={otpError ? "#FF3B30" : C.green}
                    focusStickBlinkingDuration={500}
                    placeholder="●"
                    theme={otpTheme}
                    disabled={isVerifyingOtp}
                />

                {otpError ? (
                    <Text style={{ fontSize: nz(12), color: "#FF3B30", fontWeight: "500", marginTop: -rs(10), marginBottom: rs(8), textAlign: "center" }}>
                        {otpError}
                    </Text>
                ) : null}

                {isVerifyingOtp ? (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: rs(10), marginBottom: rs(8) }}>
                        <ActivityIndicator size="small" color={C.green} />
                        <Text style={{ fontSize: nz(14), color: C.green, fontWeight: "500", marginLeft: rs(8) }}>Verifying...</Text>
                    </View>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: rs(4), minHeight: rs(24) }}>
                    {!canResend ? (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="time-outline" size={rs(16)} color={C.textMuted} />
                            <Text style={{ fontSize: nz(13), color: C.textMuted, fontWeight: "500", marginLeft: rs(4) }}>
                                Resend OTP in {formatTimer(resendTimer)}
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={{ flexDirection: "row", alignItems: "center", padding: rs(8) }}
                            onPress={handleResendOtp}
                            disabled={isResending}
                        >
                            {isResending
                                ? <ActivityIndicator size="small" color={C.green} style={{ marginRight: rs(4) }} />
                                : <Ionicons name="refresh-outline" size={rs(16)} color={C.green} style={{ marginRight: rs(4) }} />
                            }
                            <Text style={{ fontSize: nz(13), fontWeight: "600", textDecorationLine: "underline", color: isResending ? C.textMuted : C.green }}>
                                {isResending ? "Resending..." : "Resend OTP"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: "#000" }}>
            {/* Video BG — always fullscreen, unaffected by theme */}
            <Video
                ref={videoRef}
                source={require("../../../assets/videos/welcome_bg.mp4")}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                shouldPlay isLooping isMuted
            />
            {/* Overlay — slightly darker in dark mode */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.30)" }]} />

            {screenState === "welcome" ? (
                renderWelcome()
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="height" keyboardVerticalOffset={0}>
                    <View style={{
                        flex: 1, justifyContent: "flex-end", alignItems: "center",
                        paddingHorizontal: rs(20),
                        paddingBottom: Math.max(insets.bottom),
                    }}>
                        {/* Card — fully themed */}
                        <View style={{
                            width: "100%",
                            backgroundColor: C.cardBg,
                            borderRadius: rs(24), padding: rs(24),
                            borderWidth: rs(1), borderColor: C.cardBorder,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: rs(4) },
                            shadowOpacity: isDark ? 0.4 : 0.15,
                            shadowRadius: rs(12), elevation: 8,
                        }}>
                            {screenState === "phoneInput" ? renderPhoneInput() : renderOtpInput()}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}