import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { TransferService } from './TransferService';
import { ShareSheet } from './ShareSheet';
import { useMobileWallet } from '../hooks/useMobileWallet';
import { CreateAccountRequest, CreateAccountResponse, SupportedAsset } from '../types/api';

type Step = 'amount' | 'recipient' | 'review' | 'success' | 'error';

export const SenderFlow: React.FC = () => {
  const [step, setStep] = useState<Step>('amount');
  const [assets, setAssets] = useState<SupportedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<CreateAccountResponse | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const { session } = useMobileWallet();
  const connectedPublicKey = session?.publicKey ?? null;

  // Form State
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<SupportedAsset | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchAssets = async () => {
      const availableAssets = await TransferService.getSupportedAssets();
      setAssets(availableAssets);
      if (availableAssets.length > 0) {
        setSelectedAsset(availableAssets[0]);
      }
    };
    fetchAssets();
  }, []);

  const handleCreateAccount = async () => {
    if (!selectedAsset || !amount || !recipientName) return;

    setLoading(true);
    setError(null);

    // `fundingSource` / `recovery_address` are required by the SDK. They must
    // come from a connected Stellar wallet session; surface a clear error if
    // no wallet is connected instead of sending a malformed request.
    if (!connectedPublicKey) {
      setError('Connect a Stellar wallet to send a payment.');
      setStep('error');
      setLoading(false);
      return;
    }

    const isNative = selectedAsset.code === 'XLM';
    const request: CreateAccountRequest = {
      fundingSource: connectedPublicKey,
      recovery_address: connectedPublicKey,
      amount,
      asset_code: isNative ? 'XLM' : selectedAsset.code,
      asset_issuer: isNative ? undefined : selectedAsset.issuer,
      expiresIn: 30 * 24 * 60 * 60, // Default 30 days
      metadata: {
        recipientName,
        message,
      },
    };

    try {
      const res = await TransferService.createEphemeralAccount(request);
      setResponse(res);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create ephemeral account. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderAmountStep = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How much are you sending?</Text>
      
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View style={styles.assetPicker}>
          {assets.map((asset) => (
            <TouchableOpacity
              key={asset.code}
              style={[
                styles.assetOption,
                selectedAsset?.code === asset.code && styles.selectedAssetOption,
              ]}
              onPress={() => setSelectedAsset(asset)}
            >
              <Text style={[
                styles.assetText,
                selectedAsset?.code === asset.code && styles.selectedAssetText,
              ]}>
                {asset.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, !amount && styles.disabledButton]}
        disabled={!amount}
        onPress={() => setStep('recipient')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRecipientStep = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Who is it for?</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Recipient Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          placeholderTextColor="#64748B"
          value={recipientName}
          onChangeText={setRecipientName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Message (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What's this for?"
          placeholderTextColor="#64748B"
          multiline
          numberOfLines={3}
          value={message}
          onChangeText={setMessage}
        />
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('amount')}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !recipientName && styles.disabledButton, { flex: 1 }]}
          disabled={!recipientName}
          onPress={() => setStep('review')}
        >
          <Text style={styles.buttonText}>Review</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderReviewStep = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review Transfer</Text>
      
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Amount</Text>
          <Text style={styles.reviewValue}>{amount} {selectedAsset?.code}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Recipient</Text>
          <Text style={styles.reviewValue}>{recipientName}</Text>
        </View>
        {message ? (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Message</Text>
            <Text style={styles.reviewValue}>{message}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('recipient')}>
          <Text style={styles.secondaryButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1 }]}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Confirm & Pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderSuccessStep = () => (
    <Animated.View entering={FadeIn} style={styles.statusContainer}>
      <View style={styles.successIcon}>
        <Text style={styles.iconText}>✅</Text>
      </View>
      <Text style={styles.statusTitle}>Transfer Created!</Text>
      <Text style={styles.statusSubtitle}>
        Share this link with {recipientName} to claim their funds.
      </Text>
      
      <View style={styles.linkCard}>
        <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
          {response?.claimUrl ?? 'Claim link unavailable'}
        </Text>
      </View>

      {response?.claimUrl && (
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => setShowShareSheet(true)}
        >
          <Text style={styles.shareButtonText}>📤 Share Claim Link</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          setAmount('');
          setRecipientName('');
          setMessage('');
          setStep('amount');
        }}
      >
        <Text style={styles.buttonText}>Create Another</Text>
      </TouchableOpacity>

      {response?.claimUrl && (
        <ShareSheet
          visible={showShareSheet}
          claimUrl={response.claimUrl}
          recipientName={recipientName}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </Animated.View>
  );

  const renderErrorStep = () => (
    <Animated.View entering={FadeIn} style={styles.statusContainer}>
      <View style={styles.errorIcon}>
        <Text style={styles.iconText}>❌</Text>
      </View>
      <Text style={styles.statusTitle}>Something went wrong</Text>
      <Text style={styles.statusSubtitle}>{error}</Text>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('review')}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 'amount' && renderAmountStep()}
        {step === 'recipient' && renderRecipientStep()}
        {step === 'review' && renderReviewStep()}
        {step === 'success' && renderSuccessStep()}
        {step === 'error' && renderErrorStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    width: '100%',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  assetPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  assetOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedAssetOption: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  assetText: {
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  selectedAssetText: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  reviewCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  reviewLabel: {
    color: '#94A3B8',
    fontSize: 16,
  },
  reviewValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  linkCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#334155',
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: '#10B981',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
