import { Platform } from 'react-native';
import { TranscriptionResult, VoiceError } from './types';

// expo-speech-recognition is the recommended Expo-compatible STT library.
// It wraps the native SpeechRecognition APIs on iOS and Android.
// Import is wrapped in a try/catch so the module can be made optional at
// build time if the native module has not been linked yet.
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Module not installed – will surface a NOT_SUPPORTED error at runtime.
}

export { useSpeechRecognitionEvent };

/**
 * Returns whether the current platform supports speech recognition.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (!ExpoSpeechRecognitionModule) return false;
  // Web is not supported by expo-speech-recognition
  if (Platform.OS === 'web') return false;
  return true;
}

/**
 * Starts a speech recognition session.
 *
 * @param locale  BCP-47 language tag (e.g. 'en-US', 'es-ES').  Defaults to
 *                the device locale.
 */
export async function startTranscription(locale: string = 'en-US'): Promise<void | VoiceError> {
  if (!isSpeechRecognitionSupported()) {
    return {
      code: 'NOT_SUPPORTED',
      message: 'Speech recognition is not available on this device.',
    };
  }

  try {
    await ExpoSpeechRecognitionModule.start({
      lang: locale,
      interimResults: true,   // stream partial results for UX feedback
      maxAlternatives: 1,
      continuous: false,      // single-utterance mode
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    });
  } catch (err: any) {
    return {
      code: 'RECOGNITION_FAILED',
      message: err?.message ?? 'Failed to start speech recognition.',
    };
  }
}

/**
 * Stops an active speech recognition session.
 */
export async function stopTranscription(): Promise<void> {
  if (!ExpoSpeechRecognitionModule) return;
  try {
    await ExpoSpeechRecognitionModule.stop();
  } catch {
    // Ignore errors when stopping — the session may have already ended.
  }
}

/**
 * Aborts an active session without firing a result.
 */
export async function abortTranscription(): Promise<void> {
  if (!ExpoSpeechRecognitionModule) return;
  try {
    await ExpoSpeechRecognitionModule.abort();
  } catch {
    // Ignore
  }
}

/**
 * Maps a raw expo-speech-recognition error code to our internal VoiceError.
 */
export function mapSpeechError(code: string, message?: string): VoiceError {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return { code: 'PERMISSION_DENIED', message: 'Microphone permission was denied.' };
    case 'network':
      return { code: 'NETWORK_ERROR', message: 'A network error occurred during recognition.' };
    case 'no-speech':
      return { code: 'RECOGNITION_FAILED', message: 'No speech was detected. Please try again.' };
    case 'aborted':
      return { code: 'RECOGNITION_FAILED', message: 'Recognition was cancelled.' };
    default:
      return {
        code: 'UNKNOWN',
        message: message ?? `Speech recognition error: ${code}`,
      };
  }
}

/**
 * Parses a raw result event from expo-speech-recognition into our
 * TranscriptionResult shape.
 */
export function parseTranscriptionResult(event: any): TranscriptionResult | null {
  const results: any[] = event?.results ?? [];
  if (results.length === 0) return null;

  const best = results[0];
  const transcript: string = best?.transcript ?? best?.[0]?.transcript ?? '';
  const confidence: number = best?.confidence ?? best?.[0]?.confidence ?? 0;

  if (!transcript.trim()) return null;

  return { text: transcript.trim(), confidence };
}
