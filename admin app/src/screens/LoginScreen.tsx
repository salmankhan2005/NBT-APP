import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db } from '../db/database';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 480;
  const isTablet = width >= 768;
  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('9999');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !pin.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await db.login(username.trim().toLowerCase(), pin.trim());
      if (success) {
        onLoginSuccess();
      } else {
        setError('Invalid Admin Username or PIN.');
      }
    } catch (e) {
      setError('Connection to secure backend failed.');
    } finally {
      setLoading(false);
    }
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header Area */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="admin-panel-settings" size={56} color={COLORS.onPrimary} />
            </View>
            <Text style={styles.title}>NBT + ARS</Text>
            <Text style={styles.subtitle}>Fleet Command Console</Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, isCompact && styles.cardCompact, isTablet && styles.cardWide]}>
            <Text style={styles.cardTitle}>Admin Credentials</Text>
            
            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ADMIN USERNAME</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter username (e.g. admin)"
                  placeholderTextColor={COLORS.outline}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* PIN Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SECURITY PIN</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 4-digit PIN (e.g. 9999)"
                  placeholderTextColor={COLORS.outline}
                  secureTextEntry={!showPin}
                  keyboardType="numeric"
                  value={pin}
                  onChangeText={setPin}
                  maxLength={6}
                  autoComplete="current-password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.visibilityBtn}>
                  <MaterialIcons
                    name={showPin ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={COLORS.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>ACCESS CONSOLE</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: COLORS.surfaceContainerHigh,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderColor: COLORS.outlineVariant,
              }}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="dashboard" size={18} color={COLORS.primary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>
                QUICK CONSOLE ACCESS (VIEW ALL DATA)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.footer}>
            <MaterialIcons name="security" size={14} color={COLORS.textMuted} />
            <Text style={styles.footerText}>
              Authorized Admin Access Only. Activity is audited and logged.
            </Text>
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
    paddingHorizontal: SPACING.gutter,
    paddingVertical: SPACING.stack,
    paddingBottom: SPACING.stack + 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    ...SHADOWS.light,
  },
  cardCompact: {
    padding: 20,
  },
  cardWide: {
    paddingHorizontal: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorContainer,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    minHeight: 56,
    paddingRight: 8,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  visibilityBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    height: '100%',
  },
  loginBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    ...SHADOWS.light,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 6,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
