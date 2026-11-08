import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export async function buzz(kind: 'vote' | 'due' | 'checkin') {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.vibrate) {
      const pattern =
        kind === 'due' ? [80, 40, 80, 40, 180] : kind === 'vote' ? [40, 30, 70] : [50];
      navigator.vibrate(pattern);
      return;
    }
    await Haptics.notificationAsync(
      kind === 'due'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success,
    );
  } catch {
    // Este navegador o emulador no expone vibración.
  }
}
