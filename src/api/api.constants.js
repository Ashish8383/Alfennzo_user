export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/user/login",
    VERIFY_OTP: "/user/verifyOTP",
    LOGOUT: "/user/logout",
    REFRESH_TOKEN: "/user/refresh-token",
    CHECK_AUTH: "/user/check-auth",
  },
  
  USER: {
    PROFILE: "/user/profile",
    UPDATE_PROFILE: "/user/update-profile",
    DELETE_ACCOUNT: "/user/delete-account",
    GET_ORDERS: "/user/getUserOrder",
  },
  
};

export const API_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};