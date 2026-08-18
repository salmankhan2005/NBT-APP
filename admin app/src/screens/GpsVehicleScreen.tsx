import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';
import {
  db,
  FleetVehicle,
  VehicleStatus,
  GpsStatus,
  GpsDeviceHistory,
} from '../db/database';

// ─── GPS Status Configuration ─────────────────────────────────────────────────

const GPS_STATUS_CONFIG: Record<GpsStatus, { color: string; bg: string; icon: string; label: string }> = {
  'Connected': { color: '#15803d', bg: '#dcfce7', icon: 'gps-fixed', label: 'CONNECTED' },
  'Offline': { color: '#b45309', bg: '#fef3c7', icon: 'gps-off', label: 'OFFLINE' },
  'Signal Lost': { color: '#dc2626', bg: '#fee2e2', icon: 'signal-wifi-off', label: 'SIGNAL LOST' },
  'Not Configured': { color: '#6b7280', bg: '#f3f4f6', icon: 'device-unknown', label: 'NOT CONFIGURED' },
  'Device Error': { color: '#7c3aed', bg: '#ede9fe', icon: 'error-outline', label: 'DEVICE ERROR' },
};

const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, { color: string; bg: string }> = {
  'Active': { color: '#15803d', bg: '#dcfce7' },
  'Inactive': { color: '#6b7280', bg: '#f3f4f6' },
  'Under Maintenance': { color: '#b45309', bg: '#fef3c7' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GpsStatusBadge({ status }: { status: GpsStatus }) {
  const cfg = GPS_STATUS_CONFIG[status] ?? GPS_STATUS_CONFIG['Not Configured'];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <MaterialIcons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const cfg = VEHICLE_STATUS_CONFIG[status] ?? VEHICLE_STATUS_CONFIG['Inactive'];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.monoText]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <MaterialIcons name={icon as any} size={18} color={COLORS.primary} />
        <Text style={styles.sectionCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'add' | 'edit' | 'detail' | 'replace_gps';

export default function GpsVehicleScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const numColumns = isDesktop ? 2 : 1;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);

  // Search & filter
  const [searchText, setSearchText] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'All' | VehicleStatus>('All');
  const [gpsStatusFilter, setGpsStatusFilter] = useState<'All' | GpsStatus>('All');

  // ── Add/Edit Form State ──────────────────────────────────────────────────
  const [fVehicleNumber, setFVehicleNumber] = useState('');
  const [fVehicleType, setFVehicleType] = useState<'6 Wheel' | '10 Wheel' | '12 Wheel' | '14 Wheel' | '16 Wheel'>('12 Wheel');
  const [fVehicleModel, setFVehicleModel] = useState('');
  const [fVehicleMake, setFVehicleMake] = useState('');
  const [fOwnerName, setFOwnerName] = useState('New Balaji Transport');
  const [fRegistrationDate, setFRegistrationDate] = useState('');
  const [fVehicleStatus, setFVehicleStatus] = useState<VehicleStatus>('Active');
  const [fGpsProvider, setFGpsProvider] = useState('');
  const [fGpsDeviceBrand, setFGpsDeviceBrand] = useState('');
  const [fGpsDeviceModel, setFGpsDeviceModel] = useState('');
  const [fGpsDeviceId, setFGpsDeviceId] = useState('');
  const [fImeiNumber, setFImeiNumber] = useState('');
  const [fSimNumber, setFSimNumber] = useState('');
  const [fExternalGpsDeviceId, setFExternalGpsDeviceId] = useState('');
  const [fGpsInstallationDate, setFGpsInstallationDate] = useState('');
  const [fGpsDeviceStatus, setFGpsDeviceStatus] = useState<GpsStatus>('Not Configured');
  const [fGpsApiConfigRef, setFGpsApiConfigRef] = useState('');
  const [fGpsNotes, setFGpsNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Replace GPS Form State ───────────────────────────────────────────────
  const [rGpsProvider, setRGpsProvider] = useState('');
  const [rGpsDeviceBrand, setRGpsDeviceBrand] = useState('');
  const [rGpsDeviceModel, setRGpsDeviceModel] = useState('');
  const [rGpsDeviceId, setRGpsDeviceId] = useState('');
  const [rImeiNumber, setRImeiNumber] = useState('');
  const [rSimNumber, setRSimNumber] = useState('');
  const [rExternalGpsDeviceId, setRExternalGpsDeviceId] = useState('');
  const [rGpsInstallationDate, setRGpsInstallationDate] = useState('');
  const [rGpsApiConfigRef, setRGpsApiConfigRef] = useState('');
  const [rReason, setRReason] = useState('');
  const [replacing, setReplacing] = useState(false);

  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getFleetVehicles();
      setVehicles(data);
    } catch (e) {
      console.error('Error fetching fleet vehicles:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  // ── Derived Stats ──────────────────────────────────────────────────────

  const stats = {
    total: vehicles.length,
    connected: vehicles.filter(v => v.gpsDeviceStatus === 'Connected').length,
    offline: vehicles.filter(v => v.gpsDeviceStatus === 'Offline').length,
    notConfigured: vehicles.filter(v => v.gpsDeviceStatus === 'Not Configured').length,
    signalLost: vehicles.filter(v => v.gpsDeviceStatus === 'Signal Lost').length,
    deviceError: vehicles.filter(v => v.gpsDeviceStatus === 'Device Error').length,
  };

  // ── Filtered Vehicle List ──────────────────────────────────────────────

  const filteredVehicles = vehicles.filter(v => {
    const q = searchText.toLowerCase();
    const matchSearch = !q ||
      v.vehicleNumber.toLowerCase().includes(q) ||
      v.gpsDeviceId.toLowerCase().includes(q) ||
      v.imeiNumber.toLowerCase().includes(q) ||
      v.gpsProvider.toLowerCase().includes(q) ||
      v.ownerName.toLowerCase().includes(q);

    const matchVehicleStatus = vehicleStatusFilter === 'All' || v.vehicleStatus === vehicleStatusFilter;
    const matchGpsStatus = gpsStatusFilter === 'All' || v.gpsDeviceStatus === gpsStatusFilter;

    return matchSearch && matchVehicleStatus && matchGpsStatus;
  });

  // ── Form Helpers ───────────────────────────────────────────────────────

  const populateEditForm = (v: FleetVehicle) => {
    setFVehicleNumber(v.vehicleNumber);
    setFVehicleType(v.vehicleType);
    setFVehicleModel(v.vehicleModel);
    setFVehicleMake(v.vehicleMake);
    setFOwnerName(v.ownerName);
    setFRegistrationDate(v.registrationDate);
    setFVehicleStatus(v.vehicleStatus);
    setFGpsProvider(v.gpsProvider);
    setFGpsDeviceBrand(v.gpsDeviceBrand);
    setFGpsDeviceModel(v.gpsDeviceModel);
    setFGpsDeviceId(v.gpsDeviceId);
    setFImeiNumber(v.imeiNumber);
    setFSimNumber(v.simNumber || '');
    setFExternalGpsDeviceId(v.externalGpsDeviceId || '');
    setFGpsInstallationDate(v.gpsInstallationDate);
    setFGpsDeviceStatus(v.gpsDeviceStatus);
    setFGpsApiConfigRef(v.gpsApiConfigRef || '');
    setFGpsNotes(v.gpsNotes || '');
  };

  const clearForm = () => {
    setFVehicleNumber(''); setFVehicleType('12 Wheel'); setFVehicleModel('');
    setFVehicleMake(''); setFOwnerName('New Balaji Transport'); setFRegistrationDate('');
    setFVehicleStatus('Active'); setFGpsProvider(''); setFGpsDeviceBrand('');
    setFGpsDeviceModel(''); setFGpsDeviceId(''); setFImeiNumber(''); setFSimNumber('');
    setFExternalGpsDeviceId(''); setFGpsInstallationDate(''); setFGpsDeviceStatus('Not Configured');
    setFGpsApiConfigRef(''); setFGpsNotes('');
  };

  const clearReplaceForm = () => {
    setRGpsProvider(''); setRGpsDeviceBrand(''); setRGpsDeviceModel('');
    setRGpsDeviceId(''); setRImeiNumber(''); setRSimNumber('');
    setRExternalGpsDeviceId(''); setRGpsInstallationDate(''); setRGpsApiConfigRef('');
    setRReason('');
  };

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleOpenAdd = () => {
    clearForm();
    setViewMode('add');
  };

  const handleOpenEdit = (v: FleetVehicle) => {
    setSelectedVehicle(v);
    populateEditForm(v);
    setViewMode('edit');
  };

  const handleOpenDetail = (v: FleetVehicle) => {
    setSelectedVehicle(v);
    setHistoryExpanded(false);
    setViewMode('detail');
  };

  const handleSaveVehicle = async () => {
    if (!fVehicleNumber.trim() || !fVehicleType || !fOwnerName.trim()) {
      Alert.alert('Missing Fields', 'Vehicle Number, Type, and Owner Name are required.');
      return;
    }

    setSaving(true);
    try {
      let res: { success: boolean; error?: string };

      if (viewMode === 'add') {
        res = await db.createFleetVehicle({
          vehicleNumber: fVehicleNumber.trim().toUpperCase(),
          vehicleType: fVehicleType,
          vehicleModel: fVehicleModel.trim(),
          vehicleMake: fVehicleMake.trim(),
          ownerName: fOwnerName.trim(),
          registrationDate: fRegistrationDate.trim(),
          vehicleStatus: fVehicleStatus,
          gpsProvider: fGpsProvider.trim(),
          gpsDeviceBrand: fGpsDeviceBrand.trim(),
          gpsDeviceModel: fGpsDeviceModel.trim(),
          gpsDeviceId: fGpsDeviceId.trim(),
          imeiNumber: fImeiNumber.trim(),
          simNumber: fSimNumber.trim() || undefined,
          externalGpsDeviceId: fExternalGpsDeviceId.trim() || undefined,
          gpsInstallationDate: fGpsInstallationDate.trim(),
          gpsDeviceStatus: fGpsDeviceStatus,
          gpsApiConfigRef: fGpsApiConfigRef.trim() || undefined,
          gpsNotes: fGpsNotes.trim() || undefined,
        });
      } else {
        // Edit mode
        res = await db.updateFleetVehicle(selectedVehicle!.id, {
          vehicleType: fVehicleType,
          vehicleModel: fVehicleModel.trim(),
          vehicleMake: fVehicleMake.trim(),
          ownerName: fOwnerName.trim(),
          registrationDate: fRegistrationDate.trim(),
          vehicleStatus: fVehicleStatus,
          gpsProvider: fGpsProvider.trim(),
          gpsDeviceBrand: fGpsDeviceBrand.trim(),
          gpsDeviceModel: fGpsDeviceModel.trim(),
          gpsDeviceId: fGpsDeviceId.trim(),
          imeiNumber: fImeiNumber.trim(),
          simNumber: fSimNumber.trim() || undefined,
          externalGpsDeviceId: fExternalGpsDeviceId.trim() || undefined,
          gpsInstallationDate: fGpsInstallationDate.trim(),
          gpsDeviceStatus: fGpsDeviceStatus,
          gpsApiConfigRef: fGpsApiConfigRef.trim() || undefined,
          gpsNotes: fGpsNotes.trim() || undefined,
        });
      }

      if (res.success) {
        Alert.alert('Success', viewMode === 'add' ? 'Vehicle registered successfully.' : 'Vehicle updated successfully.');
        await fetchVehicles();
        setViewMode('list');
      } else {
        Alert.alert('⚠️ Conflict Detected', res.error || 'Failed to save vehicle.');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectGps = () => {
    Alert.alert(
      'Disconnect GPS Device',
      `Are you sure you want to disconnect the GPS device from ${selectedVehicle?.vehicleNumber}? The vehicle will show as "Not Configured".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            if (!selectedVehicle) return;
            const res = await db.disconnectGpsDevice(selectedVehicle.id);
            if (res.success) {
              await fetchVehicles();
              // Refresh selected vehicle
              const updated = await db.getFleetVehicleByNumber(selectedVehicle.vehicleNumber);
              setSelectedVehicle(updated);
              Alert.alert('Done', 'GPS device disconnected.');
            }
          }
        }
      ]
    );
  };

  const handleReplaceGps = async () => {
    if (!rGpsDeviceId.trim() || !rImeiNumber.trim() || !rReason.trim()) {
      Alert.alert('Missing Fields', 'GPS Device ID, IMEI Number, and Replacement Reason are required.');
      return;
    }
    setReplacing(true);
    try {
      const res = await db.replaceGpsDevice(
        selectedVehicle!.id,
        {
          gpsProvider: rGpsProvider.trim(),
          gpsDeviceBrand: rGpsDeviceBrand.trim(),
          gpsDeviceModel: rGpsDeviceModel.trim(),
          gpsDeviceId: rGpsDeviceId.trim(),
          imeiNumber: rImeiNumber.trim(),
          simNumber: rSimNumber.trim() || undefined,
          externalGpsDeviceId: rExternalGpsDeviceId.trim() || undefined,
          gpsInstallationDate: rGpsInstallationDate.trim(),
          gpsApiConfigRef: rGpsApiConfigRef.trim() || undefined,
        },
        rReason.trim()
      );
      if (res.success) {
        Alert.alert('Success', 'GPS device replaced and history archived successfully.');
        await fetchVehicles();
        const updated = await db.getFleetVehicleByNumber(selectedVehicle!.vehicleNumber);
        setSelectedVehicle(updated);
        clearReplaceForm();
        setViewMode('detail');
      } else {
        Alert.alert('⚠️ Conflict Detected', res.error || 'Failed to replace GPS device.');
      }
    } catch (e) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setReplacing(false);
    }
  };

  // ─── View: Fleet List ──────────────────────────────────────────────────

  const renderVehicleCard = ({ item }: { item: FleetVehicle }) => {
    const gpsCfg = GPS_STATUS_CONFIG[item.gpsDeviceStatus] ?? GPS_STATUS_CONFIG['Not Configured'];
    const hasGps = item.gpsDeviceId !== '';

    return (
      <TouchableOpacity style={styles.vehicleCard} onPress={() => handleOpenDetail(item)} activeOpacity={0.85}>
        {/* Card Top Row */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.cardVehicleNumber}>{item.vehicleNumber}</Text>
            <Text style={styles.cardVehicleType}>{item.vehicleType} · {item.vehicleMake} {item.vehicleModel}</Text>
          </View>
          <VehicleStatusBadge status={item.vehicleStatus} />
        </View>

        {/* Separator */}
        <View style={styles.cardDivider} />

        {/* GPS Info Row */}
        <View style={styles.cardGpsRow}>
          <View style={[styles.gpsStatusStripe, { backgroundColor: gpsCfg.bg }]}>
            <MaterialIcons name={gpsCfg.icon as any} size={14} color={gpsCfg.color} />
            <Text style={[styles.gpsStatusText, { color: gpsCfg.color }]}>{gpsCfg.label}</Text>
          </View>
          <Text style={styles.cardOwnerText} numberOfLines={1}>{item.ownerName}</Text>
        </View>

        {/* GPS Details Row */}
        <View style={styles.cardInfoGrid}>
          <View style={styles.cardInfoItem}>
            <Text style={styles.cardInfoLabel}>GPS Device ID</Text>
            <Text style={styles.cardInfoValue} numberOfLines={1}>
              {hasGps ? item.gpsDeviceId : '—'}
            </Text>
          </View>
          <View style={styles.cardInfoItem}>
            <Text style={styles.cardInfoLabel}>Provider</Text>
            <Text style={styles.cardInfoValue} numberOfLines={1}>
              {item.gpsProvider || '—'}
            </Text>
          </View>
          <View style={styles.cardInfoItem}>
            <Text style={styles.cardInfoLabel}>Last Update</Text>
            <Text style={styles.cardInfoValue} numberOfLines={1}>
              {item.lastKnownCity
                ? `${item.lastKnownCity}`
                : item.lastGpsUpdate
                  ? new Date(item.lastGpsUpdate).toLocaleDateString()
                  : '—'}
            </Text>
          </View>
          <View style={styles.cardInfoItem}>
            <Text style={styles.cardInfoLabel}>IMEI</Text>
            <Text style={styles.cardInfoValue} numberOfLines={1}>
              {hasGps ? `${item.imeiNumber.slice(0, 6)}...${item.imeiNumber.slice(-4)}` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.cardChevron}>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.outline} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderListView = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenHeaderTitle}>GPS & Vehicle Mgmt</Text>
          <Text style={styles.screenHeaderSub}>{vehicles.length} vehicles registered</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
          <MaterialIcons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>ADD VEHICLE</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll} contentContainerStyle={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.summaryValue}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total Vehicles</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#15803d' }]}>
          <Text style={[styles.summaryValue, { color: '#15803d' }]}>{stats.connected}</Text>
          <Text style={styles.summaryLabel}>GPS Connected</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#b45309' }]}>
          <Text style={[styles.summaryValue, { color: '#b45309' }]}>{stats.offline}</Text>
          <Text style={styles.summaryLabel}>GPS Offline</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#6b7280' }]}>
          <Text style={[styles.summaryValue, { color: '#6b7280' }]}>{stats.notConfigured}</Text>
          <Text style={styles.summaryLabel}>Not Configured</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#dc2626' }]}>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{stats.signalLost}</Text>
          <Text style={styles.summaryLabel}>Signal Lost</Text>
        </View>
      </ScrollView>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={COLORS.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicle, GPS ID, IMEI, provider..."
            placeholderTextColor={COLORS.outline}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="close" size={18} color={COLORS.outline} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Vehicle Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
        {(['All', 'Active', 'Inactive', 'Under Maintenance'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, vehicleStatusFilter === s && styles.filterChipActive]}
            onPress={() => setVehicleStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, vehicleStatusFilter === s && styles.filterChipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterSeparator} />
        {(['All', 'Connected', 'Offline', 'Not Configured'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, gpsStatusFilter === s && styles.filterChipActive, gpsStatusFilter === s && { backgroundColor: GPS_STATUS_CONFIG[s as GpsStatus]?.bg || COLORS.secondary }]}
            onPress={() => setGpsStatusFilter(s)}
          >
            <Text style={[styles.filterChipText, gpsStatusFilter === s && { color: GPS_STATUS_CONFIG[s as GpsStatus]?.color || '#fff', fontWeight: 'bold' }]}>
              {s === 'All' ? 'All GPS' : s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading fleet vehicles...</Text>
        </View>
      ) : filteredVehicles.length === 0 ? (
        <View style={styles.centerBox}>
          <MaterialIcons name="satellite-alt" size={60} color={COLORS.outline} />
          <Text style={styles.emptyTitle}>{vehicles.length === 0 ? 'No vehicles registered' : 'No results found'}</Text>
          <Text style={styles.emptyDesc}>
            {vehicles.length === 0 ? 'Tap ADD VEHICLE to register your first vehicle with GPS.' : 'Try adjusting your search or filters.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          keyExtractor={item => item.id}
          renderItem={renderVehicleCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // ─── View: Add / Edit Form ─────────────────────────────────────────────

  const renderFormView = () => (
    <View style={styles.container}>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('list')}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>{viewMode === 'add' ? 'Add New Vehicle' : `Edit — ${selectedVehicle?.vehicleNumber}`}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Section A: Vehicle Details */}
        <View style={styles.formSectionLabel}>
          <MaterialIcons name="local-shipping" size={16} color={COLORS.primary} />
          <Text style={styles.formSectionLabelText}>VEHICLE DETAILS</Text>
        </View>

        <View style={styles.formCard}>
          {/* Vehicle Number (disabled in edit) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>VEHICLE NUMBER <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.formInput, viewMode === 'edit' && styles.formInputDisabled]}
              placeholder="e.g. TN 01 AB 1234"
              autoCapitalize="characters"
              value={fVehicleNumber}
              onChangeText={viewMode === 'add' ? setFVehicleNumber : undefined}
              editable={viewMode === 'add'}
            />
          </View>

          {/* Vehicle Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>VEHICLE TYPE <Text style={styles.required}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(['6 Wheel', '10 Wheel', '12 Wheel', '16 Wheel'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.chip, fVehicleType === t && styles.chipActive]} onPress={() => setFVehicleType(t)}>
                  <Text style={[styles.chipText, fVehicleType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Model & Make */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>VEHICLE MODEL</Text>
              <TextInput style={styles.formInput} placeholder="e.g. LPT 3118" value={fVehicleModel} onChangeText={setFVehicleModel} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>MAKE / BRAND</Text>
              <TextInput style={styles.formInput} placeholder="e.g. TATA Motors" value={fVehicleMake} onChangeText={setFVehicleMake} />
            </View>
          </View>

          {/* Owner */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>OWNER / COMPANY <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.formInput} placeholder="e.g. New Balaji Transport" value={fOwnerName} onChangeText={setFOwnerName} />
          </View>

          {/* Registration Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>REGISTRATION DATE</Text>
            <TextInput style={styles.formInput} placeholder="e.g. 2020-06-15" value={fRegistrationDate} onChangeText={setFRegistrationDate} />
          </View>

          {/* Vehicle Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>VEHICLE STATUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(['Active', 'Inactive', 'Under Maintenance'] as const).map(s => (
                <TouchableOpacity key={s} style={[styles.chip, fVehicleStatus === s && styles.chipActive]} onPress={() => setFVehicleStatus(s)}>
                  <Text style={[styles.chipText, fVehicleStatus === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Section B: GPS Device Details */}
        <View style={[styles.formSectionLabel, { marginTop: 20 }]}>
          <MaterialIcons name="gps-fixed" size={16} color={COLORS.primary} />
          <Text style={styles.formSectionLabelText}>GPS DEVICE DETAILS</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>GPS PROVIDER NAME</Text>
            <TextInput style={styles.formInput} placeholder="e.g. TrackSo, Uffizio, iStartek" value={fGpsProvider} onChangeText={setFGpsProvider} />
          </View>

          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>GPS DEVICE BRAND</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Concox" value={fGpsDeviceBrand} onChangeText={setFGpsDeviceBrand} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>GPS DEVICE MODEL</Text>
              <TextInput style={styles.formInput} placeholder="e.g. GT06N" value={fGpsDeviceModel} onChangeText={setFGpsDeviceModel} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GPS DEVICE ID</Text>
            <TextInput style={styles.formInput} placeholder="e.g. GPS-TN01-001" value={fGpsDeviceId} onChangeText={setFGpsDeviceId} autoCapitalize="characters" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>IMEI NUMBER</Text>
            <TextInput style={styles.formInput} placeholder="15-digit IMEI" keyboardType="numeric" value={fImeiNumber} onChangeText={setFImeiNumber} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SIM NUMBER <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={styles.formInput} placeholder="SIM card number" keyboardType="phone-pad" value={fSimNumber} onChangeText={setFSimNumber} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GPS API DEVICE ID / EXTERNAL DEVICE ID</Text>
            <TextInput style={styles.formInput} placeholder="e.g. TRSO-DEV-10021" value={fExternalGpsDeviceId} onChangeText={setFExternalGpsDeviceId} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GPS INSTALLATION DATE</Text>
            <TextInput style={styles.formInput} placeholder="e.g. 2024-03-10" value={fGpsInstallationDate} onChangeText={setFGpsInstallationDate} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GPS DEVICE STATUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(['Connected', 'Offline', 'Signal Lost', 'Not Configured', 'Device Error'] as const).map(s => {
                const cfg = GPS_STATUS_CONFIG[s];
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, fGpsDeviceStatus === s && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                    onPress={() => setFGpsDeviceStatus(s)}
                  >
                    <Text style={[styles.chipText, fGpsDeviceStatus === s && { color: cfg.color }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GPS PROVIDER API CONFIG REFERENCE <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput style={styles.formInput} placeholder="e.g. TRSO-API-CFG-001" value={fGpsApiConfigRef} onChangeText={setFGpsApiConfigRef} />
            <Text style={styles.helperText}>Store only the reference key, not API secrets or passwords.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADDITIONAL NOTES <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              placeholder="Any notes about this vehicle or GPS device..."
              multiline
              numberOfLines={3}
              value={fGpsNotes}
              onChangeText={setFGpsNotes}
            />
          </View>

          <TouchableOpacity style={[styles.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSaveVehicle} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><MaterialIcons name="save" size={18} color="#fff" /><Text style={styles.submitBtnText}>{viewMode === 'add' ? 'REGISTER VEHICLE' : 'SAVE CHANGES'}</Text></>
            }
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  // ─── View: Vehicle GPS Detail ──────────────────────────────────────────

  const renderDetailView = () => {
    if (!selectedVehicle) return null;
    const v = selectedVehicle;
    const gpsCfg = GPS_STATUS_CONFIG[v.gpsDeviceStatus] ?? GPS_STATUS_CONFIG['Not Configured'];
    const hasGps = v.gpsDeviceId !== '';
    const hasLocation = v.lastKnownLatitude !== undefined;

    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('list')}>
            <MaterialIcons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle} numberOfLines={1}>{v.vehicleNumber}</Text>
          <TouchableOpacity style={styles.editHeaderBtn} onPress={() => handleOpenEdit(v)}>
            <MaterialIcons name="edit" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>

          {/* GPS Status Banner */}
          <View style={[styles.gpsStatusBanner, { backgroundColor: gpsCfg.bg, borderColor: gpsCfg.color }]}>
            <MaterialIcons name={gpsCfg.icon as any} size={22} color={gpsCfg.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.gpsStatusBannerTitle, { color: gpsCfg.color }]}>GPS {gpsCfg.label}</Text>
              {v.lastGpsUpdate && (
                <Text style={[styles.gpsStatusBannerSub, { color: gpsCfg.color }]}>
                  Last update: {new Date(v.lastGpsUpdate).toLocaleString()}
                </Text>
              )}
              {!hasGps && (
                <Text style={[styles.gpsStatusBannerSub, { color: gpsCfg.color }]}>No GPS device assigned to this vehicle.</Text>
              )}
            </View>
          </View>

          {/* Vehicle Info */}
          <SectionCard title="Vehicle Information" icon="local-shipping">
            <InfoRow label="Vehicle Number" value={v.vehicleNumber} />
            <View style={styles.infoRowBadge}>
              <Text style={styles.infoLabel}>Vehicle Status</Text>
              <VehicleStatusBadge status={v.vehicleStatus} />
            </View>
            <InfoRow label="Type" value={`${v.vehicleType}`} />
            <InfoRow label="Make & Model" value={`${v.vehicleMake} ${v.vehicleModel}`.trim() || '—'} />
            <InfoRow label="Owner / Company" value={v.ownerName} />
            <InfoRow label="Registration Date" value={v.registrationDate} />
          </SectionCard>

          {/* GPS Device Info */}
          <SectionCard title="GPS Device Information" icon="gps-fixed">
            <InfoRow label="GPS Provider" value={v.gpsProvider || '—'} />
            <InfoRow label="Device Brand" value={v.gpsDeviceBrand || '—'} />
            <InfoRow label="Device Model" value={v.gpsDeviceModel || '—'} />
            <InfoRow label="GPS Device ID" value={v.gpsDeviceId || '—'} mono />
            <InfoRow label="IMEI Number" value={v.imeiNumber || '—'} mono />
            <InfoRow label="SIM Number" value={v.simNumber || '—'} mono />
            <InfoRow label="External GPS API ID" value={v.externalGpsDeviceId || '—'} mono />
            <InfoRow label="Installation Date" value={v.gpsInstallationDate || '—'} />
            <InfoRow label="API Config Reference" value={v.gpsApiConfigRef || '—'} />
            {v.gpsNotes && <InfoRow label="Notes" value={v.gpsNotes} />}
          </SectionCard>

          {/* Live Location (only if GPS connected and location available) */}
          {hasGps && (
            <SectionCard title="GPS Location" icon="my-location">
              {hasLocation ? (
                <>
                  <InfoRow label="Last Known City" value={v.lastKnownCity} />
                  <InfoRow label="Address" value={v.lastKnownAddress} />
                  <InfoRow label="Latitude" value={String(v.lastKnownLatitude)} mono />
                  <InfoRow label="Longitude" value={String(v.lastKnownLongitude)} mono />
                  <InfoRow
                    label="Last Updated"
                    value={v.lastGpsUpdate ? new Date(v.lastGpsUpdate).toLocaleString() : '—'}
                  />
                  {v.gpsDeviceStatus !== 'Connected' && (
                    <View style={styles.staleNotice}>
                      <MaterialIcons name="info-outline" size={14} color="#b45309" />
                      <Text style={styles.staleNoticeText}>GPS is offline. Showing last known location only.</Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.noLocationText}>No location data available for this vehicle.</Text>
              )}
            </SectionCard>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(v)}>
              <MaterialIcons name="edit" size={18} color={COLORS.primary} />
              <Text style={styles.actionBtnText}>Edit GPS Details</Text>
            </TouchableOpacity>

            {hasGps && (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={() => {
                  clearReplaceForm();
                  setViewMode('replace_gps');
                }}>
                  <MaterialIcons name="swap-horiz" size={18} color={COLORS.primary} />
                  <Text style={styles.actionBtnText}>Change GPS Device</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDisconnectGps}>
                  <MaterialIcons name="gps-off" size={18} color="#dc2626" />
                  <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Disconnect GPS</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* GPS History */}
          {v.gpsHistory.length > 0 && (
            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.sectionCardHeader} onPress={() => setHistoryExpanded(!historyExpanded)}>
                <MaterialIcons name="history" size={18} color={COLORS.primary} />
                <Text style={styles.sectionCardTitle}>GPS Device History ({v.gpsHistory.length})</Text>
                <MaterialIcons name={historyExpanded ? 'expand-less' : 'expand-more'} size={22} color={COLORS.outline} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              {historyExpanded && v.gpsHistory.map((h, i) => (
                <View key={h.id} style={[styles.historyEntry, i > 0 && styles.historyEntryBorder]}>
                  <Text style={styles.historyDate}>Replaced on {h.replacedOn} by {h.replacedBy}</Text>
                  <Text style={styles.historyReason}>{h.reason}</Text>
                  <View style={styles.historyDeviceRow}>
                    <View style={styles.historyDevice}>
                      <Text style={styles.historyDeviceLabel}>OLD DEVICE</Text>
                      <Text style={styles.historyDeviceValue}>{h.oldProvider} / {h.oldBrand}</Text>
                      <Text style={styles.historyDeviceMono}>{h.oldDeviceId}</Text>
                      <Text style={styles.historyDeviceMono}>IMEI: {h.oldImei}</Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={18} color={COLORS.outline} />
                    <View style={styles.historyDevice}>
                      <Text style={styles.historyDeviceLabel}>NEW DEVICE</Text>
                      <Text style={styles.historyDeviceValue}>{h.newDeviceId}</Text>
                      <Text style={styles.historyDeviceMono}>IMEI: {h.newImei}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  // ─── View: Replace GPS Device ──────────────────────────────────────────

  const renderReplaceGpsView = () => {
    if (!selectedVehicle) return null;
    const v = selectedVehicle;

    return (
      <View style={styles.container}>
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('detail')}>
            <MaterialIcons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Change GPS Device</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Current device reference */}
          <View style={styles.currentDeviceBanner}>
            <MaterialIcons name="info-outline" size={16} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.currentDeviceBannerTitle}>Current GPS Device — {v.vehicleNumber}</Text>
              <Text style={styles.currentDeviceBannerSub}>
                {v.gpsDeviceId ? `${v.gpsProvider} · ${v.gpsDeviceId} · IMEI: ${v.imeiNumber}` : 'No GPS currently configured.'}
              </Text>
              <Text style={styles.currentDeviceBannerSub}>The old device record will be archived in GPS history.</Text>
            </View>
          </View>

          <View style={styles.formSectionLabel}>
            <MaterialIcons name="swap-horiz" size={16} color={COLORS.primary} />
            <Text style={styles.formSectionLabelText}>NEW GPS DEVICE DETAILS</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GPS PROVIDER NAME</Text>
              <TextInput style={styles.formInput} placeholder="e.g. TrackSo" value={rGpsProvider} onChangeText={setRGpsProvider} />
            </View>
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>DEVICE BRAND</Text>
                <TextInput style={styles.formInput} placeholder="e.g. Concox" value={rGpsDeviceBrand} onChangeText={setRGpsDeviceBrand} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>DEVICE MODEL</Text>
                <TextInput style={styles.formInput} placeholder="e.g. GT06N" value={rGpsDeviceModel} onChangeText={setRGpsDeviceModel} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GPS DEVICE ID <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.formInput} placeholder="e.g. GPS-TN01-002" value={rGpsDeviceId} onChangeText={setRGpsDeviceId} autoCapitalize="characters" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>IMEI NUMBER <Text style={styles.required}>*</Text></Text>
              <TextInput style={styles.formInput} placeholder="15-digit IMEI" keyboardType="numeric" value={rImeiNumber} onChangeText={setRImeiNumber} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SIM NUMBER <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput style={styles.formInput} placeholder="SIM card number" keyboardType="phone-pad" value={rSimNumber} onChangeText={setRSimNumber} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EXTERNAL GPS API DEVICE ID</Text>
              <TextInput style={styles.formInput} placeholder="e.g. TRSO-DEV-10099" value={rExternalGpsDeviceId} onChangeText={setRExternalGpsDeviceId} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>INSTALLATION DATE</Text>
              <TextInput style={styles.formInput} placeholder="e.g. 2026-07-29" value={rGpsInstallationDate} onChangeText={setRGpsInstallationDate} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>API CONFIG REFERENCE</Text>
              <TextInput style={styles.formInput} placeholder="e.g. TRSO-API-CFG-003" value={rGpsApiConfigRef} onChangeText={setRGpsApiConfigRef} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>REPLACEMENT REASON <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="e.g. Old device battery failed. Replaced with new unit."
                multiline
                numberOfLines={3}
                value={rReason}
                onChangeText={setRReason}
              />
            </View>

            <TouchableOpacity style={[styles.submitBtn, replacing && { opacity: 0.6 }]} onPress={handleReplaceGps} disabled={replacing}>
              {replacing
                ? <ActivityIndicator color="#fff" size="small" />
                : <><MaterialIcons name="swap-horiz" size={18} color="#fff" /><Text style={styles.submitBtnText}>CONFIRM GPS REPLACEMENT</Text></>
              }
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  // ─── Root Render ───────────────────────────────────────────────────────

  if (viewMode === 'add' || viewMode === 'edit') return renderFormView();
  if (viewMode === 'detail') return renderDetailView();
  if (viewMode === 'replace_gps') return renderReplaceGpsView();
  return renderListView();
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ────────────────────────────────────────────────────────────
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 12,
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  screenHeaderSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
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
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    height: 52,
    paddingHorizontal: 12,
  },
  subHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editHeaderBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Summary ───────────────────────────────────────────────────────────
  summaryScroll: {
    maxHeight: 80,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  summaryRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 90,
    ...SHADOWS.light,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // ── Search & Filters ──────────────────────────────────────────────────
  searchRow: {
    backgroundColor: '#ffffff',
    paddingHorizontal: SPACING.gutter,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  filterScroll: {
    maxHeight: 46,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
  },
  filterSeparator: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.outlineVariant,
    marginHorizontal: 4,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  // ── Vehicle Card ──────────────────────────────────────────────────────
  listContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  cardTopLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardVehicleNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  cardVehicleType: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.outlineVariant,
    marginHorizontal: 14,
  },
  cardGpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  gpsStatusStripe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gpsStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardOwnerText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: 'bold',
    maxWidth: '50%',
  },
  cardInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  cardInfoItem: {
    width: '46%',
  },
  cardInfoLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardInfoValue: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '600',
    marginTop: 1,
  },
  cardChevron: {
    position: 'absolute',
    right: 14,
    bottom: 14,
  },

  // ── Badges ────────────────────────────────────────────────────────────
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // ── Empty/Loading ──────────────────────────────────────────────────────
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
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  // ── Form ──────────────────────────────────────────────────────────────
  formContent: {
    padding: SPACING.gutter,
    paddingBottom: 48,
  },
  formSectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  formSectionLabelText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    ...SHADOWS.light,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  required: {
    color: '#dc2626',
  },
  optional: {
    color: COLORS.outline,
    fontWeight: 'normal',
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 6,
    height: 44,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  formInputDisabled: {
    backgroundColor: COLORS.surfaceContainerHigh,
    color: COLORS.outline,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 10,
    color: COLORS.outline,
    marginTop: 4,
    fontStyle: 'italic',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    height: 52,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
    ...SHADOWS.light,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // ── Detail View ────────────────────────────────────────────────────────
  detailContent: {
    padding: SPACING.gutter,
    paddingBottom: 48,
  },
  gpsStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  gpsStatusBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gpsStatusBannerSub: {
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
  },
  infoRowBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  staleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#fef3c7',
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 6,
  },
  staleNoticeText: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '600',
    flex: 1,
  },
  noLocationText: {
    fontSize: 12,
    color: COLORS.textMuted,
    padding: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ── Action Buttons ─────────────────────────────────────────────────────
  actionButtons: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginBottom: 14,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  actionBtnDanger: {
    borderBottomWidth: 0,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ── GPS History ────────────────────────────────────────────────────────
  historyEntry: {
    padding: 14,
  },
  historyEntryBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  historyReason: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  historyDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyDevice: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 6,
    padding: 8,
  },
  historyDeviceLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  historyDeviceValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  historyDeviceMono: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },

  // ── Replace GPS View ──────────────────────────────────────────────────
  currentDeviceBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  currentDeviceBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  currentDeviceBannerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});
