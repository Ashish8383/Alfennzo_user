// api/chatwootApi.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from './apiService';

const CONFIG = {
  baseUrl: 'https://chats.alfennzo.com',
  inbox: 'ejf6TdvNtKK4B2H2w1LymvXM',
  wsUrl: 'wss://chats.alfennzo.com/cable',
};

let _contact = null;
let _conversation = null;
let _userKey = null;
let _ws = null;
let _wsState = 'idle';
let _callbacks = [];
let _pingTimer = null;
let _reconnTimer = null;
let _initPromise = null;

// Debug mode - set to true to see detailed WebSocket logs
const DEBUG = true;

const SK = (type, key) => `cw_${type}_${key}`;

const persist = async (userKey, contact, conversation) => {
  try {
    await AsyncStorage.multiSet([
      [SK('c', userKey), JSON.stringify(contact)],
      [SK('v', userKey), JSON.stringify(conversation)],
    ]);
  } catch (_) {}
};

const restoreFromStorage = async (userKey) => {
  try {
    const [[, c], [, v]] = await AsyncStorage.multiGet([SK('c', userKey), SK('v', userKey)]);
    if (c && v) return { contact: JSON.parse(c), conversation: JSON.parse(v) };
  } catch (_) {}
  return null;
};

const http = async (path, opts = {}) => {
  const res = await fetch(`${CONFIG.baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
};

const _connect = () => {
  if (_wsState !== 'idle' || !_contact?.pubsub_token) return;
  clearTimeout(_reconnTimer);
  _wsState = 'connecting';

  console.log('🔌 Connecting WebSocket...');
  
  _ws = new WebSocket(CONFIG.wsUrl);
  
  _ws.onopen = () => {
    _wsState = 'open';
    console.log('✅ WebSocket connected');
    
    // Subscribe to the room channel
    const subscribeMsg = {
      command: 'subscribe',
      identifier: JSON.stringify({ 
        channel: 'RoomChannel', 
        pubsub_token: _contact.pubsub_token 
      }),
    };
    
    console.log('📡 Subscribing to channel:', subscribeMsg);
    _ws.send(JSON.stringify(subscribeMsg));
    
    clearInterval(_pingTimer);
  };

  _ws.onmessage = ({ data }) => {
    try {
      const frame = JSON.parse(data);
      
      // Ignore ping/pong and subscription confirmation messages
      if (frame.type === 'ping' || frame.type === 'confirm_subscription') {
        if (DEBUG && frame.type === 'confirm_subscription') {
          console.log('✅ Channel subscription confirmed');
        }
        return;
      }
      
      // Handle welcome message
      if (frame.type === 'welcome') {
        console.log('👋 WebSocket welcome message received');
        return;
      }
      
      if (DEBUG) console.log('📨 WebSocket message received:', JSON.stringify(frame, null, 2));
      
      // Extract the actual message from the frame
      const msg = frame.message;
      
      if (msg?.event === 'message.created') {
        const messageData = msg.data;
        
        if (DEBUG) {
          console.log('📩 New message event:', {
            id: messageData?.id,
            type: messageData?.message_type,
            content: messageData?.content?.substring(0, 50),
            sender: messageData?.sender?.name,
          });
        }
        
        // FIXED: Accept all incoming message types (1, 3, and any other non-outgoing types)
        // message_type 0 = outgoing (user message) - we don't need to handle these via WebSocket
        // message_type 1 = incoming (agent message) 
        // message_type 3 = template/auto-response (welcome messages, canned responses)
        if (messageData && messageData.message_type !== 0) {
          console.log(`✅ Processing message type ${messageData.message_type}:`, messageData.content?.substring(0, 100));
          _callbacks.forEach(cb => { 
            try { 
              cb(messageData); 
            } catch (err) {
              console.error('Callback error:', err);
            } 
          });
        } else if (messageData?.message_type === 0) {
          console.log('ℹ️ Skipping outgoing message from WebSocket');
        }
      }
    } catch (err) {
      console.error('❌ WebSocket message parse error:', err, 'Raw data:', data?.substring(0, 200));
    }
  };

  _ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error.message);
  };

  _ws.onclose = ({ code, reason }) => {
    console.log(`🔌 WebSocket closed - Code: ${code}, Reason: ${reason}`);
    clearInterval(_pingTimer);
    _wsState = 'idle';
    _ws = null;
    if (code !== 1000 && _contact) {
      console.log('🔄 Scheduling reconnection in 5 seconds...');
      _reconnTimer = setTimeout(_connect, 5000);
    }
  };
};

const _disconnect = () => {
  console.log('👋 Disconnecting WebSocket');
  clearTimeout(_reconnTimer);
  clearInterval(_pingTimer);
  if (_ws) { 
    _ws.close(1000, 'User disconnected'); 
    _ws = null; 
  }
  _wsState = 'idle';
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const initialize = (userData) => {
  if (_initPromise) return _initPromise;
  _initPromise = _doInit(userData).finally(() => { _initPromise = null; });
  return _initPromise;
};

const _doInit = async (userData) => {
  const phone = (userData.phone || userData.phoneNumber || userData.mobile || '')
    .replace(/^\+91/, '').replace(/\D/g, '');
  const name = userData.fullname || userData.fullName || userData.name || 'Customer';
  
  if (!phone) return { success: false, message: 'No phone number' };
  
  // Fast-path 1: Already in memory
  if (_contact && _conversation && _userKey === phone) {
    console.log('✅ Using in-memory contact/conversation');
    if (_wsState === 'idle') _connect();
    return { success: true };
  }
  
  // Fast-path 2: AsyncStorage
  const saved = await restoreFromStorage(phone);
  if (saved) {
    _contact = saved.contact;
    _conversation = saved.conversation;
    _userKey = phone;
    console.log('✅ Restored from storage - Contact:', _contact.id, 'Conversation:', _conversation.id);
    if (_wsState === 'idle') _connect();
    return { success: true };
  }

  // Network path: Use backend to get/create contact with existing conversation
  try {
    console.log('📞 Fetching Chatwoot contact from backend...');
    const backendResult = await AuthService.getOrCreateChatwootContact();
    
    if (backendResult.success && backendResult.data) {
      const data = backendResult.data;
      
      // Build contact object from backend response
      _contact = {
        id: data.chatwoot_contact_id,
        source_id: data.chatwoot_source_id,
        pubsub_token: data.chatwoot_pubsub_token,
        name: data.fullname || name,
        identifier: data.phone || phone,
      };
      
      // Build conversation object from backend response
      _conversation = {
        id: data.chatwoot_conversation_id,
        status: 'open',
      };
      
      _userKey = phone;
      
      // Persist to AsyncStorage
      await persist(phone, _contact, _conversation);
      
      console.log('✅ Initialized from backend - Contact:', _contact.id, 'Conversation:', _conversation.id);
      
      // Connect WebSocket with pubsub_token from backend
      _connect();
      
      return { success: true };
    }
    
    throw new Error(backendResult.message || 'Backend returned no data');
  } catch (err) {
    console.error('❌ Init error:', err.message);
    return { success: false, message: err.message };
  }
};

export const sendMessage = async (content) => {
  if (!_contact || !_conversation) return { success: false };
  const sid = _contact.source_id || _contact.id;
  try {
    const data = await http(
      `/public/api/v1/inboxes/${CONFIG.inbox}/contacts/${sid}/conversations/${_conversation.id}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
    );
    console.log('📤 Message sent successfully');
    return { success: true, data };
  } catch (err) { 
    console.error('❌ Send message error:', err);
    return { success: false }; 
  }
};

