import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, StatusBar, ActivityIndicator, Animated,
    Modal, Pressable, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../../utils/responsive';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import useAuthStore from '../../store/authStore';
import AuthService from '../../api/apiService';
import LottieView from 'lottie-react-native';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const DAYS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));

const DatePickerModal = ({ visible, value, onConfirm, onCancel, isDark }) => {
    const { rs, nz } = useResponsive();

    const C = {
        bg:       isDark ? '#1C1F2E' : '#FFFFFF',
        text:     isDark ? '#E2E6F0' : '#111111',
        subText:  isDark ? '#6B7591' : '#6B7280',
        btnBg:    isDark ? '#2C3347' : '#F3F4F6',
        divider:  isDark ? '#2C3347' : '#E5E5EA',
        handle:   isDark ? '#3A3F52' : '#CCCCCC',
        green:    '#43A047',
    };

    const parseDate = (val) => {
        if (!val) return { day: '01', month: '01', year: String(CURRENT_YEAR - 20) };
        const [dd, mm, yyyy] = val.split('-');
        return { day: dd || '01', month: mm || '01', year: yyyy || String(CURRENT_YEAR - 20) };
    };

    const initial = parseDate(value);
    const [day,   setDay]   = useState(initial.day);
    const [month, setMonth] = useState(initial.month);
    const [year,  setYear]  = useState(initial.year);

    const dayRef   = useRef(null);
    const monthRef = useRef(null);
    const yearRef  = useRef(null);

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                const dayIdx   = DAYS.indexOf(day);
                const monthIdx = parseInt(month) - 1;
                const yearIdx  = YEARS.indexOf(year);
                if (dayRef.current   && dayIdx >= 0)   dayRef.current.scrollToIndex({ index: dayIdx, animated: true, viewPosition: 0.5 });
                if (monthRef.current && monthIdx >= 0) monthRef.current.scrollToIndex({ index: monthIdx, animated: true, viewPosition: 0.5 });
                if (yearRef.current  && yearIdx >= 0)  yearRef.current.scrollToIndex({ index: yearIdx, animated: true, viewPosition: 0.5 });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const handleConfirm = () => {
        const mm = String(parseInt(month)).padStart(2, '0');
        onConfirm(`${day}-${mm}-${year}`);
    };

    const ITEM_H        = rs(44);
    const VISIBLE       = 5;
    const CONTAINER_H   = ITEM_H * VISIBLE;

    const WheelColumn = ({ data, selected, onSelect, type, scrollRef }) => {
        const w = type === 'month' ? rs(90) : type === 'day' ? rs(60) : rs(75);
        return (
            <View style={{ width: w }}>
                <FlatList
                    ref={scrollRef}
                    data={data}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                        const isSel = item === selected;
                        return (
                            <TouchableOpacity
                                onPress={() => onSelect(item)}
                                activeOpacity={0.7}
                                style={{ width: w, height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Text style={{
                                    fontSize:   isSel ? nz(16) : nz(13),
                                    fontWeight: isSel ? '700' : '400',
                                    color:      isSel ? C.green : C.text,
                                    opacity:    isSel ? 1 : 0.45,
                                }}>
                                    {type === 'month' ? MONTHS[parseInt(item) - 1] : item}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    snapToInterval={ITEM_H}
                    decelerationRate="fast"
                    getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
                    snapToAlignment="center"
                    contentContainerStyle={{ paddingVertical: ITEM_H * ((VISIBLE - 1) / 2) }}
                    style={{ height: CONTAINER_H }}
                />
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={onCancel}>
                <Pressable style={{ backgroundColor: C.bg, borderTopLeftRadius: rs(24), borderTopRightRadius: rs(24), paddingHorizontal: rs(20), paddingBottom: rs(40) }}>
                    {/* Handle */}
                    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.handle, alignSelf: 'center', marginTop: rs(12), marginBottom: rs(16) }} />

                    <Text style={{ fontSize: nz(18), fontWeight: '700', color: C.text, textAlign: 'center', marginBottom: rs(12) }}>
                        Select Birth Date
                    </Text>

                    {/* Preview */}
                    <View style={{ alignItems: 'center', marginBottom: rs(20), paddingVertical: rs(8), borderBottomWidth: 1, borderBottomColor: C.divider }}>
                        <Text style={{ fontSize: nz(20), fontWeight: '700', color: C.green }}>
                            {`${day} ${MONTHS[parseInt(month) - 1]} ${year}`}
                        </Text>
                    </View>

                    {/* Wheels */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: rs(12), marginBottom: rs(20) }}>
                        {[
                            { label: 'DAY',   data: DAYS,  selected: day,   onSelect: setDay,   type: 'day',   ref: dayRef   },
                            { label: 'MONTH', data: MONTHS.map((_, i) => String(i + 1).padStart(2, '0')), selected: month, onSelect: setMonth, type: 'month', ref: monthRef },
                            { label: 'YEAR',  data: YEARS, selected: year,  onSelect: setYear,  type: 'year',  ref: yearRef  },
                        ].map((col) => (
                            <View key={col.label} style={{ alignItems: 'center' }}>
                                <Text style={{ fontSize: nz(10), fontWeight: '700', color: C.subText, letterSpacing: 1, marginBottom: rs(8), textTransform: 'uppercase' }}>
                                    {col.label}
                                </Text>
                                <WheelColumn data={col.data} selected={col.selected} onSelect={col.onSelect} type={col.type} scrollRef={col.ref} />
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 1, backgroundColor: C.divider, marginBottom: rs(20) }} />

                    {/* Actions */}
                    <View style={{ flexDirection: 'row', gap: rs(12) }}>
                        <TouchableOpacity
                            style={{ flex: 1, backgroundColor: C.btnBg, borderRadius: rs(14), paddingVertical: rs(14), alignItems: 'center' }}
                            onPress={onCancel}
                        >
                            <Text style={{ fontSize: nz(15), fontWeight: '700', color: C.text }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ flex: 1, backgroundColor: C.green, borderRadius: rs(14), paddingVertical: rs(14), alignItems: 'center' }}
                            onPress={handleConfirm}
                        >
                            <Text style={{ fontSize: nz(15), fontWeight: '700', color: '#fff' }}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const displayDate = (val) => {
    if (!val) return '';
    const [dd, mm, yyyy] = val.split('-');
    if (!dd || !mm || !yyyy) return val;
    return `${dd} ${MONTHS[parseInt(mm, 10) - 1]} ${yyyy}`;
};

export default function EditProfileScreen() {
    const { rs, nz }    = useResponsive();
    const insets         = useSafeAreaInsets();
    const navigation     = useNavigation();
    const { isDark }     = useTheme();
    const { success: showSuccess, error: showError } = useToast();
    const user           = useAuthStore((s) => s.user);
    const lottieRef      = useRef(null);

    const C = {
        bg:           isDark ? '#0D0F14' : '#F0F0F0',
        card:         isDark ? '#1C1F2E' : '#FFFFFF',
        cardBorder:   isDark ? '#2C3347' : '#E8EAF0',
        text:         isDark ? '#E2E6F0' : '#1A1D23',
        textSub:      isDark ? '#8891A4' : '#6B7591',
        textMuted:    isDark ? '#4A5168' : '#9EA8BB',
        inputBg:      isDark ? '#13151F' : '#F7F8FC',
        inputBorder:  isDark ? '#2C3347' : '#E0E3EB',
        inputText:    isDark ? '#E2E6F0' : '#1A1D23',
        placeholder:  isDark ? '#4A5168' : '#9EA8BB',
        iconBg:       isDark ? '#1A1F2E' : '#F4F6FB',
        greenBg:      isDark ? '#1A2E24' : '#EAF4EA',
        green:        '#43A047',
        divider:      isDark ? '#2C3347' : '#E8EAF0',
        saveBtnOff:   isDark ? '#1E2330' : '#E8EAF0',
        saveTxtOff:   isDark ? '#3A3F52' : '#B0B5C4',
        noteCard:     isDark ? '#13151F' : '#F7F8FC',
    };

    const [fullname,  setFullname]  = useState(user?.fullname || '');
    const [birthDate, setBirthDate] = useState(user?.birthDate || '');
    const [saving,    setSaving]    = useState(false);
    const [dateModal, setDateModal] = useState(false);

    const nameAnim = useRef(new Animated.Value(0)).current;
    const dateAnim = useRef(new Animated.Value(0)).current;
    const btnAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (lottieRef.current) lottieRef.current.play();
        Animated.stagger(80, [
            Animated.spring(nameAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 120 }),
            Animated.spring(dateAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 120 }),
            Animated.spring(btnAnim,  { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 120 }),
        ]).start();
    }, []);

    const animStyle = (anim) => ({
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
    });

    const hasChanges = fullname.trim() !== (user?.fullname || '') || birthDate !== (user?.birthDate || '');

    const handleSave = async () => {
        if (!fullname.trim())          { showError('Name cannot be empty'); return; }
        if (fullname.trim().length < 2){ showError('Name must be at least 2 characters'); return; }
        setSaving(true);
        const res = await AuthService.updateProfile(fullname.trim(), birthDate);
        setSaving(false);
        if (res.success) { showSuccess('Profile updated!'); navigation.goBack(); }
        else showError(res.message || 'Failed to update');
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: insets.top + rs(12), paddingHorizontal: rs(16), paddingBottom: rs(12),
                backgroundColor: C.bg,
                borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.cardBorder,
            }}>
                <TouchableOpacity
                    style={{ width: rs(38), height: rs(38), borderRadius: rs(19), backgroundColor: C.iconBg, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={rs(22)} color={C.text} />
                </TouchableOpacity>
                <Text style={{ fontSize: nz(18), fontWeight: '700', color: C.text }}>Edit Profile</Text>
                <View style={{ width: rs(38) }} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: rs(20), paddingBottom: rs(40) }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar */}
                <View style={{ alignItems: 'center', marginBottom: rs(28) }}>
                    <View style={{
                        width: rs(70), height: rs(70), borderRadius: rs(35),
                        backgroundColor: C.greenBg,
                        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
                    }}>
                        <LottieView
                            ref={lottieRef}
                            source={require('../../../assets/profile.json')}
                            style={{ width: rs(100), height: rs(100) }}
                            autoPlay loop
                            useNativeLooping
                        />
                    </View>
                    <Text style={{ color: C.textSub, fontSize: nz(12), marginTop: rs(8), fontWeight: '500' }}>
                        +91 {user?.phone || 'N/A'}
                    </Text>
                </View>

                {/* Full Name */}
                <Animated.View style={[animStyle(nameAnim), { marginBottom: rs(16) }]}>
                    <Text style={{ color: C.textMuted, fontSize: nz(12), fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: rs(8) }}>
                        Full Name
                    </Text>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', borderWidth: 1,
                        backgroundColor: C.inputBg, borderColor: C.inputBorder,
                        borderRadius: rs(14), paddingHorizontal: rs(14), height: rs(52),
                    }}>
                        <Ionicons name="person-outline" size={rs(18)} color={C.textSub} style={{ marginRight: rs(10) }} />
                        <TextInput
                            style={{ flex: 1, color: C.inputText, fontSize: nz(15), fontWeight: '500' }}
                            value={fullname}
                            onChangeText={setFullname}
                            placeholder="Enter your full name"
                            placeholderTextColor={C.placeholder}
                            maxLength={50}
                            returnKeyType="done"
                            autoCapitalize="words"
                        />
                        {fullname.length > 0 && (
                            <TouchableOpacity onPress={() => setFullname('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={rs(18)} color={C.textSub} />
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* Birth Date */}
                <Animated.View style={[animStyle(dateAnim), { marginBottom: rs(32) }]}>
                    <Text style={{ color: C.textMuted, fontSize: nz(12), fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: rs(8) }}>
                        Date of Birth
                    </Text>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row', alignItems: 'center', borderWidth: 1,
                            backgroundColor: C.inputBg, borderColor: C.inputBorder,
                            borderRadius: rs(14), paddingHorizontal: rs(14), height: rs(52),
                        }}
                        onPress={() => setDateModal(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="calendar-outline" size={rs(18)} color={C.textSub} style={{ marginRight: rs(10) }} />
                        <Text style={{ flex: 1, fontSize: nz(15), color: birthDate ? C.inputText : C.placeholder }}>
                            {birthDate ? displayDate(birthDate) : 'Select your birth date'}
                        </Text>
                        <Ionicons name="chevron-down" size={rs(16)} color={C.textSub} />
                    </TouchableOpacity>
                    {birthDate ? (
                        <Text style={{ color: C.textMuted, fontSize: nz(11), marginTop: rs(6), marginLeft: rs(4) }}>
                            Stored as: {birthDate}
                        </Text>
                    ) : null}
                </Animated.View>

                {/* Save Button */}
                <Animated.View style={[animStyle(btnAnim), { marginBottom: rs(20) }]}>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: hasChanges ? C.green : C.saveBtnOff,
                            borderRadius: rs(16), height: rs(54),
                            shadowColor: hasChanges ? C.green : 'transparent',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3, shadowRadius: 8,
                            elevation: hasChanges ? 4 : 0,
                        }}
                        onPress={handleSave}
                        disabled={saving || !hasChanges}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons
                                    name="checkmark-circle"
                                    size={rs(20)}
                                    color={hasChanges ? '#fff' : C.saveTxtOff}
                                />
                                <Text style={{ fontSize: nz(16), fontWeight: '700', marginLeft: rs(8), color: hasChanges ? '#fff' : C.saveTxtOff }}>
                                    Save Changes
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>

            <DatePickerModal
                visible={dateModal}
                value={birthDate}
                onConfirm={(v) => { setBirthDate(v); setDateModal(false); }}
                onCancel={() => setDateModal(false)}
                isDark={isDark}
            />
        </View>
    );
}