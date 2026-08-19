import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DeleteConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  itemLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export default function DeleteConfirmModal({
  visible,
  title = 'Confirm Delete',
  message,
  itemLabel,
  isDeleting = false,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
}: DeleteConfirmModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      slideAnim.setValue(60);
      fadeAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isDeleting ? undefined : onCancel}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialIcons name="delete-forever" size={40} color="#dc2626" />
          </Animated.View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {itemLabel ? (
            <View style={styles.itemBadge}>
              <MaterialIcons name="info-outline" size={14} color="#7c3aed" />
              <Text style={styles.itemLabel} numberOfLines={2}>{itemLabel}</Text>
            </View>
          ) : null}
          {isDeleting ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#dc2626" />
              <Text style={styles.loadingText}>Deleting, please wait...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                <MaterialIcons name="close" size={16} color="#64748b" />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={onConfirm} activeOpacity={0.8}>
                <MaterialIcons name="delete" size={16} color="#fff" />
                <Text style={styles.deleteText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  itemLabel: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    width: '100%',
  },
  loadingText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#dc2626',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
