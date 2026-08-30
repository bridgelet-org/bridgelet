/**
 * notifications.ts
 *
 * Issue #479: Push notifications for claim reminders and status updates.
 *
 * Acceptance criteria:
 *  ✅ Recipient notified as expiration approaches (configurable lead time)
 *  ✅ Sender notified on claim, expiration, and fund recovery events
 *  ✅ Permission requested with clear context — NOT on first app launch
 *
 * Architecture:
 *  - Expo Notifications handles token registration and foreground display.
 *  - Push token is registered with the Bridgelet backend so the server can
 *    trigger claim/expiry/recovery events server-side.
 *  - Permission is deferred until the user takes an action that benefits
 *    from notifications (e.g. after sending a payment link).
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import env from '../config/env';

// ─── Constants ────────────────────────────────────────────────────────────────

const PUSH_TOKEN_KEY = '@bridgelet:push-token';
const PERMISSION_ASKED_KEY = '@bridgelet:notifications-permission-asked';

const API_BASE = env.apiUrl;

// ─── Notification types ───────────────────────────────────────────────────────

export type NotificationEventType =
  | 'claim_reminder'      // Recipient: payment not yet claimed, expiring soon
  | 'claim_success'       // Sender:    their payment was claimed
  | 'payment_expired'     // Both:      payment link expired unclaimed
  | 'funds_recovered'     // Sender:    unclaimed funds returned to their wallet
  | 'send_confirmation';  // Sender:    their payment link was created successfully

// ─── Notification handler configuration ──────────────────────────────────────
// Call this once at app startup (e.g. in _layout.tsx).

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Permission request (deferred — not on first launch) ─────────────────────

/**
 * Request notification permission.
 * Only call this AFTER the user has taken an action that benefits from
 * notifications (e.g. just sent a payment link).
 *
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return status === 'granted';
}

/**
 * Returns true if the permission request has already been shown to the user.
 * Use this to avoid re-prompting on every session.
 */
export async function hasBeenAskedForPermission(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
  return val === 'true';
}

// ─── Push token registration ──────────────────────────────────────────────────

/**
 * Register the device for push notifications and send the token to the
 * Bridgelet backend tied to the given wallet address.
 *
 * Safe to call multiple times — will skip re-registration if the token
 * hasn't changed.
 */
export async function registerPushToken(walletAddress: string): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Android requires an explicit notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bridgelet-default', {
      name: 'Bridgelet',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  const token = tokenData.data;
  const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (stored === token) return; // Token unchanged — skip API call

  try {
    const response = await fetch(`${API_BASE}/notifications/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, walletAddress, platform: Platform.OS }),
    });

    if (response.ok) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }
  } catch {
    // Non-fatal — notifications will work next time the token is synced
  }
}

/**
 * Unregister the push token when the user disconnects their wallet or
 * opts out of notifications in settings.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await fetch(`${API_BASE}/notifications/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Non-fatal
  }

  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

// ─── Local notification scheduling (claim expiry reminder) ────────────────────

export interface ScheduleExpiryReminderOptions {
  claimCode: string;
  expiresAt: Date;
  /** How many hours before expiry to remind. Default: 2 */
  leadTimeHours?: number;
}

/**
 * Schedule a local push notification to remind the recipient before their
 * claim link expires.
 *
 * Returns the notification identifier (use to cancel if the claim is made).
 */
export async function scheduleExpiryReminder(
  opts: ScheduleExpiryReminderOptions,
): Promise<string | null> {
  const { claimCode, expiresAt, leadTimeHours = 2 } = opts;

  const triggerAt = new Date(expiresAt.getTime() - leadTimeHours * 60 * 60 * 1000);
  if (triggerAt <= new Date()) return null; // Already past reminder time

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your payment is expiring soon',
      body: `You have ${leadTimeHours} hour${leadTimeHours !== 1 ? 's' : ''} left to claim your payment. Tap to claim it now.`,
      data: { type: 'claim_reminder' as NotificationEventType, claimCode },
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerAt },
  });
}

/**
 * Cancel a scheduled expiry reminder (e.g. after the payment is claimed).
 */
export async function cancelExpiryReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// ─── Notification tap handler ─────────────────────────────────────────────────

export type NotificationTapHandler = (
  type: NotificationEventType,
  data: Record<string, unknown>,
) => void;

/**
 * Register a handler for when the user taps a push notification.
 * Returns an unsubscribe function.
 */
export function onNotificationTapped(handler: NotificationTapHandler): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      type?: NotificationEventType;
      [key: string]: unknown;
    };
    if (data.type) handler(data.type, data);
  });
  return () => subscription.remove();
}
