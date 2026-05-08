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
  
  _ws = new WebSocket(CONFIG.wsUrl);
  
  _ws.onopen = () => {
    _wsState = 'open';
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
      
      if (frame.type === 'ping' || frame.type === 'confirm_subscription') {
        if (DEBUG && frame.type === 'confirm_subscription') {
        }
        return;
      }
      
      if (frame.type === 'welcome') {
        return;
      }
      
      if (DEBUG) console.log('📨 WebSocket message received:', JSON.stringify(frame, null, 2));
      
      const msg = frame.message;
      
      if (msg?.event === 'message.created') {
        const messageData = msg.data;
      
        if (messageData && messageData.message_type !== 0) {
          _callbacks.forEach(cb => { 
            try { 
              cb(messageData); 
            } catch (err) {
              console.error('Callback error:', err);
            } 
          });
        } else if (messageData?.message_type === 0) {
        }
      }
    } catch (err) {
    }
  };

  _ws.onerror = (error) => {
  };

  _ws.onclose = ({ code, reason }) => {
    console.log(`🔌 WebSocket closed - Code: ${code}, Reason: ${reason}`);
    clearInterval(_pingTimer);
    _wsState = 'idle';
    _ws = null;
    if (code !== 1000 && _contact) {
      _reconnTimer = setTimeout(_connect, 5000);
    }
  };
};

const _disconnect = () => {
  clearTimeout(_reconnTimer);
  clearInterval(_pingTimer);
  if (_ws) { 
    _ws.close(1000, 'User disconnected'); 
    _ws = null; 
  }
  _wsState = 'idle';
};


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
    if (_wsState === 'idle') _connect();
    return { success: true };
  }
  
  // Fast-path 2: AsyncStorage
  const saved = await restoreFromStorage(phone);
  if (saved) {
    _contact = saved.contact;
    _conversation = saved.conversation;
    _userKey = phone;
    if (_wsState === 'idle') _connect();
    return { success: true };
  }

  try {
    const backendResult = await AuthService.getOrCreateChatwootContact();
    
    if (backendResult.success && backendResult.data) {
      const data = backendResult.data;
      
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
      
      _connect();
      
      return { success: true };
    }
    
    throw new Error(backendResult.message || 'Backend returned no data');
  } catch (err) {
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
    return { success: true, data };
  } catch (err) { 
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
    const result = await http(
      `/public/api/v1/inboxes/${CONFIG.inbox}/contacts/${sid}/conversations/${_conversation.id}/messages`,
    );

    const arr = result?.payload ?? result ?? [];
    const sorted = [...arr].sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
    
    if (DEBUG) {
      sorted.forEach(msg => {
        console.log(`  Message ID: ${msg.id}, Type: ${msg.message_type}, Content: "${msg.content?.substring(0, 50)}..."`);
      });
    }
    
    return sorted;
  } catch (err) { 
    return []; 
  }
};

export const onMessage = (cb) => {
  _callbacks.push(cb);
  return () => { 
    _callbacks = _callbacks.filter(c => c !== cb);
    console.log(`➖ Removed message callback (total: ${_callbacks.length})`);
  };
};

export const disconnect = () => _disconnect();

export const reset = async () => {
  _disconnect();
  if (_userKey) {
    try { await AsyncStorage.multiRemove([SK('c', _userKey), SK('v', _userKey)]); } catch (_) {}
  }
  _contact = _conversation = _userKey = null;
  _callbacks = [];
};

export default { initialize, sendMessage, sendAttachment, fetchMessages, onMessage, disconnect, reset };