// screens/ChatSupport/ChatSupportScreen.js
import React, {
    useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, Dimensions, ActivityIndicator, Image,
    Alert, Keyboard, Platform, Modal, StatusBar, Pressable,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Audio } from 'expo-av';
import { useResponsive } from '../../utils/responsive';
import { ChatwootService } from '../../utils/chatwoot';
import ChatwootAPI from '../../api/chatwootApi';
import useAuthStore from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';

const { width: SW, height: SH } = Dimensions.get('window');

// Sound references
let sendSound = null;
let receiveSound = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (ts) => {
    if (!ts) return '';
    return new Date(typeof ts === 'number' ? ts * 1000 : ts)
        .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const fmtDate = (ts) => {
    if (!ts) return '';
    const d    = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    const now  = new Date();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString())  return 'Today';
    if (d.toDateString() === yest.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    });
};
const withSeps = (msgs) => {
    const r = []; let ld = null;
    msgs.forEach(m => {
        const d = m.created_at
            ? new Date(typeof m.created_at === 'number' ? m.created_at * 1000 : m.created_at).toDateString()
            : null;
        if (d && d !== ld) {
            r.push({ _sep: true, label: fmtDate(m.created_at), _id: `s_${d}` });
            ld = d;
        }
        r.push(m);
    });
    return r;
};

// ─── Audio Helper Functions ──────────────────────────────────────────────────
const loadSounds = async () => {
    try {
        const { sound: sendSnd } = await Audio.Sound.createAsync(
            require('../../../assets/sounds/send.mp3'),
            { volume: 0.5, shouldPlay: false }
        );
        sendSound = sendSnd;

        const { sound: receiveSnd } = await Audio.Sound.createAsync(
            require('../../../assets/sounds/res.mp3'),
            { volume: 0.5, shouldPlay: false }
        );
        receiveSound = receiveSnd;
    } catch (error) {
        console.log('Error loading sounds:', error);
    }
};

const playSendSound = async () => {
    try {
        if (sendSound) await sendSound.replayAsync();
    } catch (error) {
        console.log('Error playing send sound:', error);
    }
};

const playReceiveSound = async () => {
    try {
        if (receiveSound) await receiveSound.replayAsync();
    } catch (error) {
        console.log('Error playing receive sound:', error);
    }
};

const unloadSounds = async () => {
    try {
        if (sendSound)    { await sendSound.unloadAsync();    sendSound    = null; }
        if (receiveSound) { await receiveSound.unloadAsync(); receiveSound = null; }
    } catch (error) {
        console.log('Error unloading sounds:', error);
    }
};

// ─── Design Tokens ────────────────────────────────────────────────────────────
//  All colours used in makeStyles are derived from these palettes so every
//  shade is intentional and nothing "falls through" to a light-mode default.
const LIGHT = {
    // Body canvas — a warm, slightly off-white that reads as chat background
    bodyBg:            '#ECEEF3',
    // Bubbles
    outBubble:         '#43A047',   // outgoing green
    outBubbleText:     '#FFFFFF',
    outBubbleTime:     'rgba(255,255,255,0.80)',
    outTick:           'rgba(255,255,255,0.85)',
    inBubble:          '#FFFFFF',
    inBubbleBorder:    '#DDE1EA',
    inBubbleText:      '#1A1D23',
    inBubbleTime:      '#8891A4',
    inTick:            '#43A047',
    // Template/auto-response bubble
    templateBubble:    '#F8FAFB',
    templateBorder:    '#DDE1EA',
    templateText:      '#1A1D23',
    templateLabelBg:   '#E8F0FE',
    templateLabelText: '#4051B5',
    // Date separator
    sepBg:             '#FFFFFF',
    sepBorder:         '#DDE1EA',
    sepText:           '#717D92',
    // Activity badge
    actBg:             '#F0F2F8',
    actBorder:         '#DDE1EA',
    actText:           '#717D92',
    // Input bar
    inputBarBg:        '#FFFFFF',
    inputBarBorder:    '#E0E3EB',
    pillBg:            '#F4F6FB',
    pillBorder:        '#DDE1EA',
    inputText:         '#1A1D23',
    inputPlaceholder:  '#9EA8BB',
    // Send button
    sendActive:        '#43A047',
    sendShadow:        '#43A047',
    sendInactive:      '#CDD1DA',
    // Attach button
    attachBg:          '#EAF4EA',
    attachIcon:        '#43A047',
    // Quick replies
    qrBg:             '#EAF4EA',
    qrBorder:         '#C3DFC3',
    qrText:           '#2E7D32',
    // Header
    headerBg:          '#FFFFFF',
    headerBorder:      '#E0E3EB',
    headerTitle:       '#1A1D23',
    headerStatus:      '#8891A4',
    headerIconBg:      '#F4F6FB',
    // Avatar
    avatarBg:          '#EAF4EA',
    avatarBorder:      '#C3DFC3',
    agentAvatarBg:     '#E3F2FD',
    agentAvatarIcon:   '#1976D2',
    // Welcome card
    welcomeCardBg:     '#FFFFFF',
    welcomeIconBg:     '#EAF4EA',
    welcomeTitle:      '#1A1D23',
    welcomeText:       '#717D92',
    // Error/load card
    cardBg:            '#FFFFFF',
    errIconBg:         '#FFEBEE',
    // Icon button background
    iconBg:            '#F4F6FB',
    backIcon:          '#1A1D23',
    // Preview close
    previewCloseBg:    'rgba(255,255,255,0.20)',
};

