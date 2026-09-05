import React, { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme';
import { db } from '../db/database';

interface LoginScreenProps {
  onLoginSuccess: (driverId: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('DRV-5566');
  const [pin, setPin] = useState('123456');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pinRef = useRef<TextInput>(null);

  const executeLogin = async (inputDriverId: string, inputPin: string) => {
    setLoading(true);
    setError('');

    try {
      const tripId = await db.login(inputDriverId.trim(), inputPin.trim());
      if (tripId) {
        onLoginSuccess(tripId);
      } else {
        setError('Invalid Tracking ID or PIN. Please try again.');
      }
    } catch (e) {
      console.error('[Login] Error:', e);
      setError('Invalid Tracking ID or PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!email.trim() || !pin.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    executeLogin(email, pin);
  };

  const handleQuickDemoLogin = (driverId: string, driverPin: string) => {
    setEmail(driverId);
    setPin(driverPin);
    executeLogin(driverId, driverPin);
  };

  const handlePinKeyPress = (num: string) => {
    if (num === 'CLEAR') {
      setPin('');
    } else if (num === 'BACK') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (pin.length < 6) {
        setPin(prev => prev + num);
      }
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
        >
          {/* Header Area */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>NBT Logistics</Text>
            <Text style={styles.subtitle}>Driver Mobile Console</Text>
          </View>

          <View style={styles.form}>
            {/* ⚡ Instant 1-Click Client Demo Login Card */}
            <View style={styles.demoCard}>
              <View style={styles.demoHeader}>
                <MaterialIcons name="bolt" size={22} color="#F59E0B" />
                <Text style={styles.demoTitle}>1-Click Client Demo Login</Text>
              </View>

              <TouchableOpacity
                style={styles.demoChipPrimary}
                onPress={() => handleQuickDemoLogin('DRV-5566', '123456')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="local-shipping" size={22} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoChipTitle}>Senthil Rajesh (TN 38 AB 1234)</Text>
                  <Text style={styles.demoChipSub}>ID: DRV-5566 • PIN: 123456 • Salem to Bengaluru</Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoChipPrimary, { backgroundColor: '#0284C7' }]}
                onPress={() => handleQuickDemoLogin('DRV-4421', '654321')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="local-shipping" size={22} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoChipTitle}>Karthik Raja (TN 37 CB 5678)</Text>
                  <Text style={styles.demoChipSub}>ID: DRV-4421 • PIN: 654321 • Chennai to Kovai</Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={20} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Tracking ID Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Driver / Tracking ID</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="local-shipping" size={24} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DRV-5566"
                  placeholderTextColor={COLORS.outline}
                  autoCapitalize="characters"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* PIN Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Security PIN</Text>
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
                  maxLength={6}
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

            {/* Touch Keypad PIN Simulation */}
            <View style={styles.keypadGrid}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.keypadButton,
                    key === 'CLEAR' && styles.keypadSpecial,
                    key === 'BACK' && styles.keypadSpecial,
                  ]}
                  onPress={() => handlePinKeyPress(key)}
                  activeOpacity={0.7}
                >
                  {key === 'BACK' ? (
                    <MaterialIcons name="backspace" size={20} color={COLORS.textDark} />
                  ) : (
                    <Text style={[styles.keypadText, (key === 'CLEAR' || key === 'BACK') && styles.keypadSpecialText]}>
                      {key}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.onSecondaryContainer} />
              ) : (
                <>
                  <MaterialIcons name="login" size={24} color={COLORS.onSecondaryContainer} />
                  <Text style={styles.loginBtnText}>LOGIN DRIVER CONSOLE</Text>
                </>
              )}
            </TouchableOpacity>

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
  keyboardView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.gutter * 1.2,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.stack,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#041632',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  logoImage: { width: 90, height: 90 },
  title: {
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 28,
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  form: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  demoCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 4,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  demoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.2,
  },
  demoChipPrimary: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  demoChipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  demoChipSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
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
    marginBottom: SPACING.gutter,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 6,
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: SPACING.gutter,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    color: COLORS.textDark,
  },
  pinInput: {
    letterSpacing: 6,
    fontWeight: 'bold',
  },
  visibilityBtn: { padding: 4 },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 12,
  },
  keypadButton: {
    width: '31%',
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  keypadSpecial: {
    backgroundColor: '#F1F5F9',
  },
  keypadText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  keypadSpecialText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  loginBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    marginTop: 8,
  },
  loginBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.onSecondaryContainer,
  },
});
