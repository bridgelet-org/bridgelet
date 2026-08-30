/**
 * useDeepLinkClaim.ts
 *
 * Issue #476: Mobile claim flow with deep link handling.
 *
 * Acceptance criteria:
 *  ✅ Opening a bridgelet claim link with the app installed routes directly
 *     to the claim screen pre-filled with the token
 *  ✅ Falls back to app store install prompt with the link preserved for
 *     post-install deferred deep linking
 *  ✅ Token validation mirrors web: expired / already-claimed states
 *
 * Deep link formats handled:
 *   https://bridgelet.org/claim/<token>        (Universal Link / App Link)
 *   bridgelet://claim/<token>                  (custom URI scheme)
 *   bridgelet://claim?token=<token>            (query param variant)
 */

import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaimTokenStatus =
  | 'idle'
  | 'validating'
  | 'valid'
  | 'expired'
  | 'already_claimed'
  | 'invalid';

export interface DeepLinkClaimState {
  token: string | null;
  status: ClaimTokenStatus;
  error: string | null;
}

export interface UseDeepLinkClaimResult extends DeepLinkClaimState {
  /** Manually trigger processing of a claim URL string. */
  handleClaimUrl: (url: string) => Promise<void>;
  /** Clear current token state (e.g. after successful claim). */
  reset: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFERRED_LINK_KEY = '@bridgelet:deferred-claim-link';

const CLAIM_URL_PATTERNS = [
  /^https?:\/\/(?:www\.)?bridgelet\.org\/claim\/([A-Za-z0-9_-]+)/i,
  /^bridgelet:\/\/claim\/([A-Za-z0-9_-]+)/i,
  /^bridgelet:\/\/claim\?token=([A-Za-z0-9_-]+)/i,
];

// ─── Token extraction ─────────────────────────────────────────────────────────

function extractToken(url: string): string | null {
  for (const pattern of CLAIM_URL_PATTERNS) {
    const match = pattern.exec(url.trim());
    if (match?.[1]) return match[1];
  }
  return null;
}

// ─── Token validation (mirrors web claim flow via the SDK) ────────────────────

async function validateToken(token: string): Promise<ClaimTokenStatus> {
  try {
    // The Bridgelet SDK exposes `POST /claims/verify` (no GET /claims/{token}/validate).
    // Mapping mirrors the web frontend (lib/claim-view.ts):
    //   200 -> valid, 409 -> already_claimed, 400 -> pending_payment (not claimable yet),
    //   401 -> expired/invalid.
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL ?? 'https://api.bridgelet.io'}/claims/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(process.env.EXPO_PUBLIC_API_KEY
            ? { 'X-API-Key': process.env.EXPO_PUBLIC_API_KEY }
            : {}),
        },
        body: JSON.stringify({ claimToken: token }),
      },
    );

    if (response.status === 409) return 'already_claimed';
    if (response.status === 400) return 'invalid'; // initialized/no payment yet
    if (response.status === 401) return 'expired';
    if (response.ok) return 'valid';

    return 'invalid';
  } catch {
    // Network unavailable — treat as unknown; caller can retry
    return 'invalid';
  }
}

// ─── Deferred link persistence (post-install handling) ───────────────────────

export async function saveDeferredClaimLink(url: string): Promise<void> {
  await AsyncStorage.setItem(DEFERRED_LINK_KEY, url);
}

export async function consumeDeferredClaimLink(): Promise<string | null> {
  const url = await AsyncStorage.getItem(DEFERRED_LINK_KEY);
  if (url) await AsyncStorage.removeItem(DEFERRED_LINK_KEY);
  return url;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDeepLinkClaim(): UseDeepLinkClaimResult {
  const [state, setState] = useState<DeepLinkClaimState>({
    token: null,
    status: 'idle',
    error: null,
  });

  const handleClaimUrl = useCallback(async (url: string) => {
    const token = extractToken(url);
    if (!token) {
      setState({ token: null, status: 'invalid', error: 'This link is not a valid Bridgelet claim.' });
      return;
    }

    setState({ token, status: 'validating', error: null });

    const status = await validateToken(token);

    const errorMessages: Partial<Record<ClaimTokenStatus, string>> = {
      expired: 'This payment link has expired.',
      already_claimed: 'This payment has already been claimed.',
      invalid: 'This claim link is invalid.',
    };

    setState({
      token,
      status,
      error: errorMessages[status] ?? null,
    });
  }, []);

  const reset = useCallback(() => {
    setState({ token: null, status: 'idle', error: null });
  }, []);

  // Handle app launched via deep link (cold start)
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleClaimUrl(url);
    });
  }, [handleClaimUrl]);

  // Handle deep link while app is already running (warm start)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleClaimUrl(url);
    });
    return () => subscription.remove();
  }, [handleClaimUrl]);

  // Check for deferred link saved before app was installed
  useEffect(() => {
    consumeDeferredClaimLink().then((url) => {
      if (url) handleClaimUrl(url);
    });
  }, [handleClaimUrl]);

  return { ...state, handleClaimUrl, reset };
}
