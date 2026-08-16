import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { db, Driver } from '../db/database';

export default function DriversScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const numColumns = isDesktop ? 2 : 1;
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Create Driver Form Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchDrivers = async (showIndicator = false) => {
    if (showIndicator) setLoading(true);
    try {
      const data = await db.getDrivers();
      setDrivers(data);
    } catch (e) {
      console.error('Error fetching drivers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers(true);
  }, []);

  const handleCreateDriver = async () => {
    if (!name.trim() || !id.trim() || !pin.trim() || !phone.trim() || !license.trim()) {
      Alert.alert('Missing Fields', 'Please complete all required fields.');
      return;
    }

    setCreating(true);
    try {
      const res = await db.createDriver({
        name: name.trim(),
        id: id.trim(),
        pin: pin.trim(),
        phone: phone.trim(),
        license: license.trim(),
        vehicleNumber: vehicleNumber.trim()
      });

      if (res.success) {
        Alert.alert('Success', 'New driver registered successfully.');
        // Reset form
        setName('');
        setId('');
        setPin('');
        setPhone('');
        setLicense('');
        setVehicleNumber('');
        setModalVisible(false);
        fetchDrivers(false);
      } else {
        Alert.alert('Error', res.error || 'Failed to register driver.');
      }
    } catch (e) {
      Alert.alert('Error', 'Connection to backend failed.');
    } finally {
      setCreating(false);
    }
  };

  const renderDriverItem = ({ item }: { item: Driver }) => (
    <View style={[styles.driverCard, isDesktop && { flex: 1, marginHorizontal: 4 }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.driverName}>{item.name}</Text>
          <Text style={styles.driverId}>Driver ID: <Text style={styles.idVal}>{item.id}</Text></Text>
        </View>
        <View style={[styles.statusTag, item.active ? styles.tagActive : styles.tagInactive]}>
          <Text style={[styles.tagText, item.active ? styles.tagTextActive : styles.tagTextInactive]}>
            {item.active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="phone" size={16} color={COLORS.textMuted} />
        <Text style={styles.infoText}>{item.phone}</Text>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="badge" size={16} color={COLORS.textMuted} />
        <Text style={styles.infoText}>DL: {item.license}</Text>
      </View>

      <View style={styles.infoRow}>
        <MaterialIcons name="local-shipping" size={16} color={COLORS.textMuted} />
        <Text style={styles.infoText}>Assigned Vehicle: {item.vehicleNumber || 'None'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <Text style={styles.barTitle}>Driver Registry</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={20} color="#ffffff" />
          <Text style={styles.addBtnText}>ADD DRIVER</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching registry list...</Text>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.centerBox}>
          <MaterialIcons name="person-off" size={64} color={COLORS.outline} />
          <Text style={styles.emptyTitle}>No drivers registered yet</Text>
          <Text style={styles.emptyDesc}>Click ADD DRIVER to add your first driver.</Text>
        </View>
      ) : (
        <FlatList
          key={numColumns}
          data={drivers}
          numColumns={numColumns}
          columnWrapperStyle={isDesktop ? { justifyContent: 'space-between', marginBottom: 8 } : undefined}
          keyExtractor={(item) => item.id}
          renderItem={renderDriverItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Register Driver Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Driver</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              
              {/* Driver Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DRIVER FULL NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Driver ID */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DRIVER ID (Used for Login)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 4421"
                  keyboardType="numeric"
                  value={id}
                  onChangeText={setId}
                />
              </View>

              {/* Security PIN */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>SECURITY PIN (4 digits)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 1234"
                  keyboardType="numeric"
                  secureTextEntry={true}
                  maxLength={4}
                  value={pin}
                  onChangeText={setPin}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              {/* License */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DRIVING LICENSE NUMBER</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. DL-TN30-20150912"
                  autoCapitalize="characters"
                  value={license}
                  onChangeText={setLicense}
                />
              </View>

              {/* Vehicle Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ASSIGNED VEHICLE NUMBER (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. TN 01 AB 1234"
                  autoCapitalize="characters"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                />
              </View>

              {/* Submit CTA */}
              <TouchableOpacity 
                style={[styles.submitBtn, creating && { opacity: 0.6 }]} 
                onPress={handleCreateDriver}
                disabled={creating}
              >
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>REGISTER DRIVER</Text>}
              </TouchableOpacity>

            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.gutter,
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  barTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: COLORS.textMuted,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  listContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  driverCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 10,
    marginBottom: 10,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  driverId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  idVal: {
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagActive: {
    backgroundColor: COLORS.success + '15',
  },
  tagInactive: {
    backgroundColor: COLORS.error + '15',
  },
  tagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagTextActive: {
    color: COLORS.success,
  },
  tagTextInactive: {
    color: COLORS.error,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalContent: {
    padding: SPACING.gutter,
    paddingBottom: 48,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 6,
    height: 48,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: COLORS.secondary,
    height: 56,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...SHADOWS.light,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
