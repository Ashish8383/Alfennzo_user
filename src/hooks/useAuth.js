import { useState, useCallback } from "react";
import AuthService from "../services/auth.service";

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (phoneNumber) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await AuthService.login(phoneNumber);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (phoneNumber, otp) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await AuthService.verifyOTP(phoneNumber, otp);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await AuthService.logout();
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const isAuth = await AuthService.isAuthenticated();
      return isAuth;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    login,
    verifyOTP,
    logout,
    checkAuth,
    clearError: () => setError(null),
  };
};