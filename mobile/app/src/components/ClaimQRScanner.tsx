/**
 * ClaimQRScanner.tsx
 *
 * Issue #482: QR scanner for claim links.
 *
 * Acceptance criteria:
 *  ✅ Correctly parses a valid Bridgelet claim QR into the claim flow
 *  ✅ Clear error state for an invalid or unrelated QR code
 *  ✅ Camera permission requested with clear contextual explanation
 *
 * A valid Bridgelet claim QR contains a URL of the form:
 *   https://bridgelet.org/claim/<claim-code>
 * or the bare claim code:
 *   BL-<code>
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClaimQRScannerProps {
  /** Called with the extracted claim code on a successful scan. */
  onClaimCodeScanned: (claimCode: string) => void;
  /** Called when the user closes the scanner without a result. */
  onClose: () => void;
}

// ─── Claim code extraction ────────────────────────────────────────────────────

const BRIDGELET_CLAIM_URL_RE = /^https?:\/\/(?:www\.)?bridgelet\.org\/claim\/([A-Za-z0-9_-]+)$/i;
const BARE_CLAIM_CODE_RE = /^BL-[A-Za-z0-9_-]+$/i;

/**
 * Try to extract a Bridgelet claim code from a raw QR string.
 * Returns the claim code string, or null if the QR is not a Bridgelet claim.
 */
function extractClaimCode(raw: string): string | null {
  const trimmed = raw.trim();

  // Full URL form: https://bridgelet.org/claim/<code>
  const urlMatch = BRIDGELET_CLAIM_URL_RE.exec(trimmed);
  if (urlMatch?.[1]) return urlMatch[1];

  // Bare code form: BL-<code>
  if (BARE_CLAIM_CODE_RE.test(trimmed)) return trimmed;

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClaimQRScanner({ onClaimCodeScanned, onClose }: ClaimQRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const cooldownRef = useRef(false);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      // Debounce: ignore repeated scans within 2 seconds
      if (cooldownRef.current || scanned) return;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; }, 2000);

      const claimCode = extractClaimCode(data);
      if (claimCode) {
        setScanned(true);
        setError(null);
        onClaimCodeScanned(claimCode);
      } else {
        setError('This QR code is not a valid Bridgelet claim link. Please try again.');
      }
    },
    [scanned, onClaimCodeScanned],
  );

  // ── Permission not yet determined ──────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.center} testID="qr-scanner-loading">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Requesting camera access…</Text>
      </View>
    );
  }

  // ── Permission denied ──────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={styles.center} testID="qr-scanner-permission-denied">
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionBody}>
          Bridgelet needs access to your camera to scan claim QR codes.
          Your camera is only used while the scanner is open — no photos are
          taken or stored.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity
            style={styles.button}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open settings to grant camera permission"
          >
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close QR scanner"
        >
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera active ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container} testID="qr-scanner-screen">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        testID="qr-camera-view"
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.cutout} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionBox} pointerEvents="none">
        <Text style={styles.instruction}>
          Point the camera at a Bridgelet claim QR code
        </Text>
      </View>

      {/* Error message */}
      {error && (
        <View
          style={styles.errorBox}
          accessibilityLiveRegion="assertive"
          testID="qr-error-message"
        >
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => { setError(null); setScanned(false); }}
            accessibilityRole="button"
            accessibilityLabel="Try scanning again"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close QR scanner"
        testID="close-qr-scanner"
      >
        <Text style={styles.closeOverlayText}>✕ Close</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBody: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutout: {
    width: 250,
    height: 250,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#6366F1',
    backgroundColor: 'transparent',
  },
  instructionBox: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  errorBox: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
  retryText: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 14,
  },
  closeOverlay: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  closeOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
