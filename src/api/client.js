import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Token Refresh Logic ──────────────────────────────────────────────────────
let refreshTimer = null;

const decodeTokenExpiry = (token) => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp || null; // unix timestamp in seconds
  } catch {
    return null;
  }
};

const refreshToken = async () => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) return;

    console.log("🔄 Refreshing token...");

    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/user/update-token`,
      { token },
      { 
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,  // ← add this
        } 
      }
    );

    const newToken = response.data?.data?.accessToken;
    if (!newToken) {
      console.log("❌ No new token in refresh response");
      return;
    }

    await AsyncStorage.setItem("authToken", newToken);

    try {
      const useAuthStore = require("../store/authStore").default;
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().login({ ...current, accessToken: newToken }, newToken);
      }
    } catch {}

    console.log("✅ Token refreshed successfully");
    scheduleTokenRefresh(newToken);
  } catch (err) {
    console.log("❌ Token refresh failed:", err.message);
    refreshTimer = setTimeout(refreshToken, 30 * 1000);
  }
};

export const scheduleTokenRefresh = (token) => {
  // Clear any existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const exp = decodeTokenExpiry(token);
  if (!exp) {
    console.log("⚠️ Could not decode token expiry");
    return;
  }

  console.log(exp,"exp time")

  const nowSec      = Math.floor(Date.now() / 1000);
  const bufferSec   = 60; // refresh 1 minute before expiry
  const refreshInSec = exp - nowSec - bufferSec;

  if (refreshInSec <= 0) {
    // Token already expired or about to — refresh immediately
    console.log("⚡ Token expiring soon, refreshing immediately...");
    refreshToken();
    return;
  }

const refreshInMs = refreshInSec * 1000;
  const refreshAt   = new Date(Date.now() + refreshInMs).toLocaleTimeString();
  console.log(`⏰ Token refresh scheduled at ${refreshAt} (in ${Math.round(refreshInSec / 60)} min)`);

  refreshTimer = setTimeout(refreshToken, refreshInMs);
};

export const cancelTokenRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
    console.log("🛑 Token refresh cancelled");
  }
};

// ─── Request Interceptor ──────────────────────────────────────────────────────
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("🔑 Token attached to request");
      }
    } catch (error) {
      console.log("Error reading token:", error);
    }
    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.baseURL + config.url,
      data: config.data,
      timestamp: new Date().toISOString(),
    });
    return config;
  },
  (error) => {
    console.log("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
client.interceptors.response.use(
  (response) => {
    console.log("📥 API Response:", {
      url: response.config.url,
      status: response.status,
      data: response.data,
      timestamp: new Date().toISOString(),
    });
    return response;
  },
  async (error) => {
    if (error.response) {
      console.log("❌ API Error Response:", {
        url: error.config?.url,
        status: error.response.status,
        data: error.response.data,
        timestamp: new Date().toISOString(),
      });
      switch (error.response.status) {
        case 401:
          await AsyncStorage.removeItem("authToken");
          cancelTokenRefresh();
          console.log("🔒 Session expired. Token cleared.");
          break;
        case 403:  console.log("🚫 Access forbidden"); break;
        case 404:  console.log("🔍 Endpoint not found:", error.config?.url); break;
        case 422:  console.log("⚠️ Validation error:", error.response.data); break;
        case 429:  console.log("⏳ Too many requests."); break;
        case 500:  console.log("💥 Internal server error"); break;
        case 502:  console.log("🌐 Bad gateway"); break;
        case 503:  console.log("🔄 Service unavailable"); break;
        default:   console.log(`❓ Unexpected error (${error.response.status})`);
      }
    } else if (error.request) {
      console.log("📡 Network Error: No response received");
    } else {
      console.log("⚠️ Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export const TokenManager = {
  setToken: async (token) => {
    try {
      await AsyncStorage.setItem("authToken", token);
      scheduleTokenRefresh(token); // ← start refresh timer on every new token
      console.log("✅ Token saved successfully");
    } catch (error) {
      console.log("Error saving token:", error);
    }
  },

  getToken: async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      return token;
    } catch (error) {
      console.log("Error getting token:", error);
      return null;
    }
  },

  removeToken: async () => {
    try {
      cancelTokenRefresh(); // ← stop refresh on logout
      await AsyncStorage.removeItem("authToken");
      console.log("🗑️ Token removed");
    } catch (error) {
      console.log("Error removing token:", error);
    }
  },

  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      return !!token;
    } catch {
      return false;
    }
  },
};

export default client;