import client, { scheduleTokenRefresh, TokenManager } from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useAuthStore from "../store/authStore";
import ChatwootAPI from "./chatwootApi";
import { APP_TYPE, APP_VERSION } from "../utils/appInfo";

class AuthService {
  // ─── Login (Send OTP) ──────────────────────────────────────────────────
  static async login(phoneNumber) {
    try {
      const cleanPhone = phoneNumber.replace(/^\+91/, "");
      const response = await client.post("/user/login", {
        phone: cleanPhone,
      });
      const responseData = response.data;
      if (responseData?.status === true || responseData?.statusCode === 200) {
        return {
          success: true,
          message: responseData?.message || "OTP sent successfully",
          data: responseData?.data || {},
        };
      } else {
        return {
          success: false,
          message: responseData?.message || "Failed to send OTP",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to send OTP",
        error: error.response?.data,
      };
    }
  }

  // ─── Verify OTP ────────────────────────────────────────────────────────
  static async verifyOTP(phoneNumber, otp) {
    try {
      const cleanPhone = phoneNumber.replace(/^\+91/, "");
      const response = await client.post("/user/verifyOTP", {
        phone: cleanPhone,
        otp: otp,
      });
      const responseData = response.data;
      if (responseData?.status === true || responseData?.statusCode === 200) {
        const userData = responseData?.data;
        const token = userData?.accessToken;
        if (token) {
          await TokenManager.setToken(token);
          await AsyncStorage.setItem("userData", JSON.stringify(userData));
        }
        if (userData && token) {
          useAuthStore.getState().login(userData, token);
        }
        return {
          success: true,
          message: responseData?.message || "Verification successful",
          data: userData,
          token: token,
          user: userData,
        };
      } else {
        return {
          success: false,
          message: responseData?.message || "Invalid OTP",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Invalid OTP",
        error: error.response?.data,
      };
    }
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────
  static async resendOTP(phoneNumber) {
    return await this.login(phoneNumber);
  }

  // ─── Logout ────────────────────────────────────────────────────────────
  static async logout() {
    try {
      await ChatwootAPI.reset();
      await TokenManager.removeToken();
      await AsyncStorage.removeItem("userData");
      useAuthStore.getState().logout();
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  // ─── Delete Account ───────────────────────────────────────────────────
  static async deleteAccount() {
    try {
      const response = await client.delete("/user/delete-account");
      const responseData = response.data;

      if (responseData?.status === true || responseData?.statusCode === 200) {
        // Clear all local session data after successful deletion
        await ChatwootAPI.reset();
        await TokenManager.removeToken();
        await AsyncStorage.removeItem("userData");
        useAuthStore.getState().logout();
        return {
          success: true,
          message: responseData?.message || "Account deleted successfully",
        };
      }

      return {
        success: false,
        message: responseData?.message || "Failed to delete account",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || "Failed to delete account",
      };
    }
  }

  // ─── Initialize Auth from Storage ──────────────────────────────────────
  static async initializeAuth() {
    try {
      const token = await TokenManager.getToken();
      const userData = await AsyncStorage.getItem("userData");
      if (token && userData) {
        const user = JSON.parse(userData);
        useAuthStore.getState().login(user, token);
        return true;
      }
      useAuthStore.getState().logout();
      return false;
    } catch (error) {
      useAuthStore.getState().logout();
      return false;
    }
  }

  // ─── Get User Orders ──────────────────────────────────────────────────
  static async getUserOrders(page = 1, limit = 10, filters = {}) {
    try {
      const params = { page, limit, ...filters };
      const response = await client.get("/user/getUserOrder", { params });
      const responseData = response.data;

      if (responseData?.status === true || responseData?.statusCode === 200) {
        const paginationData = responseData.data;
        return {
          success: true,
          data: {
            data: paginationData.data || [],
            currentPage: paginationData.currentPage || page,
            totalPages: paginationData.totalPages || 1,
            totalDocuments: paginationData.totalDocuments || 0,
            hasMore: (paginationData.currentPage || page) < (paginationData.totalPages || 1),
          },
          message: responseData?.message || "Orders fetched successfully",
        };
      }
      return { success: false, message: responseData?.message || "Failed to fetch orders", data: null };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message || "Failed to fetch orders", data: null };
    }
  }

  // ─── Chatwoot Contact (POST with phone + fullname) ────────────────────
  static async getOrCreateChatwootContact(initialMessage = '') {
    try {
      const userData = useAuthStore.getState().user;
      let phone = userData?.phone || userData?.phoneNumber || userData?.mobile || '';
      phone = phone.replace(/^\+91/, '').replace(/\D/g, '');
      const fullname = userData?.fullname || userData?.fullName || userData?.name || 'Customer';

      const response = await client.post('/user/CheckorCreateandSendMessageChatwootContact', {
        phone: phone,
        fullname: fullname,
        intialMessage: initialMessage || '',
      });


      const responseData = response.data;
      console.log('📊 Chatwoot Response:', {
        status: responseData?.status,
        contactId: responseData?.data?.chatwoot_contact_id,
        conversationId: responseData?.data?.chatwoot_conversation_id,
      });

      if (responseData?.status === true || responseData?.statusCode === 200) {
        return {
          success: true,
          data: responseData.data || responseData,
          message: responseData?.message || 'Contact ready',
        };
      }

      return {
        success: false,
        message: responseData?.message || 'Failed to get contact',
      };
    } catch (error) {
      console.log('❌ Chatwoot Contact Error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to get contact',
        error: error.response?.data,
      };
    }
  }

  static async initializeAuth() {
  try {
    const token = await TokenManager.getToken();
    const userData = await AsyncStorage.getItem("userData");
    if (token && userData) {
      const user = JSON.parse(userData);
      useAuthStore.getState().login(user, token);
      scheduleTokenRefresh(token); 
      return true;
    }
    useAuthStore.getState().logout();
    return false;
  } catch (error) {
    console.log("Error initializing auth:", error);
    useAuthStore.getState().logout();
    return false;
  }
}

static async matchVersion() {
  try {
    const response = await client.post('/user/matchVersion', {
      type:    APP_TYPE,
      version: APP_VERSION,
      app:     'USER',
    });
    const d = response.data;
    console.log('🔄 Version Check Response:', d)  ;
    if (d?.status === true || d?.statusCode === 200) {
      return { success: true, isVersionMatched: d?.data?.isVersionMatched ?? true };
    }
    return { success: false, isVersionMatched: true };
  } catch {
    return { success: false, isVersionMatched: true };
  }
}

  // ─── Update Profile ───────────────────────────────────────────────────
static async updateProfile(fullname, birthDate) {
  try {
    const response = await client.post('/user/updateprofile', { fullname, birthDate });
    const responseData = response.data;
    if (responseData?.status === true || responseData?.statusCode === 200) {
      // Sync updated name into local store + storage
      const current = useAuthStore.getState().user;
      const updated = { ...current, fullname };
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      useAuthStore.getState().login(updated, await TokenManager.getToken());
      return { success: true, message: responseData?.message || 'Profile updated', data: responseData.data };
    }
    return { success: false, message: responseData?.message || 'Failed to update profile' };
  } catch (error) {
    return { success: false, message: error.response?.data?.message || error.message || 'Failed to update profile' };
  }
}

  // ─── Get Order Detail ─────────────────────────────────────────────────
  static async getOrderDetail(orderId) {
    try {
      console.log(`📦 Fetching order detail: ${orderId}`);
      const response = await client.get(`/user/getOrderDetail/${orderId}`);
      const responseData = response.data;

      if (responseData?.status === true || responseData?.statusCode === 200) {
        return {
          success: true,
          data: responseData.data,
          message: responseData?.message || "Order detail fetched successfully",
        };
      }
      return { success: false, message: responseData?.message || "Failed to fetch order detail", data: null };
    } catch (error) {
      console.log("❌ Get Order Detail Error:", error.response?.data || error.message);
      return { success: false, message: error.response?.data?.message || error.message || "Failed to fetch order detail", data: null };
    }
  }
}

export default AuthService;