const DARK = {
    bodyBg:            '#0D0F14',
    outBubble:         '#1B5E20',
    outBubbleText:     '#E8F5E9',
    outBubbleTime:     'rgba(232,245,233,0.65)',
    outTick:           'rgba(232,245,233,0.80)',
    inBubble:          '#1E2330',
    inBubbleBorder:    '#2C3347',
    inBubbleText:      '#E2E6F0',
    inBubbleTime:      '#6B7591',
    inTick:            '#66BB6A',
    // Template/auto-response bubble
    templateBubble:    '#1A1F2E',
    templateBorder:    '#2C3347',
    templateText:      '#E2E6F0',
    templateLabelBg:   '#1B2340',
    templateLabelText: '#7986CB',
    // Date separator
    sepBg:             '#1A1F2E',
    sepBorder:         '#2C3347',
    sepText:           '#6B7591',
    // Activity badge
    actBg:             '#161A27',
    actBorder:         '#252C3E',
    actText:           '#6B7591',
    // Input bar
    inputBarBg:        '#131722',
    inputBarBorder:    '#252C3E',
    pillBg:            '#1A1F2E',
    pillBorder:        '#2C3347',
    inputText:         '#E2E6F0',
    inputPlaceholder:  '#4A5168',
    // Send button
    sendActive:        '#2E7D32',
    sendShadow:        '#1B5E20',
    sendInactive:      '#2A2F42',
    // Attach button
    attachBg:          '#1B2A1C',
    attachIcon:        '#66BB6A',
    // Quick replies
    qrBg:             '#1B2A1C',
    qrBorder:         '#2C4F2E',
    qrText:           '#81C784',
    // Header
    headerBg:          '#131722',
    headerBorder:      '#252C3E',
    headerTitle:       '#E2E6F0',
    headerStatus:      '#6B7591',
    headerIconBg:      '#1A1F2E',
    // Avatar
    avatarBg:          '#1B2A1C',
    avatarBorder:      '#2C4F2E',
    agentAvatarBg:     '#132238',
    agentAvatarIcon:   '#64B5F6',
    // Welcome card
    welcomeCardBg:     '#1A1F2E',
    welcomeIconBg:     '#1B2A1C',
    welcomeTitle:      '#E2E6F0',
    welcomeText:       '#6B7591',
    // Error/load card
    cardBg:            '#1A1F2E',
    errIconBg:         '#2A1515',
    // Icon button background
    iconBg:            '#1A1F2E',
    backIcon:          '#E2E6F0',
    // Preview close
    previewCloseBg:    'rgba(255,255,255,0.15)',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const makeStyles = (rs, nz, theme, isDark) => {
    const { width: SW, height: SH } = Dimensions.get('window');
    const MSG_W = SW * 0.76;
    const C = isDark ? DARK : LIGHT;   // active colour palette

    return StyleSheet.create({
        root: { flex: 1, backgroundColor: theme.background },

        // ── Header ──────────────────────────────────────────────────────────
        header: {
            backgroundColor: C.headerBg,
            paddingVertical: rs(10),
            paddingHorizontal: rs(16),
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.headerBorder,
        },
        headerRow: { flexDirection: 'row', alignItems: 'center' },
        backBtn: {
            width: rs(38), height: rs(38), borderRadius: rs(19),
            backgroundColor: C.iconBg,
            justifyContent: 'center', alignItems: 'center',
            marginRight: rs(10),
        },
        avatar: {
            width: rs(40), height: rs(40), borderRadius: rs(20),
            backgroundColor: C.avatarBg,
            justifyContent: 'center', alignItems: 'center',
            marginRight: rs(10),
            borderWidth: 1.5, borderColor: C.avatarBorder,
        },
        headerInfo: { flex: 1 },
        headerTitle: {
            color: C.headerTitle,
            fontWeight: '700', fontSize: nz(16), letterSpacing: 0.1,
        },
        headerSub: { flexDirection: 'row', alignItems: 'center', marginTop: rs(2) },
        statusDot: { width: rs(7), height: rs(7), borderRadius: rs(4), marginRight: rs(5) },
        headerStatus: {
            color: C.headerStatus,
            fontSize: nz(12), fontWeight: '500',
        },

        // ── Sound toggle ─────────────────────────────────────────────────────
        soundToggleBtn: {
            width: rs(36), height: rs(36), borderRadius: rs(18),
            backgroundColor: C.iconBg,
            justifyContent: 'center', alignItems: 'center',
            marginLeft: rs(6),
        },

        // ── Quick replies ────────────────────────────────────────────────────
        quickReplies: {
            flexDirection: 'row', flexWrap: 'wrap', gap: rs(8),
            paddingHorizontal: rs(14), paddingVertical: rs(10),
            backgroundColor: C.headerBg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: C.headerBorder,
        },
        qrChip: {
            paddingHorizontal: rs(14), paddingVertical: rs(7),
            borderRadius: rs(18),
            backgroundColor: C.qrBg,
            borderWidth: 1, borderColor: C.qrBorder,
        },
        qrText: {
            color: C.qrText,
            fontSize: nz(13), fontWeight: '600',
        },

        // ── Body ─────────────────────────────────────────────────────────────
        body: { flex: 1, backgroundColor: C.bodyBg },

        // ── Message list ─────────────────────────────────────────────────────
        msgList: {
            paddingHorizontal: rs(14), paddingTop: rs(14),
            paddingBottom: rs(6), flexGrow: 1,
        },

        // ── Date separator ───────────────────────────────────────────────────
        sepWrap: { alignItems: 'center', marginVertical: rs(14) },
        sepBadge: {
            backgroundColor: C.sepBg,
            paddingHorizontal: rs(14), paddingVertical: rs(5),
            borderRadius: rs(18),
            borderWidth: 1, borderColor: C.sepBorder,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.18 : 0.05,
            shadowRadius: 4, elevation: 2,
        },
        sepText: {
            color: C.sepText,
            fontWeight: '600', fontSize: nz(11),
            textTransform: 'uppercase', letterSpacing: 0.8,
        },

        // ── Bubbles ──────────────────────────────────────────────────────────
        msgRow: {
            flexDirection: 'row', marginVertical: rs(3), paddingHorizontal: rs(2),
        },
        msgRowR: { justifyContent: 'flex-end' },
        msgRowL: { justifyContent: 'flex-start' },
        agentAvatar: {
            width: rs(30), height: rs(30), borderRadius: rs(15),
            backgroundColor: C.agentAvatarBg,
            justifyContent: 'center', alignItems: 'center',
            marginRight: rs(7), alignSelf: 'flex-end', marginBottom: rs(3),
        },
        bubbleWrap: { maxWidth: MSG_W },
        bubble: {
            borderRadius: rs(18),
            paddingHorizontal: rs(14), paddingVertical: rs(10),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.20 : 0.05,
            shadowRadius: 4, elevation: 2,
        },
        bubbleR: {
            backgroundColor: C.outBubble,
            borderBottomRightRadius: rs(4),
        },
        bubbleL: {
            backgroundColor: C.inBubble,
            borderBottomLeftRadius: rs(4),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: C.inBubbleBorder,
        },
        // Template/auto-response bubble style
        bubbleTemplate: {
            backgroundColor: C.templateBubble,
            borderBottomLeftRadius: rs(4),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: C.templateBorder,
            borderStyle: 'dashed',
        },
        bubbleTxt: {
            fontSize: nz(14.5), lineHeight: nz(21.5), letterSpacing: 0.1,
        },
        bubbleFoot: {
            flexDirection: 'row', justifyContent: 'flex-end',
            alignItems: 'center', marginTop: rs(4), gap: rs(3),
        },
        bubbleTime: { fontSize: nz(10.5), fontWeight: '500' },
        
        // Template label
        templateLabel: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: rs(6),
            paddingTop: rs(6),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: C.templateBorder,
        },
        templateLabelBadge: {
            backgroundColor: C.templateLabelBg,
            paddingHorizontal: rs(8),
            paddingVertical: rs(3),
            borderRadius: rs(10),
            flexDirection: 'row',
            alignItems: 'center',
            gap: rs(4),
        },
        templateLabelText: {
            color: C.templateLabelText,
            fontSize: nz(10),
            fontWeight: '600',
            letterSpacing: 0.3,
        },

        // Attachment image
        imgWrap: { marginTop: rs(6), borderRadius: rs(12), overflow: 'hidden' },
        msgImg: {
            width: SW * 0.62, height: SW * 0.44,
            borderRadius: rs(12),
            backgroundColor: isDark ? '#252C3E' : '#E0E3EB',
        },
        uploading: {
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: isDark ? 'rgba(0,0,0,0.60)' : 'rgba(255,255,255,0.60)',
            borderRadius: rs(18),
            justifyContent: 'center', alignItems: 'center',
        },

        // Activity / system badge
        actWrap: { alignItems: 'center', marginVertical: rs(7), paddingHorizontal: rs(28) },
        actBadge: {
            backgroundColor: C.actBg,
            paddingHorizontal: rs(12), paddingVertical: rs(5),
            borderRadius: rs(14),
            borderWidth: 1, borderColor: C.actBorder,
        },
        actTxt: {
            color: C.actText,
            fontSize: nz(11.5), fontWeight: '500', textAlign: 'center',
        },

        // Deleted message
        deletedBubble: { opacity: 0.55 },
        deletedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
        deletedIcon: { marginRight: 2 },

        // ── Welcome empty state ──────────────────────────────────────────────
        emptyWrap: {
            flex: 1, justifyContent: 'center', alignItems: 'center',
            paddingHorizontal: rs(24),
        },
        welcomeCard: {
            backgroundColor: C.welcomeCardBg,
            width: '100%', borderRadius: rs(20),
            padding: rs(28), alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? C.inBubbleBorder : '#E8EAF0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isDark ? 0.30 : 0.06,
            shadowRadius: 14, elevation: 3,
        },
        welcomeIcon: {
            width: rs(62), height: rs(62), borderRadius: rs(31),
            backgroundColor: C.welcomeIconBg,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: rs(14),
            borderWidth: 1.5, borderColor: C.qrBorder,
        },
        welcomeTitle: {
            color: C.welcomeTitle,
            fontWeight: '700', fontSize: nz(17),
            textAlign: 'center', marginBottom: rs(6),
        },
        welcomeText: {
            color: C.welcomeText,
            fontSize: nz(13.5), textAlign: 'center', lineHeight: nz(20),
        },

        // ── Input bar ────────────────────────────────────────────────────────
        inputBar: {
            backgroundColor: C.inputBarBg,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: C.inputBarBorder,
            paddingTop: rs(10),
            paddingHorizontal: rs(12),
        },
        inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: rs(8) },
        attachBtn: {
            width: rs(42), height: rs(42), borderRadius: rs(21),
            backgroundColor: C.attachBg,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: rs(1),
        },
        pill: {
            flex: 1,
            backgroundColor: C.pillBg,
            borderRadius: rs(22),
            borderWidth: 1,
            borderColor: C.pillBorder,
            justifyContent: 'center',
            paddingHorizontal: rs(16),
        },
        textInput: {
            fontSize: nz(14.5),
            color: C.inputText,
            lineHeight: nz(21),
            paddingTop: rs(10),
            paddingBottom: rs(10),
            maxHeight: rs(116),
            textAlignVertical: 'top',
        },
        sendBtn: {
            width: rs(44), height: rs(44), borderRadius: rs(22),
            backgroundColor: C.sendActive,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: rs(1),
            shadowColor: C.sendShadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.30, shadowRadius: 6, elevation: 4,
        },
        sendOff: {
            backgroundColor: C.sendInactive,
            shadowOpacity: 0, elevation: 0,
        },

        // ── Loading / Error states ───────────────────────────────────────────
        centered: {
            flex: 1, justifyContent: 'center', alignItems: 'center',
            paddingHorizontal: rs(28),
            backgroundColor: theme.background,
        },
        loadCard: {
            backgroundColor: C.cardBg,
            borderRadius: rs(18), padding: rs(32), alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? C.inBubbleBorder : '#E8EAF0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.07,
            shadowRadius: 12, elevation: 3,
        },
        loadTxt: {
            color: C.welcomeText,
            fontSize: nz(14), fontWeight: '500',
            marginTop: rs(14), textAlign: 'center',
        },
        errCard: {
            backgroundColor: C.cardBg,
            marginHorizontal: rs(20), borderRadius: rs(18), padding: rs(32),
            alignItems: 'center',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark ? C.inBubbleBorder : '#E8EAF0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.07,
            shadowRadius: 12, elevation: 3,
        },
        errIcon: {
            width: rs(68), height: rs(68), borderRadius: rs(34),
            backgroundColor: C.errIconBg,
            justifyContent: 'center', alignItems: 'center',
            marginBottom: rs(14),
        },
        errTitle: {
            color: C.welcomeTitle,
            fontSize: nz(17), fontWeight: '700',
            textAlign: 'center', marginBottom: rs(7),
        },
        errTxt: {
            color: C.welcomeText,
            fontSize: nz(13.5), textAlign: 'center',
            lineHeight: nz(20), marginBottom: rs(22),
        },
        retryBtn: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: C.sendActive,
            paddingHorizontal: rs(26), paddingVertical: rs(13),
            borderRadius: rs(26), gap: rs(7),
            shadowColor: C.sendShadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.28, shadowRadius: 8, elevation: 4,
        },
        retryTxt: { color: '#fff', fontSize: nz(14.5), fontWeight: '700' },

        // ── Image preview modal ──────────────────────────────────────────────
        previewBg: {
            flex: 1, backgroundColor: 'rgba(0,0,0,0.96)',
            justifyContent: 'center', alignItems: 'center',
        },
        previewClose: {
            position: 'absolute', top: rs(16), right: rs(16),
            width: rs(42), height: rs(42), borderRadius: rs(21),
            backgroundColor: C.previewCloseBg,
            justifyContent: 'center', alignItems: 'center',
        },
        previewImg: {
            width: SW - rs(16), height: SH * 0.65, borderRadius: rs(14),
        },
    });
};