export const sendAttachment = (fileUri, fileType, fileName) => {
  return new Promise((resolve) => {
    if (!_contact || !_conversation) return resolve({ success: false });
    const sid = _contact.source_id || _contact.id;
    const url = `${CONFIG.baseUrl}/public/api/v1/inboxes/${CONFIG.inbox}/contacts/${sid}/conversations/${_conversation.id}/messages`;
    const formData = new FormData();
    formData.append('attachments[]', { uri: fileUri, type: fileType || 'image/jpeg', name: fileName || 'photo.jpg' });
    formData.append('content', '');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = () => {
      try { 
        resolve({ success: xhr.status >= 200 && xhr.status < 300, data: JSON.parse(xhr.responseText) }); 
      }
      catch (_) { resolve({ success: false }); }
    };
    xhr.onerror = () => resolve({ success: false });
    xhr.send(formData);
  });
};

export const fetchMessages = async () => {
  if (!_contact || !_conversation) {
    console.log('⚠️ No contact/conversation for fetching messages');
    return [];
  }
  const sid = _contact.source_id || _contact.id;
  try {
    console.log('📥 Fetching messages...');
    const result = await http(
      `/public/api/v1/inboxes/${CONFIG.inbox}/contacts/${sid}/conversations/${_conversation.id}/messages`,
    );

    const arr = result?.payload ?? result ?? [];
    const sorted = [...arr].sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
    
    console.log(`📥 Fetched ${sorted.length} messages`);
    
    // Log message types for debugging
    if (DEBUG) {
      sorted.forEach(msg => {
        console.log(`  Message ID: ${msg.id}, Type: ${msg.message_type}, Content: "${msg.content?.substring(0, 50)}..."`);
      });
    }
    
    return sorted;
  } catch (err) { 
    console.error('❌ Fetch messages error:', err);
    return []; 
  }
};

export const onMessage = (cb) => {
  _callbacks.push(cb);
  console.log(`➕ Added message callback (total: ${_callbacks.length})`);
  return () => { 
    _callbacks = _callbacks.filter(c => c !== cb);
    console.log(`➖ Removed message callback (total: ${_callbacks.length})`);
  };
};

export const disconnect = () => _disconnect();

export const reset = async () => {
  console.log('🔄 Resetting Chatwoot state');
  _disconnect();
  if (_userKey) {
    try { await AsyncStorage.multiRemove([SK('c', _userKey), SK('v', _userKey)]); } catch (_) {}
  }
  _contact = _conversation = _userKey = null;
  _callbacks = [];
};

export default { initialize, sendMessage, sendAttachment, fetchMessages, onMessage, disconnect, reset };