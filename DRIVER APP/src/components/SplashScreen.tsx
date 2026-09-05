import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

export default function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  // Animation values - 100% Native Driver compatible
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const progressBarScale = useRef(new Animated.Value(0.01)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo scale and fade in
    const a1 = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]);

    // 2. Text slide up and fade in
    const a2 = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]);

    // 3. Progress bar fill
    const a3 = Animated.timing(progressBarScale, {
      toValue: 1,
      duration: 1800,
      useNativeDriver: true,
    });

    a1.start();
    const t1 = setTimeout(() => a2.start(), 400);
    const t2 = setTimeout(() => a3.start(), 200);

    // 4. Fade out screen and end
    let a4: Animated.CompositeAnimation | null = null;
    const t3 = setTimeout(() => {
      a4 = Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      });
      a4.start(({ finished }) => {
        if (finished) {
          onAnimationEnd();
        }
      });
    }, 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      a1.stop();
      a2.stop();
      a3.stop();
      if (a4) a4.stop();
    };
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
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Text Titles */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.title}>NEW BALAJI TRANSPORT</Text>
          <Text style={styles.subtitle}>(NBT)</Text>
          <Text style={styles.tagline}>Precision Logistics Console</Text>
        </Animated.View>

        {/* Animated Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                transform: [
                  { scaleX: progressBarScale },
                  { translateX: progressBarScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-width * 0.3, 0],
                    })
                  }
                ],
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
    borderRadius: 60,
    backgroundColor: '#ffffff',
    borderWidth: 2.5,
    borderColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    overflow: 'hidden',
    padding: 3,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1.5,
    textAlign: 'center',
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
    width: '100%',
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
