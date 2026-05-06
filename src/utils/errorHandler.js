import { Alert } from "react-native";

export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please login again."
        );
        break;
      case 403:
        Alert.alert(
          "Access Denied",
          "You don't have permission to perform this action."
        );
        break;
      case 404:
        Alert.alert(
          "Not Found",
          "The requested resource was not found."
        );
        break;
      case 422:
        const validationErrors = data?.errors;
        const errorMessage = validationErrors
          ? Object.values(validationErrors).flat().join("\n")
          : data?.message || "Validation failed";
        Alert.alert("Validation Error", errorMessage);
        break;
      case 429:
        Alert.alert(
          "Too Many Requests",
          "Please wait a moment before trying again."
        );
        break;
      case 500:
        Alert.alert(
          "Server Error",
          "Something went wrong on our end. Please try again later."
        );
        break;
      default:
        Alert.alert(
          "Error",
          data?.message || "An unexpected error occurred."
        );
    }
  } else if (error.request) {
    // Network error
    Alert.alert(
      "Network Error",
      "Please check your internet connection and try again."
    );
  } else {
    // Other errors
    Alert.alert(
      "Error",
      error.message || "An unexpected error occurred."
    );
  }
};