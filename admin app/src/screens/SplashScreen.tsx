import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [progressAnim] = useState(new Animated.Value(0));
  const [statusMessage, setStatusMessage] = useState('Initializing NBT System...');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Logo scale-in and fade animation
    const a1 = Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    a1.start();

    // Pulsing glow effect
    const loopAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loopAnim.start();

    // Progress bar animation (2.5 seconds total)
    const progAnim = Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    progAnim.start();

    // Listener for progress text & status steps
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressPercent(Math.round(value));
      if (value > 75) {
        setStatusMessage('Launching Admin Command Center...');
      } else if (value > 50) {
        setStatusMessage('Syncing Fleet Data & GPS Coordinates...');
      } else if (value > 25) {
        setStatusMessage('Connecting to Neon Postgres Database...');
      } else {
        setStatusMessage('Initializing NBT System...');
      }
    });

    // Auto complete after 2.8 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      progressAnim.removeListener(listenerId);
      clearTimeout(timer);
      a1.stop();
      loopAnim.stop();
      progAnim.stop();
    };
  }, []);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Background Animation */}
      <View style={styles.backgroundGradient} />

      <View style={styles.contentBox}>
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoBadge,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Animated Rings */}
          <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />
        </Animated.View>

        {/* Title */}
        <Text style={styles.appTitle}>NEW BALAJI TRANSPORT</Text>
        <Text style={styles.appSubtitle}>Enterprise Fleet Command Suite</Text>

        {/* Animated Progress Container */}
        <View style={styles.progressContainer}>
          {/* Gradient Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressBarWidth }]} />
            <Animated.View
              style={[
                styles.progressGlow,
                {
                  width: progressBarWidth,
                  opacity: opacityAnim,
                },
              ]}
            />
          </View>

          {/* Progress Metadata */}
          <View style={styles.progressMeta}>
            <Text style={styles.statusText}>{statusMessage}</Text>
            <Text style={styles.percentText}>{progressPercent}%</Text>
          </View>

          {/* Loading Steps */}
          <View style={styles.stepsContainer}>
            <StepIndicator step={1} isActive={progressPercent >= 33} label="System Init" />
            <StepIndicator step={2} isActive={progressPercent >= 66} label="Database" />
            <StepIndicator step={3} isActive={progressPercent >= 90} label="Dashboard" />
          </View>
        </View>

        {/* System Info Footer */}
        <View style={styles.footerRow}>
          <View style={styles.systemTag}>
            <View style={styles.activeDot} />
            <Text style={styles.systemText}>System Online</Text>
          </View>
          <Text style={styles.securityText}>🔒 Secure TLS 1.3</Text>
        </View>
      </View>
    </View>
  );
}

function StepIndicator({ step, isActive, label }: { step: number; isActive: boolean; label: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={[styles.stepDot, isActive && styles.stepDotActive]}>
        {isActive && <MaterialIcons name="check" size={12} color="#ffffff" />}
      </View>
      <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  contentBox: {
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 16,
    overflow: 'hidden',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  glowRing: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  appSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 36,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 999,
  },
  progressGlow: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    right: 0,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  percentText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  stepLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#38bdf8',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.1)',
  },
  systemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  systemText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  securityText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
});
