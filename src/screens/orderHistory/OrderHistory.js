import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Animated,
  Modal,
  Dimensions,
  ScrollView,
  TextInput,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useResponsive } from "../../utils/responsive";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import AuthService from "../../api/apiService";
import { ChatwootService } from "../../utils/chatwoot";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const MODAL_THRESHOLD = SCREEN_HEIGHT * 0.3;
const FILTER_TABS = ["All", "Cancelled"];

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const OrderSkeleton = ({ rs, isDark }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const C = {
    card: isDark ? '#1C1F2E' : '#FFFFFF',
    border: isDark ? '#2C3347' : '#E8EAF0',
    shimmer: isDark ? '#2a2a2a' : '#e0e0e0',
  };

  return (
    <View style={{
      backgroundColor: C.card,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: rs(16),
      marginBottom: rs(12),
      marginHorizontal: rs(16),
      overflow: 'hidden',
    }}>
      {/* Card Header skeleton */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: rs(14),
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        gap: rs(12),
      }}>
        <Animated.View style={{ width: rs(44), height: rs(44), borderRadius: rs(10), backgroundColor: C.shimmer, opacity }} />
        <View style={{ flex: 1 }}>
          <Animated.View style={{ width: rs(120), height: rs(16), backgroundColor: C.shimmer, borderRadius: rs(4), opacity, marginBottom: rs(6) }} />
          <Animated.View style={{ width: rs(80), height: rs(12), backgroundColor: C.shimmer, borderRadius: rs(4), opacity }} />
        </View>
      </View>
      {/* Items skeleton */}
      <View style={{ padding: rs(12) }}>
        <Animated.View style={{ width: '80%', height: rs(14), backgroundColor: C.shimmer, borderRadius: rs(4), opacity, marginBottom: rs(8) }} />
        <Animated.View style={{ width: '60%', height: rs(14), backgroundColor: C.shimmer, borderRadius: rs(4), opacity }} />
      </View>
      {/* Status strip skeleton */}
      <Animated.View style={{ height: rs(42), backgroundColor: C.shimmer, opacity }} />
    </View>
  );
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function OrderHistoryScreen() {
  const { rs, nz } = useResponsive();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { error: showError } = useToast();
  const navigation = useNavigation();

  // Two separate lottie refs — one per tab
  const lottieAllRef = useRef(null);
  const lottieCancelledRef = useRef(null);

  // ── Palette ──────────────────────────────────────────────────────────────────
  const C = {
    bg: isDark ? '#0D0F14' : '#F5F7FA',
    card: isDark ? '#1C1F2E' : '#FFFFFF',
    cardBorder: isDark ? '#2C3347' : '#E8EAF0',
    surface: isDark ? '#13151F' : '#F7F8FC',
    surfaceBorder: isDark ? '#2C3347' : '#E0E3EB',
    text: isDark ? '#E2E6F0' : '#1A1D23',
    textSub: isDark ? '#8891A4' : '#6B7591',
    textMuted: isDark ? '#4A5168' : '#9EA8BB',
    
    // Status colors
    green: isDark ? '#66BB6A' : '#2B8A5A',
    greenBg: isDark ? '#1A2E24' : '#E8F5E9',
    blue: isDark ? '#64B5F6' : '#1565C0',
    blueBg: isDark ? '#1B2A4A' : '#E3F2FD',
    red: isDark ? '#EF9A9A' : '#C62828',
    redBg: isDark ? '#2A1515' : '#FFEBEE',
    
    // Theme-specific accent colors
    primary: isDark ? '#66BB6A' : '#1565C0', // Green for dark, Blue for light
    primaryBg: isDark ? '#1A2E24' : '#E3F2FD',
    primaryLight: isDark ? '#81C784' : '#42A5F5',
    primaryDark: isDark ? '#43A047' : '#0D47A1',
    
    // Header gradient (using solid colors as fallback)
    headerBg: isDark ? '#1A2E24' : '#48BB78',
    headerText: '#FFFFFF',
    
    // Tab colors
    tabActiveBg: isDark ? '#48BB78' : '#48BB78',
    tabInactiveBg: isDark ? '#1C1F2E' : '#dddddd',
    tabActiveText: '#FFFFFF',
    tabInactiveText: isDark ? '#aca8a8' : '#030303',
    
    // Other UI elements
    orange: isDark ? '#FFB74D' : '#F57C00', // Keeping orange for specific highlights
    divider: isDark ? '#2C3347' : '#E8EAF0',
    modalBg: isDark ? '#1a1a1c' : '#FFFFFF',
    handle: isDark ? '#2C3347' : '#E0E3EB',
    backdrop: 'rgba(0,0,0,0.6)',
    shadow: isDark ? '#000' : '#000',
    searchBg: isDark ? '#1C1F2E' : '#FFFFFF',
    
    // Additional theme-specific elements
    iconColor: isDark ? '#66BB6A' : '#1565C0',
    statusPending: isDark ? '#FFB74D' : '#F57C00',
    statusPendingBg: isDark ? '#2A1F10' : '#FFF3E0',
  };

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const modalSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const modalBackdropAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.95)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const isFirstLoad = useRef(true);
  const isFetchingRef = useRef(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) { fetchOrders(1, true); isFirstLoad.current = false; }
    }, [])
  );

  const fetchOrders = async (page = 1, isInitial = false) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (isInitial) { setLoading(true); setCurrentPage(1); }
      else setLoadingMore(true);
      const result = await AuthService.getUserOrders(page, ITEMS_PER_PAGE);
      if (result.success) {
        const {
          data: newOrders,
          currentPage: pageNum,
          totalDocuments: tDocs,
          hasMore: more,
        } = result.data;
        if (isInitial || page === 1) setOrders(newOrders);
        else setOrders(prev => {
          const ids = new Set(prev.map(o => o._id));
          return [...prev, ...newOrders.filter(o => !ids.has(o._id))];
        });
        setCurrentPage(pageNum);
        setTotalDocuments(tDocs);
        setHasMore(more);
      } else {
        showError(result.message || "Failed to load orders");
      }
    } catch {
      showError("Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchOrders(1, true); }, []);
  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !isFetchingRef.current) fetchOrders(currentPage + 1);
  };

  // ── Client-side filter ──────────────────────────────────────────────────────
  const filteredOrders = orders.filter(order => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (order.restaurantName || '').toLowerCase().includes(q) ||
      getOrderId(order).toLowerCase().includes(q);
    const matchesFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Cancelled' && order.isCancelled);
    return matchesSearch && matchesFilter;
  });

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openModal = () => {
    setModalVisible(true);
    dragY.setValue(0);
    Animated.parallel([
      Animated.spring(modalSlideAnim, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 100, mass: 1 }),
      Animated.timing(modalBackdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalScaleAnim, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 100 }),
    ]).start();
  };

  const closeModal = (cb) => {
    Animated.parallel([
      Animated.timing(modalSlideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      Animated.timing(modalBackdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(modalScaleAnim, { toValue: 0.95, duration: 250, useNativeDriver: true }),
    ]).start(() => { setModalVisible(false); dragY.setValue(0); if (cb) cb(); });
  };

  const handleOrderPress = (order) => { setSelectedOrder(order); openModal(); };
  const handleCloseModal = () => closeModal(() => setTimeout(() => setSelectedOrder(null), 300));
  const handleHelpPress = (order) => {
    const orderData = ChatwootService.formatOrderAsCustomAttributes(order);
    const message = ChatwootService.buildOrderContextMessage(orderData);
    navigation.navigate('ChatSupport', { orderData, initialMessage: message });
  };

  // ── PanResponder ────────────────────────────────────────────────────────────
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { isDragging.current = true; dragY.setOffset(0); },
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) {
        dragY.setValue(g.dy);
        modalBackdropAnim.setValue(Math.max(0, 1 - g.dy / MODAL_THRESHOLD));
        modalScaleAnim.setValue(Math.max(0.95, 1 - (g.dy / SCREEN_HEIGHT) * 0.1));
      }
    },
    onPanResponderRelease: (_, g) => {
      isDragging.current = false;
      if (g.dy > MODAL_THRESHOLD || g.vy > 0.5) {
        handleCloseModal();
      } else {
        Animated.parallel([
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 100 }),
          Animated.timing(modalBackdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(modalScaleAnim, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 100 }),
        ]).start();
      }
    },
  })).current;

  // ── Data helpers ────────────────────────────────────────────────────────────
  const getOrderItems = (item) => item.order || item.items || [];
  const getOrderTotal = (item) => item.TotalAmount || item.totalAmount || getOrderItems(item).reduce((s, i) => s + (i.amount || 0) * (i.quantity || 1), 0);
  const getOrderId = (item) => item.OrderId || item.orderId || item.Id || item._id?.slice(-8) || "N/A";
  
  const getStatusColor = (item) => 
    item.isCancelled ? C.red : 
    item.isDelivered ? C.green : 
    item.AcceptOrder ? C.orange : 
    C.textMuted;
    
  const getStatusBg = (item) => 
    item.isCancelled ? C.redBg : 
    item.isDelivered ? C.greenBg : 
    item.AcceptOrder ? C.statusPendingBg : 
    C.surface;
    
  const getStatusIcon = (item) => 
    item.isCancelled ? "close-circle" : 
    item.isDelivered ? "checkmark-done-circle" : 
    item.AcceptOrder ? "time" : 
    "hourglass-outline";
    
  const getStatusText = (item) => {
    if (item.isCancelled) return item.paymentFailed ? "Payment Failed" : "Cancelled";
    if (item.isDelivered) return "Delivered";
    if (item.AcceptOrder) return "Accepted";
    return "Pending";
  };
  
  const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const formatTime = (ds) => ds ? new Date(ds).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";

  // ── Empty state per tab ─────────────────────────────────────────────────────
  const renderEmptyComponent = () => {
    if (loading) return null;

    // Cancelled tab: plain "No orders yet" text, no lottie
    if (activeFilter === 'Cancelled') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LottieView
            ref={lottieCancelledRef}
            source={require("../../../assets/order.json")}
            style={{ width: rs(300), height: rs(150) }}
            autoPlay
            loop
          />

          <Text style={{ fontSize: nz(20), color: C.text, marginTop: rs(10), fontWeight: '700' }}>
            No Cancelled Orders
          </Text>
          <Text style={{ fontSize: nz(14), color: C.textSub, marginTop: rs(8), textAlign: 'center', paddingHorizontal: rs(40) }}>
            Looks like you haven't hit cancel yet — nice!
          </Text>
        </View>
      );
    }

    // All tab: use order.json lottie
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LottieView
          ref={lottieAllRef}
          source={require("../../../assets/all.json")}
          style={{ width: rs(300), height: rs(150) }}
          autoPlay
          loop
        />

        <Text style={{ fontSize: nz(20), color: C.text, marginTop: rs(10), fontWeight: '700' }}>
          No Orders Yet
        </Text>
        <Text style={{ fontSize: nz(14), color: C.textSub, marginTop: rs(8), textAlign: 'center', paddingHorizontal: rs(40) }}>
          This little one is waiting… place your first order!
        </Text>
      </View>
    );
  };

  // ── Order Card ──────────────────────────────────────────────────────────────
  const renderOrderItem = ({ item }) => {
    const orderItems = getOrderItems(item);
    const statusColor = getStatusColor(item);
    const statusBg = getStatusBg(item);

    return (
      <TouchableOpacity
        style={{
          backgroundColor: C.card,
          borderColor: C.cardBorder,
          borderWidth: 1,
          borderRadius: rs(16),
          marginBottom: rs(12),
          marginHorizontal: rs(16),
          overflow: 'hidden',
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 6,
          elevation: 3,
        }}
        activeOpacity={0.7}
        onPress={() => handleOrderPress(item)}
      >
        {/* ── Header: logo + name + chevron ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: rs(14),
          borderBottomWidth: 1,
          borderBottomColor: C.cardBorder,
          gap: rs(12),
        }}>
          <View style={{
            width: rs(44),
            height: rs(44),
            borderRadius: rs(10),
            backgroundColor: C.primaryBg,
            borderWidth: 1,
            borderColor: C.primaryLight + '30',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Ionicons name="restaurant" size={rs(22)} color={C.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: nz(15), fontWeight: '700', color: C.text }} numberOfLines={1}>
              {item.restaurantName || 'Restaurant'}
            </Text>
            {(item.restaurantAddress || item.seatNo) ? (
              <Text style={{ fontSize: nz(12), color: C.textSub, marginTop: rs(2) }} numberOfLines={1}>
                {item.restaurantAddress || item.seatNo}
              </Text>
            ) : null}
          </View>

          <Ionicons name="chevron-forward" size={rs(18)} color={C.textMuted} />
        </View>

        {/* ── Items list (up to 3) ── */}
        <View style={{ paddingHorizontal: rs(14), paddingTop: rs(10), paddingBottom: rs(6) }}>
          {orderItems.slice(0, 3).map((oi, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(6) }}>
              <View style={{
                width: rs(16),
                height: rs(16),
                borderRadius: rs(3),
                borderWidth: 1.5,
                borderColor: oi.foodtype === 'NonVeg' ? C.red : C.green,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: rs(7),
                  height: rs(7),
                  borderRadius: rs(4),
                  backgroundColor: oi.foodtype === 'NonVeg' ? C.red : C.green,
                }} />
              </View>
              <Text style={{ flex: 1, fontSize: nz(13), color: C.text, fontWeight: '500' }} numberOfLines={1}>
                {oi.quantity || 1} X {oi.foodName || 'Item'}
              </Text>
            </View>
          ))}
          {orderItems.length > 3 && (
            <Text style={{ fontSize: nz(11), color: C.primary, fontWeight: '600', marginBottom: rs(4) }}>
              +{orderItems.length - 3} more items
            </Text>
          )}
        </View>

        {/* ── Status strip ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: statusBg,
          paddingHorizontal: rs(14),
          paddingVertical: rs(10),
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(8) }}>
            <Ionicons name={getStatusIcon(item)} size={rs(18)} color={statusColor} />
            <Text style={{ fontSize: nz(13), fontWeight: '700', color: statusColor }}>
              {getStatusText(item)}
            </Text>
          </View>
          <Text style={{ fontSize: nz(12), color: C.textSub, fontWeight: '500' }}>
            {formatDate(item.updatedAt || item.createdAt)}, {formatTime(item.updatedAt || item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Modal Content ───────────────────────────────────────────────────────────
  const renderModalContent = () => {
    if (!selectedOrder) return null;
    const orderItems = getOrderItems(selectedOrder);
    const totalAmount = getOrderTotal(selectedOrder);
    const fullOrderId = selectedOrder.Id || selectedOrder._id || getOrderId(selectedOrder);
    const statusColor = getStatusColor(selectedOrder);

    return (
      <Animated.View style={{
        backgroundColor: C.modalBg,
        borderTopLeftRadius: rs(24),
        borderTopRightRadius: rs(24),
        paddingBottom: insets.bottom + rs(20),
        maxHeight: SCREEN_HEIGHT * 0.88,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: isDark ? 0.4 : 0.15,
        shadowRadius: 12,
        elevation: 20,
        transform: [
          { translateY: Animated.add(modalSlideAnim, dragY) },
          { scale: modalScaleAnim },
        ],
      }} {...panResponder.panHandlers}>

        {/* Handle */}
        <View style={{ alignItems: 'center', paddingVertical: rs(12) }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.handle }} />
          <Text style={{ color: C.textMuted, fontSize: nz(10), marginTop: rs(4) }}>Drag down to close</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} scrollEnabled={!isDragging.current}>
          <View style={{ padding: rs(20) }}>

            {/* Location */}
            {(selectedOrder.restaurantName || selectedOrder.seatNo) && (
              <View style={{ marginTop: rs(20) }}>
                <Text style={{ color: C.text, fontSize: nz(16), fontWeight: '700', marginBottom: rs(12) }}>Location</Text>
                <View style={{ backgroundColor: C.surface, borderRadius: rs(12), padding: rs(16), borderWidth: 1, borderColor: C.surfaceBorder }}>
                  {selectedOrder.restaurantName && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="restaurant" size={rs(20)} color={C.primary} />
                      <View style={{ marginLeft: rs(12), flex: 1 }}>
                        <Text style={{ color: C.textMuted, fontSize: nz(11) }}>Restaurant</Text>
                        <Text style={{ color: C.text, fontSize: nz(14), fontWeight: '600' }}>{selectedOrder.restaurantName}</Text>
                      </View>
                    </View>
                  )}
                  {selectedOrder.seatNo && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: rs(12) }}>
                      <Ionicons name="location" size={rs(20)} color={C.primary} />
                      <View style={{ marginLeft: rs(12), flex: 1 }}>
                        <Text style={{ color: C.textMuted, fontSize: nz(11) }}>Seat Number</Text>
                        <Text style={{ color: C.text, fontSize: nz(14), fontWeight: '600' }}>{selectedOrder.seatNo}</Text>
                      </View>
                    </View>
                  )}
                  {selectedOrder.restaurantAddress && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: rs(12) }}>
                      <Ionicons name="map" size={rs(20)} color={C.statusPending} />
                      <View style={{ marginLeft: rs(12), flex: 1 }}>
                        <Text style={{ color: C.textMuted, fontSize: nz(11) }}>Address</Text>
                        <Text style={{ color: C.text, fontSize: nz(14), fontWeight: '600' }}>{selectedOrder.restaurantAddress}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Items */}
            <View style={{ marginTop: rs(20) }}>
              <Text style={{ color: C.text, fontSize: nz(16), fontWeight: '700', marginBottom: rs(12) }}>
                Items ({orderItems.length})
              </Text>
              <View style={{ backgroundColor: C.surface, borderRadius: rs(12), padding: rs(16), borderWidth: 1, borderColor: C.surfaceBorder }}>
                {orderItems.map((item, index) => (
                  <View
                    key={item._id || index}
                    style={[
                      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                      index < orderItems.length - 1 && {
                        borderBottomWidth: 0.5,
                        borderBottomColor: C.divider,
                        paddingBottom: rs(12),
                        marginBottom: rs(12),
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{
                        width: rs(16), height: rs(16), borderRadius: rs(3),
                        borderWidth: 1.5,
                        borderColor: item.foodtype === 'NonVeg' ? C.red : C.green,
                        justifyContent: 'center', alignItems: 'center', marginRight: rs(10),
                      }}>
                        <View style={{
                          width: rs(7), height: rs(7), borderRadius: rs(4),
                          backgroundColor: item.foodtype === 'NonVeg' ? C.red : C.green,
                        }} />
                      </View>
                      <View style={{
                        backgroundColor: C.primaryBg,
                        paddingHorizontal: rs(10),
                        paddingVertical: rs(4),
                        borderRadius: rs(8),
                      }}>
                        <Text style={{ color: C.primary, fontSize: nz(12), fontWeight: '700' }}>{item.quantity || 1}x</Text>
                      </View>
                      <View style={{ marginLeft: rs(12), flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: nz(14), fontWeight: '600' }}>{item.foodName || 'Item'}</Text>
                        {item.size && item.size !== 'default' && (
                          <Text style={{ color: C.textMuted, fontSize: nz(11) }}>Size: {item.size}</Text>
                        )}
                        {item.foodtype && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <View style={{
                              width: 8, height: 8, borderRadius: 4,
                              backgroundColor: item.foodtype === 'Veg' ? C.green : C.red,
                              marginRight: 4,
                            }} />
                            <Text style={{ color: C.textMuted, fontSize: nz(10) }}>{item.foodtype}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={{ color: C.text, fontSize: nz(14), fontWeight: '700', marginLeft: rs(12) }}>
                      ₹{(item.amount || 0) * (item.quantity || 1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bill */}
            <View style={{ marginTop: rs(20) }}>
              <Text style={{ color: C.text, fontSize: nz(16), fontWeight: '700', marginBottom: rs(12) }}>Bill Details</Text>
              <View style={{ backgroundColor: C.surface, borderRadius: rs(12), padding: rs(16), borderWidth: 1, borderColor: C.surfaceBorder }}>
                {[
                  { label: 'Subtotal', value: orderItems.reduce((sum, i) => sum + (i.amount || 0) * (i.quantity || 1), 0), show: true },
                  { label: 'Platform Fee', value: selectedOrder.PlateformFee, show: selectedOrder.PlateformFee > 0 },
                  { label: 'GST on Fee', value: selectedOrder.GstOnPlateformFee, show: selectedOrder.GstOnPlateformFee > 0 },
                  { label: 'GST on Food', value: selectedOrder.GstOnFood, show: selectedOrder.GstOnFood > 0 },
                ].filter(r => r.show).map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(8) }}>
                    <Text style={{ color: C.textSub, fontSize: nz(13) }}>{row.label}</Text>
                    <Text style={{ color: C.text, fontSize: nz(13), fontWeight: '500' }}>₹{row.value}</Text>
                  </View>
                ))}
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  borderTopWidth: 1, borderTopColor: C.divider, paddingTop: rs(12), marginTop: rs(4),
                }}>
                  <Text style={{ color: C.text, fontSize: nz(16), fontWeight: '700' }}>Total</Text>
                  <Text style={{ color: C.primary, fontSize: nz(18), fontWeight: '800' }}>₹{totalAmount}</Text>
                </View>
              </View>
            </View>

            {/* Order Info */}
            <View style={{ marginTop: rs(20) }}>
              <Text style={{ color: C.text, fontSize: nz(16), fontWeight: '700', marginBottom: rs(12) }}>Order Info</Text>
              <View style={{ backgroundColor: C.surface, borderRadius: rs(12), padding: rs(16), borderWidth: 1, borderColor: C.surfaceBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar" size={rs(18)} color={C.textSub} />
                  <View style={{ marginLeft: rs(12), flex: 1 }}>
                    <Text style={{ color: C.textMuted, fontSize: nz(11) }}>Date & Time</Text>
                    <Text style={{ color: C.text, fontSize: nz(13), fontWeight: '600' }}>
                      {formatDate(selectedOrder.createdAt || selectedOrder.updatedAt)} at {formatTime(selectedOrder.createdAt || selectedOrder.updatedAt)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: rs(12) }}>
                  <Ionicons name="document-text" size={rs(18)} color={C.textSub} />
                  <View style={{ marginLeft: rs(12), flex: 1 }}>
                    <Text style={{ color: C.textMuted, fontSize: nz(11) }}>Order ID</Text>
                    <Text style={{ color: C.text, fontSize: nz(12), fontWeight: '600' }} numberOfLines={2}>{fullOrderId}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Help Button */}
            <TouchableOpacity
              style={{
                backgroundColor: C.primaryBg,
                borderColor: C.primaryLight + '30',
                borderWidth: 1,
                borderRadius: rs(12),
                paddingVertical: rs(12),
                marginTop: rs(20),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                const o = selectedOrder;
                handleCloseModal();
                setTimeout(() => handleHelpPress(o), 350);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses" size={rs(18)} color={C.primary} />
              <Text style={{ color: C.primary, fontSize: nz(14), fontWeight: '600', marginLeft: rs(8) }}>
                Need Help with this Order?
              </Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={{
                backgroundColor: C.primary,
                paddingVertical: rs(14),
                borderRadius: rs(12),
                alignItems: 'center',
                marginTop: rs(12),
              }}
              onPress={handleCloseModal}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFF', fontSize: nz(16), fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>

            <View style={{ height: rs(20) }} />
          </View>
        </ScrollView>
      </Animated.View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerBg} />

      {/* ── Header ── */}
      <View style={{
        paddingTop: insets.top,
        backgroundColor: C.headerBg,
        borderBottomLeftRadius: rs(24),
        borderBottomRightRadius: rs(24),
        paddingBottom: rs(16),
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: rs(16),
          paddingTop: rs(14),
        }}>
          <Text style={{ fontSize: nz(18), fontWeight: '700', color: C.headerText }}>My Order</Text>
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: rs(16),
        paddingBottom: rs(12),
        gap: rs(8),
        paddingTop: rs(12),
      }}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveFilter(tab)}
            style={{
              paddingHorizontal: rs(18),
              paddingVertical: rs(8),
              borderRadius: rs(50),
              backgroundColor: activeFilter === tab ? C.tabActiveBg : C.tabInactiveBg,
            }}
            activeOpacity={0.7}
          >
            <Text style={{
              fontSize: nz(13),
              fontWeight: '600',
              color: activeFilter === tab ? C.tabActiveText : C.tabInactiveText,
            }}>
              {tab === 'All' ? 'All Orders' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Orders FlatList ── */}
      <FlatList
        data={loading ? Array(6).fill({}) : filteredOrders}
        renderItem={({ item }) =>
          loading
            ? <OrderSkeleton rs={rs} isDark={isDark} />
            : renderOrderItem({ item })
        }
        keyExtractor={(item, index) =>
          loading ? `sk-${index}` : (item._id || item.Id || `o-${index}`)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: rs(4),
          paddingBottom: rs(120),
          flexGrow: filteredOrders.length === 0 ? 1 : 0,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: rs(20) }}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={{ color: C.textSub, marginLeft: rs(8), fontSize: nz(13) }}>Loading more orders...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={renderEmptyComponent}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={21}
        initialNumToRender={10}
      />

      {/* ── Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
        statusBarTranslucent
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: C.backdrop, opacity: modalBackdropAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseModal} />
          </Animated.View>
          {renderModalContent()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({});