// ─── DateSeparator ────────────────────────────────────────────────────────────
const DateSeparator = memo(({ label, s }) => (
    <View style={s.sepWrap}>
        <View style={s.sepBadge}>
            <Text style={s.sepText}>{label}</Text>
        </View>
    </View>
));

// ─── MessageBubble ────────────────────────────────────────────────────────────
const MessageBubble = memo(({ msg, s, onImagePress, isDark }) => {
    // Handle different message types:
    // type 0: outgoing (user message)
    // type 1: incoming (agent message) 
    // type 2: activity (system message)
    // type 3: template/auto-response (welcome message, canned responses, etc.)
    
    const out = msg.message_type === 0;  // User's own message
    const isIncoming = msg.message_type === 1;  // Regular agent message
    const act = msg.message_type === 2;  // System activity message
    const isTemplate = msg.message_type === 3;  // Auto-response/template message
    
    const imgs = msg.attachments?.length > 0;
    const up   = msg.status === 'uploading';
    const err  = msg.status === 'error';
    const C    = isDark ? DARK : LIGHT;

    const isDeleted = msg.content === 'This message was deleted' ||
                      msg.content_attributes?.deleted === true;

    // Render activity messages
    if (act) return (
        <View style={s.actWrap}>
            <View style={s.actBadge}>
                <Text style={s.actTxt}>{msg.content}</Text>
            </View>
        </View>
    );

    // Determine the appropriate bubble style
    const getBubbleStyle = () => {
        if (out) return s.bubbleR;
        if (isTemplate) return s.bubbleTemplate;
        return s.bubbleL;  // Both type 1 and type 3 messages get this
    };

    // Get text color based on message type
    const getTextColor = () => {
        if (out) return C.outBubbleText;
        if (isTemplate) return C.templateText;
        return C.inBubbleText;
    };

    // Get time color based on message type
    const getTimeColor = () => {
        if (out) return C.outBubbleTime;
        if (isTemplate) return C.inBubbleTime;
        return C.inBubbleTime;
    };

    return (
        <View style={[s.msgRow, out ? s.msgRowR : s.msgRowL]}>
            {/* Show agent avatar for incoming and template messages */}
            {!out && (
                <View style={s.agentAvatar}>
                    <Ionicons 
                        name={isTemplate ? "ribbon-outline" : "headset"} 
                        size={15} 
                        color={C.agentAvatarIcon} 
                    />
                </View>
            )}
            
            <View style={s.bubbleWrap}>
                {isDeleted ? (
                    <View style={[s.bubble, getBubbleStyle(), s.deletedBubble]}>
                        <View style={s.deletedRow}>
                            <Ionicons
                                name="information-circle-outline"
                                size={14}
                                color={getTimeColor()}
                                style={s.deletedIcon}
                            />
                            <Text style={[
                                s.bubbleTxt,
                                {
                                    color: getTimeColor(),
                                    fontStyle: 'italic',
                                    fontSize: s.bubbleTxt.fontSize - 1,
                                },
                            ]}>
                                This message was deleted
                            </Text>
                        </View>
                        <View style={s.bubbleFoot}>
                            <Text style={[s.bubbleTime, { color: getTimeColor() }]}>
                                {fmtTime(msg.created_at)}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <>
                        {!!msg.content && (
                            <View style={[s.bubble, getBubbleStyle(), err && { opacity: 0.72 }]}>
                                <Text selectable style={[
                                    s.bubbleTxt,
                                    { color: getTextColor() },
                                ]}>
                                    {msg.content}
                                </Text>
                                
                                <View style={s.bubbleFoot}>
                                    <Text style={[
                                        s.bubbleTime,
                                        { color: getTimeColor() },
                                    ]}>
                                        {up ? 'Sending…' : fmtTime(msg.created_at)}
                                    </Text>
                                    {out && !up && (
                                        <Ionicons
                                            name={err ? 'alert-circle' : 'checkmark-done'}
                                            size={13}
                                            color={err ? '#FF5252' : C.outTick}
                                        />
                                    )}
                                </View>
                                {up && (
                                    <View style={s.uploading}>
                                        <ActivityIndicator size="small" color={C.outBubble} />
                                    </View>
                                )}
                            </View>
                        )}
                        
                        {/* Image attachments */}
                        {imgs && msg.attachments.map((a, i) => (
                            <Pressable 
                                key={i} 
                                style={s.imgWrap} 
                                onPress={() => onImagePress?.(a.data_url || a.url)}
                            >
                                <Image
                                    source={{ uri: a.data_url || a.url }}
                                    style={s.msgImg}
                                    resizeMode="cover"
                                />
                                {!msg.content && (
                                    <View style={[s.bubbleFoot, { paddingHorizontal: 6, paddingBottom: 4 }]}>
                                        <Text style={[s.bubbleTime, { color: C.inBubbleTime }]}>
                                            {up ? 'Sending…' : fmtTime(msg.created_at)}
                                        </Text>
                                        {out && !up && (
                                            <Ionicons
                                                name={err ? 'alert-circle' : 'checkmark-done'}
                                                size={13}
                                                color={err ? '#FF5252' : C.inTick}
                                            />
                                        )}
                                    </View>
                                )}
                                {up && !msg.content && (
                                    <View style={s.uploading}>
                                        <ActivityIndicator size="small" color={C.outBubble} />
                                    </View>
                                )}
                            </Pressable>
                        ))}
                    </>
                )}
            </View>
        </View>
    );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatSupportScreen({ navigation, route }) {
    const { rs, nz } = useResponsive();
    const insets     = useSafeAreaInsets();
    const { user }   = useAuthStore();
    const { theme, isDark } = useTheme();
    const orderData  = route?.params?.orderData || null;
    const s          = useMemo(() => makeStyles(rs, nz, theme, isDark), [rs, nz, theme, isDark]);
    const C          = isDark ? DARK : LIGHT;

    const [messages,     setMessages]     = useState([]);
    const [inputText,    setInputText]    = useState('');
    const [status,       setStatus]       = useState('loading');
    const [isSending,    setIsSending]    = useState(false);
    const [errMsg,       setErrMsg]       = useState('');
    const [preview,      setPreview]      = useState(null);
    const [kbVisible,    setKbVisible]    = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const kbOffset = useRef(new Animated.Value(0)).current;

    const flatRef     = useRef(null);
    const inputRef    = useRef(null);
    const initialized = useRef(false);
    const lastOrderId = useRef(null);
    const ctxSent     = useRef(false);
    const mounted     = useRef(true);

    // ── Audio Setup ───────────────────────────────────────────────────────────
    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
                await loadSounds();
            } catch (error) {
                console.log('Error setting up audio:', error);
            }
        };
        setupAudio();
        return () => { unloadSounds(); };
    }, []);

    // ── Keyboard handling ─────────────────────────────────────────────────────
    useEffect(() => {
        mounted.current = true;
        const isIOS = Platform.OS === 'ios';

        const onShow = Keyboard.addListener(
            isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKbVisible(true);
                const h        = e.endCoordinates.height;
                const duration = isIOS ? (e.duration ?? 250) : 0;
                Animated.timing(kbOffset, {
                    toValue: h, duration, useNativeDriver: false,
                }).start();
                setTimeout(() => scrollToBottom(true), duration + 50);
            },
        );
        const onHide = Keyboard.addListener(
            isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                setKbVisible(false);
                const duration = isIOS ? (e.duration ?? 250) : 0;
                Animated.timing(kbOffset, {
                    toValue: 0, duration, useNativeDriver: false,
                }).start();
            },
        );

        return () => {
            mounted.current = false;
            onShow.remove();
            onHide.remove();
        };
    }, []);

    // ── Chat init ─────────────────────────────────────────────────────────────
    useEffect(() => { initChat(); }, []);

    useEffect(() => {
        if (
            status === 'ready' &&
            orderData?.orderId &&
            orderData.orderId !== lastOrderId.current &&
            !ctxSent.current
        ) {
            sendCtx();
        }
    }, [status, orderData?.orderId]);

    useEffect(() => {
        return ChatwootAPI.onMessage((msg) => {
            if (!mounted.current) return;
            setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev;
                // Play sound for type 1 (agent) and type 3 (template) messages
                if (soundEnabled && (msg.message_type === 1 || msg.message_type === 3)) {
                    playReceiveSound();
                }
                return [...prev, msg];
            });
            setTimeout(() => scrollToBottom(true), 120);
        });
    }, [soundEnabled]);

    const scrollToBottom = useCallback((animated = true) => {
        setTimeout(() => {
            flatRef.current?.scrollToEnd({ animated });
        }, 100);
    }, []);

    const loadMsgs = useCallback(async () => {
        const data = await ChatwootAPI.fetchMessages();
        if (!mounted.current || !Array.isArray(data)) return;
        const processedData = data.map(msg => ({
            ...msg,
            content_attributes: msg.content === 'This message was deleted'
                ? { ...msg.content_attributes, deleted: true }
                : msg.content_attributes,
        }));
        setMessages([...processedData].sort((a, b) => (a.created_at || 0) - (b.created_at || 0)));
        setStatus('ready');
        setTimeout(() => scrollToBottom(false), 250);
    }, []);

    const sendCtx = useCallback(async () => {
        if (!orderData || ctxSent.current) return;
        ctxSent.current = true;
        const msg = ChatwootService.buildOrderContextMessage(orderData);
        if (msg) {
            await ChatwootAPI.sendMessage(msg);
            lastOrderId.current = orderData.orderId;
            await loadMsgs();
        }
        ctxSent.current = false;
    }, [orderData]);

    const initChat = useCallback(async () => {
        if (initialized.current) { await loadMsgs(); return; }
        setStatus('loading');
        const res = await ChatwootService.initialize(user);
        if (!res.success) {
            if (mounted.current) { setStatus('error'); setErrMsg(res.message || 'Unable to connect'); }
            return;
        }
        initialized.current = true;
        if (orderData?.orderId) await sendCtx();
        await loadMsgs();
    }, [user, orderData]);

    // ── Send / attach ─────────────────────────────────────────────────────────
    const send = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isSending) return;
        setInputText('');
        setIsSending(true);
        if (soundEnabled) playSendSound();
        const tid = `t_${Date.now()}`;
        const tmp = {
            id: tid, content: text, message_type: 0,
            created_at: Math.floor(Date.now() / 1000), status: 'sending',
        };
        setMessages(p => [...p, tmp]);
        setTimeout(() => scrollToBottom(true), 40);
        const res = await ChatwootAPI.sendMessage(text);
        if (mounted.current) {
            setMessages(p => p.map(m => m.id !== tid ? m
                : res.success ? { ...res.data, status: 'sent' }
                : { ...m, status: 'error' }));
        }
        setIsSending(false);
    }, [inputText, isSending, soundEnabled]);

    const pickImage = useCallback((type) => {
        Keyboard.dismiss();
        setTimeout(() => {
            const fn = type === 'camera' ? launchCamera : launchImageLibrary;
            fn({ mediaType: 'photo', quality: 0.82, maxWidth: 1920, maxHeight: 1920 })
                .then(r => { if (r.assets?.[0]) uploadImage(r.assets[0]); })
                .catch(() => {});
        }, 280);
    }, []);

    const uploadImage = useCallback(async (asset) => {
        const tid = `u_${Date.now()}`;
        const tmp = {
            id: tid, content: '', message_type: 0,
            created_at: Math.floor(Date.now() / 1000), status: 'uploading',
            attachments: [{ file_type: 'image', data_url: asset.uri, url: asset.uri }],
        };
        setMessages(p => [...p, tmp]);
        setTimeout(() => scrollToBottom(true), 40);
        if (soundEnabled) playSendSound();
        const res = await ChatwootAPI.sendAttachment(
            asset.uri, asset.type || 'image/jpeg', asset.fileName || 'image.jpg'
        );
        if (mounted.current) {
            setMessages(p => p.map(m => m.id !== tid ? m
                : res.success ? { ...res.data, status: 'sent' }
                : { ...m, content: 'Failed to send image.', status: 'error' }));
        }
    }, [soundEnabled]);

    const showAttach = useCallback(() => {
        Keyboard.dismiss();
        setTimeout(() => {
            Alert.alert('Share with Support', 'Choose an option', [
                { text: '📷 Take Photo',           onPress: () => pickImage('camera')  },
                { text: '🖼️ Choose from Gallery',  onPress: () => pickImage('gallery') },
                { text: 'Cancel', style: 'cancel' },
            ], { cancelable: true });
        }, 180);
    }, []);

    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => !prev);
    }, []);

    // ── Render helpers ────────────────────────────────────────────────────────
    const renderItem = useCallback(({ item }) => {
        if (item._sep) return <DateSeparator label={item.label} s={s} />;
        return <MessageBubble msg={item} s={s} onImagePress={setPreview} isDark={isDark} />;
    }, [s, isDark]);

    const keyExtractor = useCallback((item) => item._id || String(item.id), []);
    const data         = useMemo(() => withSeps(messages), [messages]);
