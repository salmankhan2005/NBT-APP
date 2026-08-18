import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Trip } from '../db/database';

interface LoginScreenProps {
  onLoginSuccess: (driverId: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState(''); // email state variable holds the Driver ID
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pinRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !pin.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tripId = await db.login(email.trim(), pin.trim());

      if (tripId) {
        onLoginSuccess(tripId);
      } else {
        setError('Invalid Tracking ID or PIN. Please try again.');
      }
    } catch (e) {
      console.error('[Login] Unexpected error:', e);
      setError('Invalid Tracking ID or PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdChange = (text: string) => {
    setEmail(text);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Area */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="local-shipping" size={48} color={COLORS.onPrimary} />
            </View>
            <Text style={styles.title}>New Balaji Transport</Text>
            <Text style={styles.subtitle}>Driver Console</Text>
          </View>

          {/* Form Area */}
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Tracking ID Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tracking ID</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="local-shipping" size={24} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TRK-ABC1234"
                  placeholderTextColor={COLORS.outline}
                  autoCapitalize="characters"
                  value={email}
                  onChangeText={handleIdChange}
                />
              </View>
            </View>

            {/* PIN Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>PIN</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="dialpad" size={24} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  ref={pinRef}
                  style={[styles.input, styles.pinInput]}
                  placeholder="••••••"
                  placeholderTextColor={COLORS.outline}
                  secureTextEntry={!showPin}
                  value={pin}
                  onChangeText={setPin}
                  maxLength={20}
                />
                <TouchableOpacity
                  style={styles.visibilityBtn}
                  onPress={() => setShowPin(!showPin)}
                >
                  <MaterialIcons
                    name={showPin ? 'visibility' : 'visibility-off'}
                    size={24}
                    color={COLORS.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.onSecondaryContainer} />
              ) : (
                <>
                  <MaterialIcons name="login" size={24} color={COLORS.onSecondaryContainer} />
                  <Text style={styles.loginBtnText}>LOGIN</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Open Auth Mode Helper Card */}
            <View style={styles.helperCard}>
              <Text style={styles.helperTitle}>Open Auth Mode Active</Text>
              <Text style={styles.helperText}>
                Any Tracking ID & PIN will be accepted for testing.
              </Text>
              <Text style={styles.helperSub}>
                Default Trip: TRK-5566 (Senthil Rajesh)
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.gutter * 1.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.stack * 1.5,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 10px rgba(4, 22, 50, 0.15)',
    elevation: 8,
    marginBottom: SPACING.gutter,
  },
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 32,
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorContainer,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 12,
    padding: SPACING.gutter,
    marginBottom: SPACING.gutter,
    gap: 8,
  },
  errorText: {
    color: COLORS.onErrorContainer,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    marginBottom: SPACING.gutter * 1.2,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    height: SPACING.touchTargetLarge,
    paddingHorizontal: SPACING.gutter,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    color: COLORS.textDark,
  },
  pinInput: {
    letterSpacing: Platform.OS === 'ios' ? 8 : 4,
    fontWeight: 'bold',
  },
  visibilityBtn: {
    padding: 4,
  },
  loginBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: SPACING.touchTargetLarge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    boxShadow: '0px 4px 8px rgba(254, 166, 25, 0.20)',
    elevation: 4,
    marginTop: SPACING.gutter,
  },
  loginBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.onSecondaryContainer,
  },
  helperCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: SPACING.gutter,
    marginTop: SPACING.stack * 1.2,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  helperSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 6,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});
