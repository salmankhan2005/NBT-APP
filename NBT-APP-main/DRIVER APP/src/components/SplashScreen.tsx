import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export default function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo scale and fade in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text slide up and fade in after 600ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, 600);

    // 3. Progress bar fill over 2.2 seconds
    Animated.timing(progressBarWidth, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false, // width animation does not support native driver
    }).start();

    // 4. Fade out entire screen after 2.8 seconds and call end callback
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        onAnimationEnd();
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Background Subtle Gradient Glow Circles */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <View style={styles.content}>
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <MaterialIcons name="local-shipping" size={64} color={COLORS.secondary} />
        </Animated.View>

        {/* Animated Text Titles */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>NEW BALAJI TRANSPORTS</Text>
          <Text style={styles.ampersand}>&</Text>
          <Text style={styles.subtitle}>ARS FLEET TRANSIT</Text>
          <Text style={styles.tagline}>Precision Logistics Console</Text>
        </Animated.View>

        {/* Animated Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressBarWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <Text style={styles.loadingText}>Initializing secure channel...</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  ampersand: {
    fontSize: 16,
    color: COLORS.secondary,
    marginVertical: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#cbd5e1',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    color: COLORS.outlineVariant,
    marginTop: 12,
    fontWeight: '500',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: width * 0.6,
    maxWidth: 240,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 60,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // Glowing abstract background assets
  glow1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(254, 166, 25, 0.08)',
  },
  glow2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(27, 43, 72, 0.5)',
  },
});