console.log(data,"asfasfjksaf")
    // ── Loading ───────────────────────────────────────────────────────────────
    if (status === 'loading') return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
            <View style={s.loadCard}>
                <ActivityIndicator size="large" color={C.sendActive} />
                <Text style={s.loadTxt}>Connecting to support team…</Text>
            </View>
        </View>
    );

    // ── Error ─────────────────────────────────────────────────────────────────
    if (status === 'error') return (
        <View style={s.centered}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
            <View style={s.errCard}>
                <View style={s.errIcon}>
                    <Ionicons name="cloud-offline-outline" size={30} color="#EF5350" />
                </View>
                <Text style={s.errTitle}>Connection Failed</Text>
                <Text style={s.errTxt}>{errMsg || "Couldn't connect. Check your internet and try again."}</Text>
                <TouchableOpacity
                    style={s.retryBtn}
                    onPress={() => { initialized.current = false; initChat(); }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="refresh" size={19} color="#fff" />
                    <Text style={s.retryTxt}>Try Again</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Main UI ───────────────────────────────────────────────────────────────
    return (
        <View style={s.root}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={C.headerBg}
            />

            {/* ── Header ── */}
            <SafeAreaView edges={['top']} style={{ backgroundColor: C.headerBg }}>
                <View style={s.header}>
                    <View style={s.headerRow}>
                        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={22} color={C.backIcon} />
                        </TouchableOpacity>

                        <View style={s.avatar}>
                            <Ionicons name="headset" size={20} color={C.attachIcon} />
                        </View>

                        <View style={s.headerInfo}>
                            <Text style={s.headerTitle}>Team Alfennzo</Text>
                            <View style={s.headerSub}>
                                <View style={[s.statusDot, { backgroundColor: '#4CAF50' }]} />
                                <Text style={s.headerStatus}>Online</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
            
            {/* ── Body (animated up with keyboard) ── */}
            <Animated.View style={[s.body, { marginBottom: kbOffset }]}>

                <FlatList
                    ref={flatRef}
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={[s.msgList, data.length === 0 && { flex: 1 }]}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => scrollToBottom(false)}
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <View style={s.welcomeCard}>
                                <View style={s.welcomeIcon}>
                                    <Ionicons name="chatbubbles" size={30} color={C.attachIcon} />
                                </View>
                                <Text style={s.welcomeTitle}>How can we help?</Text>
                                <Text style={s.welcomeText}>Our support team is ready to assist you!</Text>
                            </View>
                        </View>
                    }
                    removeClippedSubviews={Platform.OS === 'android'}
                    maxToRenderPerBatch={12}
                    windowSize={12}
                    initialNumToRender={16}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                />

                {/* ── Input bar ── */}
                <View style={[
                    s.inputBar,
                    {
                        paddingBottom: kbVisible
                            ? Math.max(insets.bottom + rs(25), 0)
                            : Math.max(insets.bottom + rs(18), 0),
                    },
                ]}>
                    <View style={s.inputRow}>

                        <TouchableOpacity style={s.attachBtn} onPress={showAttach} activeOpacity={0.75}>
                            <Ionicons name="attach" size={21} color={C.attachIcon} />
                        </TouchableOpacity>

                        <View style={s.pill}>
                            <TextInput
                                ref={inputRef}
                                style={s.textInput}
                                placeholder="Type a message…"
                                placeholderTextColor={C.inputPlaceholder}
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                maxLength={2000}
                                returnKeyType="default"
                                blurOnSubmit={false}
                                textAlignVertical="top"
                                editable={!isSending}
                                scrollEnabled
                            />
                        </View>

                        <TouchableOpacity
                            style={[s.sendBtn, (!inputText.trim() || isSending) && s.sendOff]}
                            onPress={send}
                            disabled={!inputText.trim() || isSending}
                            activeOpacity={0.8}
                        >
                            {isSending
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Ionicons name="send" size={19} color="#fff" />
                            }
                        </TouchableOpacity>

                    </View>
                </View>

            </Animated.View>

            {/* ── Image preview modal ── */}
            <Modal
                visible={!!preview}
                transparent
                animationType="fade"
                onRequestClose={() => setPreview(null)}
                statusBarTranslucent
            >
                <SafeAreaView style={s.previewBg} edges={['top', 'bottom']}>
                    <TouchableOpacity
                        style={s.previewClose}
                        onPress={() => setPreview(null)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={22} color="#fff" />
                    </TouchableOpacity>
                    {preview && (
                        <Image
                            source={{ uri: preview }}
                            style={s.previewImg}
                            resizeMode="contain"
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
}