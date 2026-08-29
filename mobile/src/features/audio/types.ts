/**
 * States for the TTS audio playback state machine
 */
export type AudioPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioPlaybackError {
  code: 'NOT_SUPPORTED' | 'PLAYBACK_FAILED' | 'LANGUAGE_UNSUPPORTED' | 'UNKNOWN';
  message: string;
}

export interface UseAudioPlaybackOptions {
  /** The text to be spoken */
  text: string;
  /** BCP-47 language tag, e.g. 'fr-FR'. Defaults to 'en-US'. */
  language?: string;
  /** Speech rate — 1.0 is normal speed */
  rate?: number;
  /** Speech pitch — 1.0 is default */
  pitch?: number;
}

export interface UseAudioPlaybackReturn {
  state: AudioPlaybackState;
  /** Play from the beginning (stops any in-progress playback first) */
  play: () => Promise<void>;
  /** Stop current playback */
  stop: () => void;
  error: AudioPlaybackError | null;
  clearError: () => void;
  /** Whether the current language is supported by the TTS engine */
  isLanguageSupported: boolean;
}
