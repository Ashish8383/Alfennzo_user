import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const APP_VERSION =Constants.expoConfig?.version || Constants.manifest?.version;
export const APP_TYPE = Platform.OS === 'android' ? 'ANDROID' : 'IOS';