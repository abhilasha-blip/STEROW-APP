import HapticFeedback from 'react-native-haptic-feedback';

const options = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

export const haptics = {
  light: () => HapticFeedback.trigger('impactLight', options),
  error: () => HapticFeedback.trigger('notificationError', options),
  success: () => HapticFeedback.trigger('notificationSuccess', options),
};
