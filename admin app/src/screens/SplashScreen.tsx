import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [progressAnim] = useState(new Animated.Value(0));
  const [statusMessage, setStatusMessage] = useState('Connecting to NBT Secure Gateway...');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Pulsing logo animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.ease,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Progress bar animation (2.5 seconds total)
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Listener for progress text & steps
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressPercent(Math.round(value));
      if (value > 66) {
        setStatusMessage('Initializing Operations Dashboard...');
      } else if (value > 33) {
        setStatusMessage('Syncing Real-Time Fleet Telemetry & GPS...');
      } else {
        setStatusMessage('Connecting to NBT Secure Gateway...');
      }
    });

    // Auto complete after 2.6 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2600);

    return () => {
      progressAnim.removeListener(listenerId);
      clearTimeout(timer);
    };
  }, [onComplete]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.contentBox}>
        {/* Pulsing Logo */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>NBT</Text>
          </View>
        </Animated.View>

        <Text style={styles.appTitle}>NEW BALAJI TRANSPORTS</Text>
        <Text style={styles.appSubtitle}>Enterprise Logistics & Dispatch Suite</Text>

        {/* Progress Bar Container */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.statusText}>{statusMessage}</Text>
            <Text style={styles.percentText}>{progressPercent}%</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <ActivityIndicator size="small" color="#38bdf8" />
          <Text style={styles.footerText}>Secure TLS 1.3 • Neon Postgres Live</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050b29',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  contentBox: {
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    color: '#050b29',
    fontWeight: '900',
    fontSize: 32,
    letterSpacing: 2,
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  appSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 36,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 999,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  percentText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
});
