import { Audio } from 'expo-av';
import { VoiceError } from './types';

/**
 * Requests microphone permission from the OS.
 *
 * Returns `true` when the permission is granted, `false` otherwise.
 * On platforms that don't support the Audio module (e.g. web), the function
 * returns `false` and populates `error`.
 */
export async function requestMicrophonePermission(): Promise<{
  granted: boolean;
  error?: VoiceError;
}> {
  try {
    const { status } = await Audio.requestPermissionsAsync();

    if (status === 'granted') {
      return { granted: true };
    }

    return {
      granted: false,
      error: {
        code: 'PERMISSION_DENIED',
        message:
          'Microphone access was denied. Please enable it in your device settings to use voice input.',
      },
    };
  } catch {
    return {
      granted: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Microphone permissions are not supported on this device or platform.',
      },
    };
  }
}

/**
 * Checks current microphone permission status without prompting the user.
 */
export async function getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'denied';
  }
}
