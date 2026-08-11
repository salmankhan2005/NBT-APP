import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  style?: any;
}

export default function FadeInView({
  children,
  duration = 350,
  style = {},
}: FadeInViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current; // slide up from 15px

  useEffect(() => {
    // Reset to start values on mount
    fadeAnim.setValue(0);
    slideAnim.setValue(15);

    // Trigger animations parallelly
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [children]); // triggers on child component changes

  return (
    <Animated.View
      style={[
        styles.full,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
  },
});
