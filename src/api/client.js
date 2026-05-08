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

let refreshTimer       = null;
let isRefreshing       = false;   // prevents concurrent refresh calls
let pendingQueue       = [];      // requests waiting while token refreshes

const flushQueue = (newToken) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    newToken ? resolve(newToken) : reject(new Error("Session expired")),
  );
  pendingQueue = [];
};

const decodeTokenExpiry = (token) => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token, bufferSec = 0) => {
  const exp = decodeTokenExpiry(token);
  if (!exp) return true;
  return Math.floor(Date.now() / 1000) >= exp - bufferSec;
};

let isLoggingOut = false;   // ← prevents multiple simultaneous logout calls

const logoutUser = async () => {
  if (isLoggingOut) return;   // ← already logging out, ignore
  isLoggingOut = true;

  cancelTokenRefresh();
  flushQueue(null);

  try {
    const useAuthStore = require("../store/authStore").default;
    useAuthStore.getState().logout?.();
  } catch {}

  setTimeout(() => { isLoggingOut = false; }, 3000);
};

const MAX_REFRESH_RETRIES = 3;
let refreshRetryCount     = 0;

const refreshToken = async () => {
  if (isRefreshing) return;  // guard against concurrent calls
  isRefreshing = true;

  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) {
      await logoutUser();
      return;
    }

    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/user/update-token`,
      { token },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      },
    );

    const newToken = response.data?.data?.accessToken;
    if (!newToken) throw new Error("Empty token in refresh response");

    await AsyncStorage.setItem("authToken", newToken);
    try {
      const useAuthStore = require("../store/authStore").default;
      const current      = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().login({ ...current, accessToken: newToken }, newToken);
      }
    } catch {}

    refreshRetryCount = 0;            // reset retry counter on success
    flushQueue(newToken);             // unblock waiting requests
    scheduleTokenRefresh(newToken);   // schedule next refresh

  } catch (err) {
    refreshRetryCount += 1;

    if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
      refreshRetryCount = 0;
      await logoutUser();
      return;
    }

    const backoffMs = Math.min(10_000 * 2 ** (refreshRetryCount - 1), 60_000);
    refreshTimer = setTimeout(refreshToken, backoffMs);
  } finally {
    isRefreshing = false;
  }
};

export const scheduleTokenRefresh = (token) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const exp = decodeTokenExpiry(token);
  if (!exp) return;

  const BUFFER_SEC    = 60;   // refresh 1 minute before expiry
  const nowSec        = Math.floor(Date.now() / 1000);
  const refreshInSec  = exp - nowSec - BUFFER_SEC;

  if (refreshInSec <= 0) {
    refreshToken();
    return;
  }

  refreshTimer = setTimeout(refreshToken, refreshInSec * 1000);
};

export const cancelTokenRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

client.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status          = error.response?.status;

    if (status === 401) {
      if (isLoggingOut) return Promise.reject(error);

      if (originalRequest.url?.includes("/user/update-token")) {
        await logoutUser();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      if (!originalRequest._retried) {
        originalRequest._retried = true;
        try {
          await refreshToken();
          const newToken = await AsyncStorage.getItem("authToken");
          if (!newToken) { await logoutUser(); return Promise.reject(error); }
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        } catch {
          await logoutUser();
          return Promise.reject(error);
        }
      }

      await logoutUser();
      return Promise.reject(error);
    }

    if (__DEV__) {
      const code = status ?? "Network";
      const url  = originalRequest?.url ?? "";
      const map  = {
        403: `Forbidden — ${url}`,
        404: `Not found — ${url}`,
        422: `Validation error — ${url}`,
        429: "Rate limited — back off and retry",
        500: "Internal server error",
        502: "Bad gateway",
        503: "Service unavailable",
      };
    }

    return Promise.reject(error);
  },
);

client.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status          = error.response?.status;

    if (status === 401) {
      if (originalRequest.url?.includes("/user/update-token")) {
        await logoutUser();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(client(originalRequest));
            },
            reject,
          });
        });
      }

      if (!originalRequest._retried) {
        originalRequest._retried = true;

        try {
          await refreshToken();
          const newToken = await AsyncStorage.getItem("authToken");

          if (!newToken) {
            await logoutUser();
            return Promise.reject(error);
          }

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);   // replay original request
        } catch {
          await logoutUser();
          return Promise.reject(error);
        }
      }

      await logoutUser();
      return Promise.reject(error);
    }

    if (__DEV__) {
      const code = status ?? "Network";
      const url  = originalRequest?.url ?? "";
      const map  = {
        403: `Forbidden — ${url}`,
        404: `Not found — ${url}`,
        422: `Validation error — ${url}`,
        429: "Rate limited — back off and retry",
        500: "Internal server error",
        502: "Bad gateway",
        503: "Service unavailable",
      };
    }

    return Promise.reject(error);
  },
);

export const TokenManager = {
  setToken: async (token) => {
    try {
      await AsyncStorage.setItem("authToken", token);
      scheduleTokenRefresh(token);
    } catch {}
  },

  getToken: async () => {
    try {
      return await AsyncStorage.getItem("authToken");
    } catch {
      return null;
    }
  },

  removeToken: async () => {
    try {
      cancelTokenRefresh();
      await AsyncStorage.removeItem("authToken");
    } catch {}
  },

  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) return false;
      return !isTokenExpired(token);   // also false if token is already expired
    } catch {
      return false;
    }
  },
};

export default client;