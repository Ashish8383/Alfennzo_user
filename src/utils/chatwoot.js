import ChatwootAPI from '../api/chatwootApi';

const getOrderItems = (o) => Array.isArray(o?.order) ? o.order : Array.isArray(o?.items) ? o.items : [];
const getOrderTotal = (o) => o?.TotalAmount || o?.totalAmount || getOrderItems(o).reduce((s, i) => s + (i.amount || 0) * (i.quantity || 1), 0);
const getOrderStatus = (o) => {
  if (o?.isCancelled) return { label: 'Cancelled',              emoji: '❌' };
  if (o?.isDelivered) return { label: 'Delivered',              emoji: '✅' };
  if (o?.AcceptOrder) return { label: 'Accepted by Restaurant', emoji: '👨‍🍳' };
  return                     { label: 'Pending Acceptance',     emoji: '⏳' };
};
const fmtDate = (s) => {
  if (!s) return { date: 'N/A', time: 'N/A' };
  const d = new Date(s);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

export const ChatwootService = {
  formatOrderAsCustomAttributes: (order) => {
    if (!order) return null;
    const items          = getOrderItems(order);
    const status         = getOrderStatus(order);
    const { date, time } = fmtDate(order.createdAt || order.updatedAt);
    return {
      orderId:           order.Id || order.OrderId || order.orderId || order._id?.slice(-8) || 'N/A',
      fullOrderId:       order.Id || order._id || 'N/A',
      phone:             order.phone || order.contact?.phone || '',
      orderStatus:       status.label,
      orderStatusEmoji:  status.emoji,
      isCancelled:       !!order.isCancelled,
      isDelivered:       !!order.isDelivered,
      isAccepted:        !!order.AcceptOrder,
      restaurantName:    order.restaurantName    || '',
      restaurantAddress: order.restaurantAddress || '',
      seatNo:            order.seatNo            || '',
      orderItems: items.map(i => ({
        name:     i.foodName || 'Item',
        quantity: i.quantity || 1,
        amount:   (i.amount || 0) * (i.quantity || 1),
        size:     i.size && i.size !== 'default' ? i.size : null,
        type:     i.foodtype || null,
      })),
      orderTotal:       getOrderTotal(order),
      platformFee:      order.PlateformFee      || 0,
      gstOnPlatformFee: order.GstOnPlateformFee || 0,
      gstOnFood:        order.GstOnFood         || 0,
      paymentGateway:   order.PaymentGateWay    || order.paymentGateway || '',
      paymentStatus:    order.PaymentStatus     || order.paymentStatus  || 'SUCCESS',
      orderDate:        date,
      orderTime:        time,
    };
  },

  buildOrderContextMessage: (orderData) => {
    if (!orderData) return null;
    const D = '─────────────────────';
    const items = (orderData.orderItems || [])
      .map(i => `• ${i.quantity}x ${i.name}${i.size ? ` (${i.size})` : ''}${i.type ? ` [${i.type}]` : ''} ₹${i.amount.toFixed(2)}`)
      .join('\n');
    const subtotal = (orderData.orderItems || []).reduce((s, i) => s + i.amount, 0);
    const bill = [
      `Total Paid: ₹${Number(orderData.orderTotal).toFixed(2)}`,
    ].filter(Boolean).join('\n');

    return [
      `🎟 ORDER SUPPORT`,
      D,
      `Order ID: ${orderData.fullOrderId}`,
      `Date: ${orderData.orderDate}, ${orderData.orderTime}`,
      orderData.phone && `Customer: +91 ${orderData.phone}`,
      D,
      orderData.restaurantName    && `Venue: ${orderData.restaurantName}`,
      orderData.seatNo            && `Seat: ${orderData.seatNo}`,
      D,
      `🛒 Items\n${items || 'No items'}`,
      D,
      `💰 Bill\n${bill}`,
      D,
      `Order Status | ${orderData.orderStatusEmoji} ${orderData.orderStatus}`,
      D,
      `Where is my order?`,
    ].filter(Boolean).join('\n');
  },

  initialize: (userData) => ChatwootAPI.initialize(userData),
  disconnect: ()         => ChatwootAPI.disconnect(),
  reset:      ()         => ChatwootAPI.reset(),
};

export default ChatwootService;