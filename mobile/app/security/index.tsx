import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  authenticateSensitiveAction,
  getBiometricDeviceSupport,
  isBiometricEnabled,
  savePinCode,
  setBiometricEnabled,
  verifyPinCode,
} from "../src/security/auth";
import type { BiometricDeviceSupport } from "../src/security/auth";
import { useThemeColors } from "../src/hooks/useThemeColors";
import { useScreenTracking } from "../src/hooks/useScreenTracking";

export default function SecuritySetupScreen() {
  const colors = useThemeColors();
  useScreenTracking('security-setup');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [support, setSupport] = useState<BiometricDeviceSupport | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinFallback, setPinFallback] = useState("");
  const [showPinFallback, setShowPinFallback] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      const [deviceSupport, biometricsOn] = await Promise.all([
        getBiometricDeviceSupport(),
        isBiometricEnabled(),
      ]);
      setSupport(deviceSupport);
      setBiometricEnabledState(biometricsOn);
    } catch {
      setErrorMessage("Unable to load security settings.");
    }
  }, []);

  useEffect(() => {
    loadState().finally(() => setIsLoading(false));
  }, [loadState]);

  const onRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    setErrorMessage(null);
    await loadState();
    setRefreshing(false);
  };

  const handleEnableBiometrics = async () => {
    setErrorMessage(null); setMessage(null); setIsBusy(true);
    try {
      await setBiometricEnabled(true);
      setBiometricEnabledState(true);
      setMessage("Biometric authentication enabled.");
    } catch { setErrorMessage("Unable to enable biometrics."); }
    finally { setIsBusy(false); }
  };

  const handleDisableBiometrics = async () => {
    setErrorMessage(null); setMessage(null); setIsBusy(true);
    try {
      await setBiometricEnabled(false);
      setBiometricEnabledState(false);
      setMessage("Biometric authentication disabled.");
    } catch { setErrorMessage("Unable to update biometric preference."); }
    finally { setIsBusy(false); }
  };

  const handleSavePin = async () => {
    setErrorMessage(null); setMessage(null); setIsBusy(true);
    try {
      await savePinCode(pinInput);
      setPinInput("");
      setMessage("PIN saved. It will be used as fallback.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save PIN.");
    } finally { setIsBusy(false); }
  };

  const handleSensitiveAction = async () => {
    setErrorMessage(null); setMessage(null); setShowPinFallback(false); setPinFallback(""); setIsBusy(true);
    try {
      const result = await authenticateSensitiveAction();
      if (result.isAuthorized) { setMessage("Authentication success. Sensitive action unlocked."); return; }
      if (result.requiresPin) setShowPinFallback(true);
      setErrorMessage(result.errorMessage ?? "Authentication failed.");
    } catch { setErrorMessage("Authentication failed. Please try again."); }
    finally { setIsBusy(false); }
  };

  const handlePinFallback = async () => {
    setErrorMessage(null); setMessage(null); setIsBusy(true);
    try {
      const success = await verifyPinCode(pinFallback);
      if (!success) { setErrorMessage("Incorrect PIN."); return; }
      setShowPinFallback(false); setPinFallback("");
      setMessage("PIN accepted. Sensitive action unlocked.");
    } catch { setErrorMessage("Unable to verify PIN."); }
    finally { setIsBusy(false); }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={[styles.title, { color: colors.text }]}>Security Setup</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Enable biometrics for supported devices and configure PIN fallback for sensitive actions.
        </Text>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Biometric Support</Text>
          <Text style={[styles.cardText, { color: colors.subtext }]}>Hardware: {support?.hasHardware ? "Yes" : "No"}</Text>
          <Text style={[styles.cardText, { color: colors.subtext }]}>Enrolled: {support?.isEnrolled ? "Yes" : "No"}</Text>
          <Text style={[styles.cardText, { color: colors.subtext }]}>Status: {biometricEnabled ? "Enabled" : "Disabled"}</Text>
          {support?.reason ? <Text style={styles.warningText}>{support.reason}</Text> : null}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleEnableBiometrics}
              disabled={isBusy || !support?.canUseBiometrics}
            >
              <Text style={styles.primaryButtonText}>Enable Biometrics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.borderAlt }]}
              onPress={handleDisableBiometrics}
              disabled={isBusy}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Disable</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>PIN Fallback</Text>
          <TextInput
            value={pinInput}
            onChangeText={setPinInput}
            keyboardType="number-pad"
            placeholder="Enter 4-8 digit PIN"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.inputText }]}
            maxLength={8}
          />
          <TouchableOpacity
            style={[styles.primaryButtonWide, { backgroundColor: colors.primary }]}
            onPress={handleSavePin}
            disabled={isBusy}
          >
            <Text style={styles.primaryButtonText}>Save PIN</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBg }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sensitive Action Demo</Text>
          <TouchableOpacity
            style={[styles.primaryButtonWide, { backgroundColor: colors.primary }]}
            onPress={handleSensitiveAction}
            disabled={isBusy}
          >
            <Text style={styles.primaryButtonText}>Authenticate</Text>
          </TouchableOpacity>
          {showPinFallback ? (
            <View style={styles.pinFallbackWrap}>
              <TextInput
                value={pinFallback}
                onChangeText={setPinFallback}
                keyboardType="number-pad"
                placeholder="Enter PIN"
                placeholderTextColor={colors.muted}
                secureTextEntry
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.inputBg, color: colors.inputText }]}
                maxLength={8}
              />
              <TouchableOpacity
                style={[styles.secondaryButtonWide, { borderColor: colors.borderAlt }]}
                onPress={handlePinFallback}
                disabled={isBusy}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Submit PIN</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {isBusy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.busyText, { color: colors.subtext }]}>Working...</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <Text style={[styles.errorText, { color: colors.errorText, backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
            {errorMessage}
          </Text>
        ) : null}
        {message ? (
          <Text style={[styles.successText, { color: colors.successText, backgroundColor: colors.successBg, borderColor: colors.successBorder }]}>
            {message}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  cardTitle: { fontWeight: "700", fontSize: 16 },
  cardText: {},
  warningText: { color: "#FBBF24" },
  row: { flexDirection: "row", gap: 8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  primaryButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryButtonWide: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  secondaryButton: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  secondaryButtonWide: { borderRadius: 10, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { fontWeight: "600", fontSize: 14 },
  pinFallbackWrap: { gap: 8, marginTop: 6 },
  busyRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  busyText: {},
  errorText: { padding: 10, borderRadius: 10, borderWidth: 1 },
  successText: { padding: 10, borderRadius: 10, borderWidth: 1 },
});
