/**
 * Voice recording states
 */
export type VoiceRecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

/**
 * Result returned after transcription completes
 */
export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

/**
 * Error codes for voice input failures
 */
export type VoiceErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'RECOGNITION_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
}

/**
 * Options passed to the useVoiceInput hook
 */
export interface UseVoiceInputOptions {
  /** BCP-47 language tag for the speech recognition locale, e.g. 'en-US' */
  locale?: string;
  /** Called when transcription succeeds */
  onTranscription: (result: TranscriptionResult) => void;
  /** Called when a non-fatal or fatal error occurs */
  onError?: (error: VoiceError) => void;
}
