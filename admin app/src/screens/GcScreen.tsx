import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING, SHADOWS } from '../theme';
import nbtAuthorisedSignatureBase64 from '../nbtSignatureBase64';
import nbtLogoBase64 from '../nbtLogoBase64';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { db, GcNote, GcItem } from '../db/database';

export default function GcScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const [activeTab, setActiveTab] = useState<'CREATE' | 'ARCHIVE'>('CREATE');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<GcNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGcId, setEditingGcId] = useState<string | null>(null);

  // Create GC Form Fields
  const [noteNumber, setNoteNumber] = useState('');
  const [gcDate, setGcDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [truckNumber, setTruckNumber] = useState('');
  const [consignor, setConsignor] = useState('');
  const [consignee, setConsignee] = useState('');
  const [consignorGst, setConsignorGst] = useState('');
  const [consigneeGst, setConsigneeGst] = useState('');
  const [gstinNumber, setGstinNumber] = useState('33AMTPR8487P2ZM');
  const [panNumber, setPanNumber] = useState('AMTPR8487P');
  const [paymentType, setPaymentType] = useState<'TBB' | 'TO_PAY' | 'PAID' | ''>('');
  const [bankAccountName, setBankAccountName] = useState('New Balaji Transports');
  const [bankAccountNumber, setBankAccountNumber] = useState('1187115000014102');
  const [bankIfsc, setBankIfsc] = useState('KVBL0001187');
  const [bankName, setBankName] = useState('Karur Vysya Bank');
  const [bankBranch, setBankBranch] = useState('Salem - 636 002');
  const [addressLine1, setAddressLine1] = useState('3/131, V.K.V. Complex, 1st Floor,');
  const [addressLine2, setAddressLine2] = useState('Bangalore Bye Pass Road, Kandampatty (Po.), Salem - 636 005 (TN)');
  const [phone1, setPhone1] = useState('94433 51789');
  const [phone2, setPhone2] = useState('93622 51789');
  const [phone3, setPhone3] = useState('97892 71721');
  const [email, setEmail] = useState('newbalajitransports1@gmail.com');
  const [website, setWebsite] = useState('www.newbalajitransport.com');
  const [valueRs, setValueRs] = useState('');
  const [items, setItems] = useState<Array<{ articlesCount: string; description: string; weight: string; value: string }>>(
    Array.from({ length: 6 }, () => ({ articlesCount: '', description: '', weight: '', value: '' }))
  );

  const updateItemField = (
    index: number,
    field: 'articlesCount' | 'description' | 'weight' | 'value',
    value: string
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Finance details
  const [freight, setFreight] = useState('');
  const [lessAdvance, setLessAdvance] = useState('0');
  const [taxOption, setTaxOption] = useState<'CGST_SGST' | 'IGST' | 'NONE'>('NONE');
  const [cgstPercent, setCgstPercent] = useState(0);
  const [sgstPercent, setSgstPercent] = useState(0);
  const [igstPercent, setIgstPercent] = useState(0);

  // Other details
  const [payableAt, setPayableAt] = useState('');
  const [taxPayee, setTaxPayee] = useState<'Transport' | 'Consignor' | 'Consignee' | ''>('Consignor');
  const [driverName, setDriverName] = useState('');
  const [deliveryAt, setDeliveryAt] = useState('Door Delivery');
  const [driverSignature, setDriverSignature] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [lorryOwner, setLorryOwner] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [terms, setTerms] = useState('');

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingGcId, setDeletingGcId] = useState<{ id: string; label?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'danger' | 'success' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm?: () => void,
    type: 'danger' | 'success' | 'info' = 'danger',
    confirmText = 'OK',
    cancelText?: string
  ) => {
    setConfirmModal({
      visible: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm,
    });
  };

  // Selected Archive Month — default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const now = new Date();
    return `${MONTHS[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
  });

  // Load Archive notes
  const fetchGcNotes = async () => {
    setLoading(true);
    try {
      const data = await db.getGcNotes();
      setNotes(data);
    } catch (e) {
      console.error('Error fetching GC notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGcNotes();
    const unsubscribe = db.subscribe(() => {
      fetchGcNotes();
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!editingGcId) {
      setNoteNumber(getPreviewGcNoteNumber(gcDate));
    }
  }, [gcDate, notes, editingGcId]);

  useEffect(() => {
    if (activeTab === 'ARCHIVE') {
      fetchGcNotes();
    }
  }, [activeTab]);

  // Auto-select most recent month when notes load
  useEffect(() => {
    if (notes.length > 0) {
      const months = getMonthsFromNotes(notes);
      if (months.length > 0 && !months.includes(selectedMonth)) {
        setSelectedMonth(months[0]);
      }
    }
  }, [notes]);

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const parseIsoDate = (dateString: string) => {
    if (!dateString) return null;
    let year = 0, month = 0, day = 1;

    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts[0].length === 4) {
        year = Number(parts[0]);
        month = Number(parts[1]);
        day = Number(parts[2]);
      } else {
        year = Number(parts[2]);
        month = Number(parts[1]);
        day = Number(parts[0]);
      }
    } else if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts[0].length === 4) {
        year = Number(parts[0]);
        month = Number(parts[1]);
        day = Number(parts[2]);
      } else {
        year = Number(parts[2]);
        month = Number(parts[1]);
        day = Number(parts[0]);
      }
    }

    if (!year || !month || isNaN(year) || isNaN(month)) {
      return new Date();
    }
    return new Date(year, month - 1, day || 1);
  };

  const getGcPrefix = (dateString: string) => {
    const date = parseIsoDate(dateString);
    if (!date) return '';
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${month}-${year}`;
  };

  const parseGcSequence = (value?: string) => {
    if (!value) return null;
    const match = value.match(/^[A-Z]{3}-\d{2}-(\d+)$/);
    return match ? Number(match[1]) : null;
  };

  const getNextGcSequenceForDate = (dateString: string) => {
    const prefix = getGcPrefix(dateString);
    if (!prefix) return 1;
    const sequences = notes
      .map((note) => note.noteNumber)
      .filter((num): num is string => typeof num === 'string' && num.startsWith(`${prefix}-`))
      .map(parseGcSequence)
      .filter((seq): seq is number => seq !== null);

    if (sequences.length === 0) return 1;
    return Math.max(...sequences) + 1;
  };

  const getPreviewGcNoteNumber = (dateString: string) => {
    const prefix = getGcPrefix(dateString);
    if (!prefix) return '';
    return `${prefix}-${String(getNextGcSequenceForDate(dateString)).padStart(2, '0')}`;
  };

  // Tax calculations
  const fValue = Number(freight) || 0;
  const advValue = Number(lessAdvance) || 0;

  const cgstAmount = fValue * (Number(cgstPercent) || 0) / 100;
  const sgstAmount = fValue * (Number(sgstPercent) || 0) / 100;
  const igstAmount = fValue * (Number(igstPercent) || 0) / 100;
  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const grandTotal = fValue + totalTax;
  const balanceDue = grandTotal - advValue;
  const itemsTotalNumericValue = items.reduce((sum, item) => {
    const num = Number(item.value);
    return sum + (!isNaN(num) && item.value.trim() !== '' ? num : 0);
  }, 0);
  const itemsNonNumericValues = items.map(item => item.value.trim()).filter(v => v !== '' && isNaN(Number(v)));
  const itemsTotalValueDisplay = itemsTotalNumericValue > 0
    ? itemsTotalNumericValue.toFixed(2)
    : (itemsNonNumericValues.length > 0 ? itemsNonNumericValues.join(', ') : '');

  const formatRupeeParts = (value: number | string | undefined) => {
    if (value === undefined || value === null || value === '') return { rs: '', ps: '' };
    const num = Number(value);
    if (isNaN(num) || num === 0) return { rs: '', ps: '' };
    const [rs, ps] = num.toFixed(2).split('.');
    return { rs, ps };
  };

  const formatRequiredRupeeParts = (value: number | string | undefined) => {
    if (value === undefined || value === null || value === '') return { rs: '0', ps: '00' };
    const num = Number(value);
    if (isNaN(num)) return { rs: '0', ps: '00' };
    const [rs, ps] = num.toFixed(2).split('.');
    return { rs, ps };
  };

  const getCurrentGcNoteFromState = (): GcNote => {
    const filledItems: GcItem[] = items
      .filter(item => item.description.trim() || item.articlesCount.trim() || item.weight.trim() || item.value.trim())
      .map(item => ({
        articlesCount: item.articlesCount.trim(),
        description: item.description.trim(),
        weight: item.weight.trim(),
        value: item.value.trim(),
      }));

    if (filledItems.length > 0 && valueRs.trim() && !filledItems[0].value) {
      filledItems[0].value = valueRs.trim();
    }

    return {
      id: noteNumber.trim() || 'NBT_GC',
      noteNumber: noteNumber.trim() || 'NBT_GC',
      date: gcDate.trim() || new Date().toISOString().split('T')[0],
      billNumber: billNumber.trim(),
      from: from.trim() || 'SALEM',
      to: to.trim() || 'DESTINATION',
      truckNumber: truckNumber.trim(),
      consignor: consignor.trim(),
      consignee: consignee.trim(),
      consignorGst: consignorGst.trim(),
      consigneeGst: consigneeGst.trim(),
      gstinNumber: gstinNumber.trim(),
      items: filledItems.length > 0 ? filledItems : [{ articlesCount: 1, description: 'Goods Consignment', weight: 0, value: 0 }],
      freight: fValue,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      total: grandTotal,
      lessAdvance: advValue,
      balance: balanceDue,
      payableAt: payableAt.trim(),
      valueRs: valueRs.trim(),
      paymentType,
      taxPayee,
      deliveryAt: deliveryAt.trim(),
      pan: panNumber.trim(),
      driverName: driverName.trim(),
      driverSignature: driverSignature.trim(),
      dlNumber: dlNumber.trim(),
      lorryOwner: lorryOwner.trim(),
      bankAccountName: bankAccountName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankIfsc: bankIfsc.trim(),
      bankName: bankName.trim(),
      bankBranch: bankBranch.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      phone1: phone1.trim(),
      phone2: phone2.trim(),
      phone3: phone3.trim(),
      bankDetails: bankDetails.trim(),
      terms: terms.trim(),
      createdAt: new Date().toISOString(),
    };
  };

  const handleDownloadCurrentForm = () => {
    const note = getCurrentGcNoteFromState();
    handleDownloadPDF(note.id, note);
  };

  const handlePrintCurrentForm = () => {
    const note = getCurrentGcNoteFromState();
    handlePrintPDF(note.id, note);
  };

  const resetFormFields = () => {
    setEditingGcId(null);
    setNoteNumber(getPreviewGcNoteNumber(gcDate));
    setGcDate(new Date().toISOString().split('T')[0]);
    setBillNumber('');
    setFrom('');
    setTo('');
    setTruckNumber('');
    setConsignor('');
    setConsignee('');
    setConsignorGst('');
    setConsigneeGst('');
    setGstinNumber('33AMTPR8487P2ZM');
    setPanNumber('AMTPR8487P');
    setItems(Array.from({ length: 6 }, () => ({ articlesCount: '', description: '', weight: '', value: '' })));
    setFreight('');
    setLessAdvance('0');
    setTaxOption('NONE');
    setCgstPercent(0);
    setSgstPercent(0);
    setIgstPercent(0);
    setPayableAt('');
    setValueRs('');
    setPaymentType('');
    setTaxPayee('Consignor');
    setDeliveryAt('Door Delivery');
    setDriverName('');
    setDriverSignature('');
    setDlNumber('');
    setLorryOwner('');
    setBankAccountName('New Balaji Transports');
    setBankAccountNumber('1187115000014102');
    setBankIfsc('KVBL0001187');
    setBankName('Karur Vysya Bank');
    setBankBranch('Salem - 636 002');
    setAddressLine1('3/131, V.K.V. Complex, 1st Floor,');
    setAddressLine2('Bangalore Bye Pass Road, Kandampatty (Po.), Salem - 636 005 (TN)');
    setPhone1('94433 51789');
    setPhone2('93622 51789');
    setPhone3('97892 71721');
    setEmail('newbalajitransports1@gmail.com');
    setWebsite('www.newbalajitransport.com');
    setBankDetails('');
    setTerms('');
  };

  const handleSaveGC = async () => {
    const filledItems: GcItem[] = items
      .filter(item => item.description.trim() || item.articlesCount.trim() || item.weight.trim() || item.value.trim())
      .map(item => ({
        articlesCount: item.articlesCount.trim(),
        description: item.description.trim(),
        weight: item.weight.trim(),
        value: item.value.trim(),
      }));

    if (filledItems.length > 0 && valueRs.trim() && !filledItems[0].value) {
      filledItems[0].value = valueRs.trim();
    }

    const missing: string[] = [];
    if (!from.trim()) missing.push('Route From');
    if (!to.trim()) missing.push('Route To');
    if (!truckNumber.trim()) missing.push('Truck Number');
    if (!consignor.trim()) missing.push('Consignor (Shipper)');
    if (!consignee.trim()) missing.push('Consignee');
    if (!freight.trim()) missing.push('Freight Amount');

    if (missing.length > 0) {
      const msg = `Please fill out the following required fields to save GC Note:\n\n• ${missing.join('\n• ')}`;
      showConfirmDialog('Missing Required Fields', msg, undefined, 'info', 'Got It');
      return;
    }

    setLoading(true);
    try {
      const gcData = {
        noteNumber: noteNumber.trim(),
        date: gcDate.trim(),
        billNumber: billNumber.trim(),
        from: from.trim(),
        to: to.trim(),
        truckNumber: truckNumber.trim(),
        consignor: consignor.trim(),
        consignee: consignee.trim(),
        consignorGst: consignorGst.trim(),
        consigneeGst: consigneeGst.trim(),
        gstinNumber: gstinNumber.trim(),
        items: filledItems,
        freight: fValue,
        cgst: cgstAmount,
        sgst: sgstAmount,
        igst: igstAmount,
        total: grandTotal,
        lessAdvance: advValue,
        balance: balanceDue,
        payableAt: payableAt.trim(),
        valueRs: valueRs.trim(),
        paymentType,
        taxPayee,
        deliveryAt: deliveryAt.trim(),
        pan: panNumber.trim(),
        driverName: driverName.trim(),
        driverSignature: driverSignature.trim(),
        dlNumber: dlNumber.trim(),
        lorryOwner: lorryOwner.trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim(),
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        phone1: phone1.trim(),
        phone2: phone2.trim(),
        phone3: phone3.trim(),
        email: email.trim(),
        website: website.trim(),
        bankDetails: bankDetails.trim(),
        terms: terms.trim(),
      };

      if (editingGcId) {
        const res = await db.updateGcNote(editingGcId, gcData);
        if (res.success && res.gcNote) {
          const updatedGcId = res.gcNote.noteNumber || res.gcNote.id || editingGcId;
          showConfirmDialog(
            'GC Updated Successfully!',
            `Note ${updatedGcId} has been updated in database.`,
            undefined,
            'success',
            'Great!'
          );

          resetFormFields();
          const savedMonthPrefix = getGcPrefix(gcData.date);
          if (savedMonthPrefix) {
            setSelectedMonth(savedMonthPrefix);
          }
          await fetchGcNotes();
          setActiveTab('ARCHIVE');
        } else {
          const err = res.error || 'Failed to update consignment note.';
          showConfirmDialog('Update Error', err, undefined, 'danger', 'OK');
        }
      } else {
        const res = await db.createGcNote(gcData);
        if (res.success && res.gcNote) {
          const savedGcId = res.gcNote.id || res.gcNote.noteNumber;
          showConfirmDialog(
            'GC Saved Successfully!',
            `Note ${savedGcId} has been archived & saved to database.`,
            undefined,
            'success',
            'Great!'
          );

          resetFormFields();
          const savedMonthPrefix = getGcPrefix(gcData.date);
          if (savedMonthPrefix) {
            setSelectedMonth(savedMonthPrefix);
          }
          await fetchGcNotes();
          setActiveTab('ARCHIVE');
        } else {
          const err = res.error || 'Failed to save consignment note.';
          showConfirmDialog('Save Error', err, undefined, 'danger', 'OK');
        }
      }
    } catch (e: any) {
      showConfirmDialog('System Error', e?.message || 'Unexpected error occurred while saving note.', undefined, 'danger', 'OK');
    } finally {
      setLoading(false);
    }
  };

  const openWebGcPrintPreview = async (html: string) => {
    if (typeof window === 'undefined') return;
    try {
      if (Platform.OS !== 'web') {
        await Print.printAsync({ html });
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.alert('Pop-up blocked. Please enable pop-ups to print GC Note.');
        return;
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.warn('Auto-print dialog trigger failed:', e);
        }
      }, 500);
    } catch (err) {
      console.error('Error opening print preview:', err);
    }
  };

  const downloadWebGcAsPdf = (html: string, filename: string) => {
    if (typeof window === 'undefined' || Platform.OS !== 'web') return;
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        setTimeout(() => {
          try {
            printWin.focus();
            printWin.print();
          } catch (_) { }
        }, 350);
      }
    } catch (e) {
      console.warn('Web direct download fallback:', e);
    }
  };

  // Build Highway Design 3 HTML for Printing & PDF Generation
  const buildGcHtml = (note: GcNote) => {
    const safeNum = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    const safeItems = Array.isArray(note.items) ? note.items : [];

    const itemRows = Array.from({ length: 7 }).map((_, idx) => {
      const item = safeItems[idx] || { articlesCount: '', description: '', weight: '', value: '' };
      const rawVal = item.value !== undefined && item.value !== null ? String(item.value).trim() : '';
      const numVal = Number(rawVal);
      const isNum = !isNaN(numVal) && rawVal !== '';
      const valStr = isNum ? (numVal % 1 === 0 ? numVal.toString() : numVal.toFixed(2)) : rawVal;
      const wtStr = item.weight !== undefined && item.weight !== null && String(item.weight).trim() !== '' ? String(item.weight) : '';
      const countStr = item.articlesCount !== undefined && item.articlesCount !== null && String(item.articlesCount).trim() !== '' ? String(item.articlesCount) : '';

      return `
        <tr>
          <td class="col-articles">${countStr}</td>
          <td class="col-desc">${item.description || ''}</td>
          <td class="col-weight">${wtStr}</td>
        </tr>
      `;
    }).join('');

    const numericValues = safeItems.map(item => Number(item?.value)).filter(n => !isNaN(n) && n > 0);
    const sumNumericValue = numericValues.reduce((sum, n) => sum + n, 0);
    const nonNumericValues = safeItems.map(item => String(item?.value || '').trim()).filter(s => s !== '' && isNaN(Number(s)));
    const totalValueDisplay = (note as any).valueRs !== undefined && String((note as any).valueRs).trim() !== ''
      ? String((note as any).valueRs)
      : (sumNumericValue > 0
          ? sumNumericValue.toFixed(2)
          : (nonNumericValues.length > 0 ? nonNumericValues.join(', ') : ''));

    const taxPayeeLower = (note.taxPayee || (note as any).gstPayee || '').toLowerCase();
    const paymentTypeUpper = (note.paymentType || '').toUpperCase();

    const fVal = safeNum(note.freight);
    const cgstVal = safeNum(note.cgst);
    const sgstVal = safeNum(note.sgst);
    const igstVal = safeNum(note.igst);
    const totalVal = safeNum(note.total);
    const advVal = safeNum(note.lessAdvance);
    const balVal = safeNum(note.balance);

    const fParts = formatRupeeParts(fVal);
    const cgstParts = formatRupeeParts(cgstVal);
    const sgstParts = formatRupeeParts(sgstVal);
    const igstParts = formatRupeeParts(igstVal);
    const totalParts = formatRequiredRupeeParts(totalVal);
    const advParts = formatRupeeParts(advVal);
    const balParts = formatRequiredRupeeParts(balVal);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>GC Note - ${note.noteNumber || note.id || ''}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.25;
          }
          .page {
            width: 100%;
            max-width: 282mm;
            min-height: 196mm;
            margin: 0 auto;
            padding: 4mm 6mm;
            background: #ffffff;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          /* Header Banner: Deep Blue #0a3a72 matching PDF */
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #0a3a72;
            padding: 8px 18px;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            min-height: 88px;
            box-sizing: border-box;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 14px;
            position: relative;
            z-index: 2;
          }
          .logo-img {
            width: 76px;
            height: 76px;
            object-fit: contain;
            display: block;
            flex-shrink: 0;
          }
          .brand-text {
            display: flex;
            flex-direction: column;
          }
          .brand-title {
            font-size: 25px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: 0.5px;
            line-height: 1.1;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #a8c6ed;
            margin-top: 3px;
          }

          /* Center Highway Diagonal Slashes */
          .header-center-slashes {
            position: absolute;
            left: 56%;
            top: 0;
            bottom: 0;
            width: 80px;
            overflow: hidden;
            pointer-events: none;
            z-index: 1;
          }
          .slash-gold {
            position: absolute;
            left: 10px;
            top: -20px;
            width: 28px;
            height: 140px;
            background: #f2a800;
            transform: skewX(-24deg);
          }
          .slash-white {
            position: absolute;
            left: 48px;
            top: -20px;
            width: 6px;
            height: 140px;
            background: #ffffff;
            transform: skewX(-24deg);
          }

          /* Header Right Contact Block */
          .header-right {
            display: flex;
            align-items: flex-end;
            position: relative;
            text-align: right;
            z-index: 2;
          }
          .address-block {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            font-size: 8.5px;
            line-height: 1.35;
            color: #ffffff;
            font-weight: 500;
          }
          .address-line {
            color: #ffffff;
          }
          .phone-numbers {
            font-size: 11px;
            font-weight: 800;
            color: #f2a800;
            margin-top: 3px;
            letter-spacing: 0.3px;
          }
          .contact-email, .contact-web {
            font-size: 8.5px;
            font-weight: 500;
            color: #a8c6ed;
            margin-top: 1px;
          }

          /* Pill Banner */
          .pill-banner-container {
            margin: 8px 0 10px 0;
          }
          .pill-banner {
            display: inline-block;
            background-color: #f2a800;
            color: #0a3a72;
            font-size: 11.5px;
            font-weight: 900;
            letter-spacing: 0.6px;
            padding: 5px 22px;
            border-radius: 9999px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }

          /* Dotted Underline Info Fields */
          .fields-section {
            display: flex;
            flex-direction: column;
            gap: 7px;
            margin-bottom: 10px;
          }
          .field-row {
            display: flex;
            align-items: flex-end;
            gap: 16px;
          }
          .field-item {
            display: flex;
            align-items: baseline;
            border-bottom: 1px dotted #93c5fd;
            padding-bottom: 2px;
          }
          .field-label {
            font-size: 11px;
            font-weight: 800;
            color: #0b2c6d;
            margin-right: 6px;
            white-space: nowrap;
          }
          .field-value {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            flex: 1;
            min-height: 14px;
          }
          .field-value-red {
            color: #b91c1c;
            font-weight: 800;
          }

          /* Main Body Grid: Items Table + Amount Box */
          .main-grid {
            display: flex;
            align-items: stretch;
            gap: 0;
            margin-bottom: 6px;
          }
          .items-table-wrapper {
            flex: 1;
            border: 1.5px solid #2563eb;
            border-right: none;
            display: flex;
            flex-direction: column;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            height: 100%;
          }
          .items-table th {
            border-bottom: 1.5px solid #2563eb;
            border-right: 1.5px solid #2563eb;
            padding: 5px 6px;
            font-size: 10px;
            font-weight: 800;
            color: #0b2c6d;
            background: #ffffff;
            text-align: center;
          }
          .items-table th:last-child {
            border-right: none;
          }
          .items-table td {
            border-bottom: 1px solid #bfdbfe;
            border-right: 1.5px solid #2563eb;
            padding: 4px 6px;
            height: 20px;
            font-size: 10.5px;
            font-weight: 600;
          }
          .items-table td:last-child {
            border-right: none;
          }
          .col-articles {
            width: 14%;
            text-align: center;
          }
          .col-desc {
            width: 68%;
            text-align: left;
            padding-left: 8px !important;
          }
          .col-weight {
            width: 18%;
            text-align: right;
            padding-right: 8px !important;
          }

          /* Amount Panel */
          .amount-panel {
            width: 250px;
            border: 1.5px solid #2563eb;
            border-collapse: collapse;
          }
          .amount-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .amount-th-row {
            background-color: #0b2c6d;
            color: #ffffff;
          }
          .amount-th {
            padding: 5px 6px;
            font-size: 10px;
            font-weight: 800;
            border-right: 1px solid #1e3a8a;
          }
          .amount-th:last-child {
            border-right: none;
          }
          .amount-tr {
            border-bottom: 1px solid #bfdbfe;
          }
          .amount-tr:last-child {
            border-bottom: none;
          }
          .amount-label-cell {
            padding: 3.5px 8px;
            font-weight: 700;
            color: #0b2c6d;
            width: 52%;
            border-right: 1.5px solid #2563eb;
          }
          .amount-rs-cell {
            padding: 3.5px 6px;
            text-align: right;
            font-weight: 700;
            width: 32%;
            border-right: 1.5px solid #2563eb;
          }
          .amount-ps-cell {
            padding: 3.5px 4px;
            text-align: center;
            font-weight: 700;
            width: 16%;
          }

          /* Below Table Row: Value Rs. & Payment & GST */
          .subtable-section {
            margin-top: 4px;
            margin-bottom: 6px;
          }
          .value-row {
            display: flex;
            align-items: baseline;
            gap: 12px;
            border-bottom: 1px dotted #93c5fd;
            padding-bottom: 3px;
            margin-bottom: 5px;
          }
          .value-label {
            font-size: 11px;
            font-weight: 800;
            color: #0b2c6d;
          }
          .value-text {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            flex: 1;
          }
          .payment-type-boxes {
            display: flex;
            align-items: center;
            gap: 18px;
            font-size: 10.5px;
            font-weight: 700;
            color: #0b2c6d;
            margin-left: 20px;
          }
          .checkbox-label {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .box-icon {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1.5px solid #0b2c6d;
            text-align: center;
            line-height: 11px;
            font-size: 9px;
            font-weight: 900;
          }

          .gst-tax-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 4px;
          }
          .gst-tax-left {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 10px;
            font-weight: 700;
            color: #0b2c6d;
          }
          .for-company-right {
            font-size: 12px;
            font-weight: 900;
            color: #0b2c6d;
            letter-spacing: 0.3px;
            margin-right: 10px;
            text-align: center;
            border: 1px solid #0b2c6d;
            border-radius: 3px;
            padding: 3px 6px;
            flex-shrink: 0;
          }
          .for-company-signature {
            display: block;
            width: 64px;
            height: 34px;
            object-fit: contain;
            margin: 0 auto;
          }
          .for-company-signatory {
            display: block;
            font-size: 9px;
            font-weight: 800;
            color: #0b2c6d;
            letter-spacing: 0;
          }

          /* Bank & GST Details Card */
          .bank-gst-card {
            display: flex;
            background: #edf5fd;
            border: 1.5px solid #3b82f6;
            border-radius: 8px;
            padding: 6px 12px;
            margin-top: 6px;
            margin-bottom: 6px;
            align-items: center;
          }
          .bank-col {
            flex: 1.3;
            font-size: 10px;
            line-height: 1.4;
          }
          .bank-col-title {
            font-weight: 800;
            color: #0b2c6d;
            margin-bottom: 2px;
          }
          .bank-row {
            display: flex;
            gap: 6px;
            color: #334155;
          }
          .bank-row strong {
            color: #0f172a;
          }
          .card-divider {
            width: 1.5px;
            background-color: #93c5fd;
            height: 48px;
            margin: 0 16px;
          }
          .gst-col {
            flex: 1;
            font-size: 11px;
            line-height: 1.5;
          }
          .gst-row {
            display: flex;
            align-items: baseline;
            gap: 12px;
          }
          .gst-row-label {
            font-weight: 800;
            color: #0b2c6d;
            min-width: 60px;
          }
          .gst-row-value {
            font-weight: 800;
            color: #0b2c6d;
            letter-spacing: 0.5px;
          }

          /* Legal Text */
          .legal-disclaimer {
            font-size: 9px;
            color: #475569;
            font-weight: 600;
            margin: 4px 0 6px 0;
          }

          /* Signatures Row */
          .signatures-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 16px;
            margin-top: 4px;
            margin-bottom: 6px;
          }
          .sig-item {
            display: flex;
            align-items: baseline;
            border-bottom: 1px dotted #93c5fd;
            padding-bottom: 2px;
            flex: 1;
          }
          .sig-label {
            font-size: 10px;
            font-weight: 800;
            color: #0b2c6d;
            margin-right: 6px;
            white-space: nowrap;
          }
          .sig-value {
            font-size: 10.5px;
            font-weight: 700;
            color: #0f172a;
            flex: 1;
          }

          /* Highway Bottom Bar */
          .highway-bottom-bar {
            width: 100%;
            height: 14px;
            background-color: #0b2c6d;
            margin-top: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 2px;
          }
          .highway-dashes {
            width: 100%;
            height: 3.5px;
            background-image: repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 18px, transparent 18px, transparent 32px);
          }

          @media print {
            body {
              background: #ffffff;
            }
            .page {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Top Area: Header & Branding -->
          <div>
            <div class="header-container">
              <div class="header-left">
                ${nbtLogoBase64 ? `<img src="${nbtLogoBase64}" class="logo-img" alt="NBT Logo" />` : ''}
                <div class="brand-text">
                  <div class="brand-title">NEW BALAJI TRANSPORTS</div>
                  <div class="brand-subtitle">Lorry Suppliers & Commission Agent</div>
                </div>
              </div>

              <!-- Center Highway Slanted Slashes -->
              <div class="header-center-slashes">
                <div class="slash-gold"></div>
                <div class="slash-white"></div>
              </div>

              <div class="header-right">
                <div class="address-block">
                  <div class="address-line">${note.addressLine1 || '3/131, V.K.V. Complex, 1st Floor,'}</div>
                  <div class="address-line">${note.addressLine2 || 'Bangalore Bye Pass Road, Kandampatty (Po.), Salem - 636 005 (TN)'}</div>
                  <div class="phone-numbers">${note.phone1 || '94433 51789'} | ${note.phone2 || '93622 51789'} | ${note.phone3 || '97892 71721'}</div>
                  <div class="contact-email">${email || 'newbalajitransports1@gmail.com'}</div>
                  <div class="contact-web">${website || 'www.newbalajitransport.com'}</div>
                </div>
              </div>
            </div>

            <!-- Pill Banner -->
            <div class="pill-banner-container">
              <div class="pill-banner">GOODS CONSIGNMENT / CONSIGNEE COPY</div>
            </div>

            <!-- Fields Section (Dotted Underline) -->
            <div class="fields-section">
              <div class="field-row">
                <div class="field-item" style="flex: 1.1;">
                  <span class="field-label">G.C. Note No. :</span>
                  <span class="field-value field-value-red">${note.noteNumber || note.id || ''}</span>
                </div>
                <div class="field-item" style="flex: 1.1;">
                  <span class="field-label">Truck No. :</span>
                  <span class="field-value">${note.truckNumber || ''}</span>
                </div>
                <div class="field-item" style="flex: 0.9;">
                  <span class="field-label">Date :</span>
                  <span class="field-value">${note.date || ''}</span>
                </div>
              </div>

              <div class="field-row">
                <div class="field-item" style="flex: 1;">
                  <span class="field-label">From :</span>
                  <span class="field-value">${note.from || ''}</span>
                </div>
                <div class="field-item" style="flex: 1;">
                  <span class="field-label">To :</span>
                  <span class="field-value">${note.to || ''}</span>
                </div>
              </div>

              <div class="field-row">
                <div class="field-item" style="flex: 1.5;">
                  <span class="field-label">Consignor M/s.</span>
                  <span class="field-value">${note.consignor || ''}</span>
                </div>
                <div class="field-item" style="flex: 1;">
                  <span class="field-label">GSTIN :</span>
                  <span class="field-value">${note.consignorGst || ''}</span>
                </div>
              </div>

              <div class="field-row">
                <div class="field-item" style="flex: 1.5;">
                  <span class="field-label">Consignee M/s.</span>
                  <span class="field-value">${note.consignee || ''}</span>
                </div>
                <div class="field-item" style="flex: 1;">
                  <span class="field-label">GSTIN :</span>
                  <span class="field-value">${note.consigneeGst || ''}</span>
                </div>
              </div>

              <div class="field-row">
                <div class="field-item" style="flex: 1.2;">
                  <span class="field-label">AS PER BILL NO.</span>
                  <span class="field-value">${note.billNumber || ''}</span>
                </div>
                <div class="field-item" style="flex: 1;">
                  <span class="field-label">Delivery at :</span>
                  <span class="field-value">${note.deliveryAt || 'Door Delivery'}</span>
                </div>
              </div>
            </div>

            <!-- Main Items Table + Amount Box -->
            <div class="main-grid">
              <div class="items-table-wrapper">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th class="col-articles">No. of<br />Articles</th>
                      <th class="col-desc">Description of Goods<br /><span style="font-weight: 500; font-size: 8.5px;">(Said to Contain)</span></th>
                      <th class="col-weight">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                </table>
              </div>

              <div class="amount-panel">
                <table class="amount-table">
                  <thead>
                    <tr class="amount-th-row">
                      <th class="amount-th" style="text-align: left; padding-left: 8px;">AMOUNT</th>
                      <th class="amount-th" style="text-align: center; width: 32%;">Rs.</th>
                      <th class="amount-th" style="text-align: center; width: 16%;">Ps.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="amount-tr">
                      <td class="amount-label-cell">Freight</td>
                      <td class="amount-rs-cell">${fParts.rs}</td>
                      <td class="amount-ps-cell">${fParts.ps}</td>
                    </tr>
                    <tr class="amount-tr">
                      <td class="amount-label-cell">CGST</td>
                      <td class="amount-rs-cell">${cgstParts.rs}</td>
                      <td class="amount-ps-cell">${cgstParts.ps}</td>
                    </tr>
                    <tr class="amount-tr">
                      <td class="amount-label-cell">SGST</td>
                      <td class="amount-rs-cell">${sgstParts.rs}</td>
                      <td class="amount-ps-cell">${sgstParts.ps}</td>
                    </tr>
                    <tr class="amount-tr">
                      <td class="amount-label-cell">IGST</td>
                      <td class="amount-rs-cell">${igstParts.rs}</td>
                      <td class="amount-ps-cell">${igstParts.ps}</td>
                    </tr>
                    <tr class="amount-tr" style="background: #f8fafc; font-weight: 800;">
                      <td class="amount-label-cell">Total</td>
                      <td class="amount-rs-cell">${totalParts.rs}</td>
                      <td class="amount-ps-cell">${totalParts.ps}</td>
                    </tr>
                    <tr class="amount-tr">
                      <td class="amount-label-cell">Less Advance</td>
                      <td class="amount-rs-cell">${advParts.rs}</td>
                      <td class="amount-ps-cell">${advParts.ps}</td>
                    </tr>
                    <tr class="amount-tr" style="background: #f1f5f9; font-weight: 900;">
                      <td class="amount-label-cell">Balance</td>
                      <td class="amount-rs-cell">${balParts.rs}</td>
                      <td class="amount-ps-cell">${balParts.ps}</td>
                    </tr>
                    <tr class="amount-tr">
                      <td class="amount-label-cell">Payable at</td>
                      <td colspan="2" style="padding: 3px 6px; font-weight: 700; color: #0b2c6d; text-align: center;">${note.payableAt || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Value Rs. & Payment Type Checkboxes -->
            <div class="subtable-section">
              <div class="value-row">
                <span class="value-label">Value Rs.</span>
                <span class="value-text">${totalValueDisplay}</span>
                <div class="payment-type-boxes">
                  <span class="checkbox-label"><span class="box-icon">${paymentTypeUpper === 'TBB' ? '✓' : ''}</span> TBB</span>
                  <span class="checkbox-label"><span class="box-icon">${paymentTypeUpper === 'TO_PAY' ? '✓' : ''}</span> TO PAY</span>
                  <span class="checkbox-label"><span class="box-icon">${paymentTypeUpper === 'PAID' ? '✓' : ''}</span> PAID</span>
                  <span>Rs. &nbsp;&nbsp; ${totalParts.rs}</span>
                </div>
              </div>

              <!-- GST Tax Pay Checkboxes & Company Signature Title -->
              <div class="gst-tax-row">
                <div class="gst-tax-left">
                  <span style="font-weight: 800;">GST TAX PAY :</span>
                  <span class="checkbox-label"><span class="box-icon">${taxPayeeLower === 'transport' ? '✓' : ''}</span> Transport</span>
                  <span class="checkbox-label"><span class="box-icon">${taxPayeeLower === 'consignor' ? '✓' : ''}</span> Consignor</span>
                  <span class="checkbox-label"><span class="box-icon">${taxPayeeLower === 'consignee' ? '✓' : ''}</span> Consignee</span>
                </div>
                <div class="for-company-right">
                  For NEW BALAJI TRANSPORTS
                  <img src="${nbtAuthorisedSignatureBase64}" class="for-company-signature" alt="Authorised signature" />
                  <span class="for-company-signatory">Authorised Signatory</span>
                </div>
              </div>
            </div>

            <!-- Bank Details & GST Box -->
            <div class="bank-gst-card">
              <div class="bank-col">
                <div class="bank-col-title">New Balaji Transports - ${note.bankName || 'Karur Vysya Bank'}</div>
                <div class="bank-row"><span>C/Account No.</span> : <strong>${note.bankAccountNumber || '1187115000014102'}</strong></div>
                <div class="bank-row"><span>IFSC Code</span> : <strong>${note.bankIfsc || 'KVBL0001187'}</strong></div>
                <div class="bank-row"><span>Branch</span> : <strong>${note.bankBranch || 'Salem - 636 002'}</strong></div>
              </div>
              <div class="card-divider"></div>
              <div class="gst-col">
                <div class="gst-row">
                  <span class="gst-row-label">GSTIN</span>
                  <span class="gst-row-value">${note.gstinNumber || '33AMTPR8487P2ZM'}</span>
                </div>
                <div class="gst-row">
                  <span class="gst-row-label">PAN No.</span>
                  <span class="gst-row-value">${note.pan || 'AMTPR8487P'}</span>
                </div>
              </div>
            </div>

            <!-- Disclaimer -->
            <div class="legal-disclaimer">
              These Goods are Booked at Owners risk and Insured by Consignor / Consignee. Subject to Salem Jurisdiction only.
            </div>
            <div class="legal-disclaimer" style="margin-top:4px;">
              Certified that the service provided is by a Goods Transport Agency (GTA). GST on this service is payable by the Recipient (Consignee) under Reverse Charge Mechanism (RCM) pursuant to Notification No. 13/2017-Central Tax (Rate), and no tax has been charged by the transporter.
            </div>

            <!-- Driver & Lorry Owner Signatures Row -->
            <div class="signatures-row">
              <div class="sig-item">
                <span class="sig-label">Driver's Signature :</span>
                <span class="sig-value">${note.driverSignature || ''}</span>
              </div>
              <div class="sig-item">
                <span class="sig-label">Driver's Name :</span>
                <span class="sig-value">${note.driverName || ''}</span>
              </div>
              <div class="sig-item">
                <span class="sig-label">DL No. :</span>
                <span class="sig-value">${note.dlNumber || ''}</span>
              </div>
              <div class="sig-item">
                <span class="sig-label">Lorry Owner :</span>
                <span class="sig-value">${note.lorryOwner || ''}</span>
              </div>
            </div>
          </div>

          <!-- Bottom Highway Decoration Strip -->
          <div class="highway-bottom-bar">
            <div class="highway-dashes"></div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintPDF = async (id: string, note?: GcNote) => {
    try {
      const gcNote = note || notes.find((n) => n.id === id);
      if (!gcNote) return;

      const html = buildGcHtml(gcNote);
      if (Platform.OS === 'web') {
        await openWebGcPrintPreview(html);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        await Print.printAsync({ uri });
      }
    } catch (e) {
      console.error('Error generating print output:', e);
      Alert.alert('Error', 'Failed to generate print layout.');
    }
  };

  const handleDownloadPDF = async (id: string, note?: GcNote) => {
    try {
      const gcNote = note || notes.find((n) => n.id === id);
      if (!gcNote) return;

      const filename = `GC_${gcNote.noteNumber || gcNote.id}_${gcNote.date || 'note'}`.replace(/[\/\\?%*:|"<>]/g, '_');
      const html = buildGcHtml(gcNote);

      if (Platform.OS === 'web') {
        downloadWebGcAsPdf(html, filename);
        return;
      }

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Download GC Note ${gcNote.noteNumber || gcNote.id}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Download Ready', `File saved temporarily at: ${uri}`);
      }
    } catch (e) {
      console.error('Error downloading PDF:', e);
      Alert.alert('Error', 'Failed to download PDF.');
    }
  };

  const handleEditGc = (n: GcNote) => {
    setEditingGcId(n.id);
    setNoteNumber(n.noteNumber || n.id);
    setGcDate(n.date || new Date().toISOString().split('T')[0]);
    setBillNumber(n.billNumber || '');
    setFrom(n.from || '');
    setTo(n.to || '');
    setTruckNumber(n.truckNumber || '');
    setConsignor(n.consignor || '');
    setConsignee(n.consignee || '');
    setConsignorGst(n.consignorGst || '');
    setConsigneeGst(n.consigneeGst || '');
    setGstinNumber(n.gstinNumber || '33AMTPR8487P2ZM');
    setPanNumber(n.pan || 'AMTPR8487P');

    const rawItems = Array.isArray(n.items) ? n.items : [];
    const loadedItems = Array.from({ length: Math.max(6, rawItems.length) }, (_, i) => {
      const item = rawItems[i];
      return {
        articlesCount: item && item.articlesCount !== undefined && item.articlesCount !== null ? String(item.articlesCount) : '',
        description: item ? (item.description || '') : '',
        weight: item && item.weight !== undefined && item.weight !== null ? String(item.weight) : '',
        value: item && item.value !== undefined && item.value !== null ? String(item.value) : '',
      };
    });
    setItems(loadedItems);

    setFreight(n.freight ? n.freight.toString() : '');
    setLessAdvance(n.lessAdvance !== undefined && n.lessAdvance !== null ? n.lessAdvance.toString() : '0');

    const f = Number(n.freight) || 0;
    const cgstP = f && n.cgst ? Math.round((n.cgst / f) * 100 * 100) / 100 : 0;
    const sgstP = f && n.sgst ? Math.round((n.sgst / f) * 100 * 100) / 100 : 0;
    const igstP = f && n.igst ? Math.round((n.igst / f) * 100 * 100) / 100 : 0;

    setCgstPercent(cgstP);
    setSgstPercent(sgstP);
    setIgstPercent(igstP);
    setTaxOption(n.cgst > 0 || n.sgst > 0 ? 'CGST_SGST' : n.igst > 0 ? 'IGST' : 'NONE');

    setPayableAt(n.payableAt || '');
    const editVal = (n as any).valueRs !== undefined && (n as any).valueRs !== null && String((n as any).valueRs).trim() !== ''
      ? String((n as any).valueRs)
      : (rawItems.find(it => it.value && String(it.value).trim() !== '')?.value ? String(rawItems.find(it => it.value && String(it.value).trim() !== '')!.value) : '');
    setValueRs(editVal);
    setPaymentType(((n.paymentType as any) || '') as any);
    setTaxPayee(((n.taxPayee || (n as any).gstPayee || 'Consignor') as any));
    setDeliveryAt(n.deliveryAt || 'Door Delivery');
    setDriverName(n.driverName || '');
    setDriverSignature(n.driverSignature || '');
    setDlNumber(n.dlNumber || '');
    setLorryOwner(n.lorryOwner || '');
    setBankAccountName(n.bankAccountName || 'New Balaji Transports');
    setBankAccountNumber(n.bankAccountNumber || '1187115000014102');
    setBankIfsc(n.bankIfsc || 'KVBL0001187');
    setBankName(n.bankName || 'Karur Vysya Bank');
    setBankBranch(n.bankBranch || 'Salem - 636 002');
    setAddressLine1(n.addressLine1 || '3/131, V.K.V. Complex, 1st Floor,');
    setAddressLine2(n.addressLine2 || 'Bangalore Bye Pass Road, Kandampatty (Po.), Salem - 636 005 (TN)');
    setPhone1(n.phone1 || '94433 51789');
    setPhone2(n.phone2 || '93622 51789');
    setPhone3(n.phone3 || '97892 71721');
    setEmail((n as any).email || 'newbalajitransports1@gmail.com');
    setWebsite((n as any).website || 'www.newbalajitransport.com');
    setBankDetails(n.bankDetails || '');
    setTerms(n.terms || '');

    setActiveTab('CREATE');
  };

  const handleDuplicate = (n: GcNote) => {
    setFrom(n.from);
    setTo(n.to);
    setTruckNumber(n.truckNumber);
    setConsignor(n.consignor);
    setConsignee(n.consignee);
    setConsignorGst(n.consignorGst);
    setConsigneeGst(n.consigneeGst);
    setFreight(n.freight.toString());
    setLessAdvance(n.lessAdvance.toString());
    setCgstPercent(n.freight ? (n.cgst / n.freight) * 100 : 0);
    setSgstPercent(n.freight ? (n.sgst / n.freight) * 100 : 0);
    setIgstPercent(n.freight ? (n.igst / n.freight) * 100 : 0);
    setTaxOption(n.cgst > 0 || n.sgst > 0 ? 'CGST_SGST' : n.igst > 0 ? 'IGST' : 'NONE');

    if (n.items && n.items.length > 0) {
      setItems(
        n.items.map(item => ({
          articlesCount: item.articlesCount.toString(),
          description: item.description,
          weight: item.weight.toString(),
          value: item.value.toString(),
        }))
      );
    } else {
      setItems(Array.from({ length: 6 }, () => ({ articlesCount: '', description: '', weight: '', value: '' })));
    }

    setNoteNumber(n.id);
    setBillNumber((n as any).billNumber || '');
    setGstinNumber((n as any).gstinNumber || '');
    const dupVal = (n as any).valueRs !== undefined && (n as any).valueRs !== null && String((n as any).valueRs).trim() !== ''
      ? String((n as any).valueRs)
      : (n.items?.find(it => it.value && String(it.value).trim() !== '')?.value ? String(n.items.find(it => it.value && String(it.value).trim() !== '')!.value) : '');
    setValueRs(dupVal);
    setPaymentType((n as any).paymentType || '');
    setTaxPayee((n as any).taxPayee || (n as any).gstPayee || 'Consignor');
    setDeliveryAt(n.deliveryAt);
    setPanNumber(n.pan);
    setDriverSignature((n as any).driverSignature || '');
    setDriverName(n.driverName);
    setDlNumber(n.dlNumber);
    setLorryOwner(n.lorryOwner);
    setBankAccountName((n as any).bankAccountName || bankAccountName);
    setBankAccountNumber((n as any).bankAccountNumber || bankAccountNumber);
    setBankIfsc((n as any).bankIfsc || bankIfsc);
    setBankName((n as any).bankName || bankName);
    setBankBranch((n as any).bankBranch || bankBranch);
    setAddressLine1((n as any).addressLine1 || addressLine1);
    setAddressLine2((n as any).addressLine2 || addressLine2);
    setPhone1((n as any).phone1 || phone1);
    setPhone2((n as any).phone2 || phone2);
    setPhone3((n as any).phone3 || phone3);
    setEmail((n as any).email || email);
    setWebsite((n as any).website || website);
    setBankDetails(n.bankDetails);

    setActiveTab('CREATE');
    Alert.alert('Duplicated', `Consignment form autofilled with template values from note ${n.id}.`);
  };

  const handleDeleteGcNote = (id: string, noteNumber?: string) => {
    setDeletingGcId({ id, label: noteNumber ? `GC Note #${noteNumber}` : `GC ID: ${id}` });
    setDeleteModalVisible(true);
  };

  const confirmDeleteGcNote = async () => {
    if (!deletingGcId) return;
    setIsDeleting(true);
    try {
      await db.deleteGcNote(deletingGcId.id);
      await fetchGcNotes();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete GC note.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setDeletingGcId(null);
    }
  };

  const getMonthsFromNotes = (noteList: GcNote[]) => {
    const months = new Set<string>();
    noteList.forEach(n => {
      const num = n.noteNumber || n.id;
      const parts = num.split('-');
      if (parts.length >= 2) {
        months.add(`${parts[0]}-${parts[1]}`);
      }
    });
    return Array.from(months).sort().reverse();
  };

  const activeMonths = getMonthsFromNotes(notes);

  const filteredNotes = notes.filter(n => {
    const num = n.noteNumber || n.id;
    const parts = num.split('-');
    const m = `${parts[0]}-${parts[1]}`;
    const matchesMonth = !selectedMonth || m === selectedMonth;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q ||
      (n.noteNumber || n.id).toLowerCase().includes(q) ||
      n.consignor.toLowerCase().includes(q) ||
      n.consignee.toLowerCase().includes(q) ||
      n.truckNumber.toLowerCase().includes(q) ||
      n.from.toLowerCase().includes(q) ||
      n.to.toLowerCase().includes(q);
    return matchesMonth && matchesQuery;
  });

  const totalFreight = filteredNotes.reduce((sum, n) => sum + n.freight, 0);
  const totalGst = filteredNotes.reduce((sum, n) => sum + n.cgst + n.sgst + n.igst, 0);
  const totalWeight = filteredNotes.reduce((sum, n) => {
    const itemWeight = n.items?.reduce((s, i) => s + (Number(i.weight) || 0), 0) || 0;
    return sum + itemWeight;
  }, 0);
  const totalAmount = filteredNotes.reduce((sum, n) => sum + n.total, 0);

  return (
    <View style={styles.container}>
      {/* Header Tabs */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CREATE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('CREATE')}
        >
          <MaterialIcons name="edit-note" size={20} color={activeTab === 'CREATE' ? '#ffffff' : '#cbd5e1'} />
          <Text style={[styles.tabButtonText, activeTab === 'CREATE' && styles.tabButtonTextActive]}>CREATE GC</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ARCHIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ARCHIVE')}
        >
          <MaterialIcons name="archive" size={20} color={activeTab === 'ARCHIVE' ? '#ffffff' : '#cbd5e1'} />
          <Text style={[styles.tabButtonText, activeTab === 'ARCHIVE' && styles.tabButtonTextActive]}>GC ARCHIVE</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'CREATE' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.gcWrapper}>
            {editingGcId && (
              <View style={styles.editingBanner}>
                <View style={styles.editingBannerLeft}>
                  <MaterialIcons name="edit" size={20} color="#1e40af" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editingBannerTitle}>Editing Saved GC Note: {noteNumber || editingGcId}</Text>
                    <Text style={styles.editingBannerSub}>Modify details below and click UPDATE GC NOTE to save changes.</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.cancelEditBtn} onPress={resetFormFields}>
                  <MaterialIcons name="close" size={16} color="#dc2626" />
                  <Text style={styles.cancelEditBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Design 3 Highway Consignment Sheet */}
            <View style={[styles.gcPage, !isDesktop && { padding: 10, borderRadius: 8 }]}>
              {/* Header Banner: Deep Blue #0a3a72 matching PDF with Center Highway Slashes & Large Logo */}
              <View style={[styles.gcHeaderBanner, !isDesktop && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
                <View style={styles.brandRow}>
                  <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  <View style={styles.brandTextGroup}>
                    <Text style={styles.brandMainTitle}>NEW BALAJI TRANSPORTS</Text>
                    <Text style={styles.brandSubTitle}>Lorry Suppliers & Commission Agent</Text>
                  </View>
                </View>

                {/* Center Slanted Highway Slashes */}
                {isDesktop && (
                  <View style={styles.centerHighwaySlashes} pointerEvents="none">
                    <View style={styles.slashGold} />
                    <View style={styles.slashWhite} />
                  </View>
                )}

                <View style={[styles.headerRightArea, !isDesktop && { alignItems: 'flex-start', marginTop: 4 }]}>
                  <View style={[styles.addressDetails, !isDesktop && { alignItems: 'flex-start' }]}>
                    <Text style={styles.addressLineText}>{addressLine1}</Text>
                    <Text style={styles.addressLineText}>{addressLine2}</Text>
                    <Text style={styles.phoneNumbersText}>{phone1} | {phone2} | {phone3}</Text>
                    <Text style={styles.contactEmailText}>{email}</Text>
                    <Text style={styles.contactWebText}>{website}</Text>
                  </View>
                </View>
              </View>

              {/* Pill Banner */}
              <View style={styles.pillBannerContainer}>
                <View style={styles.pillBanner}>
                  <Text style={styles.pillBannerText}>GOODS CONSIGNMENT / CONSIGNEE COPY</Text>
                </View>
              </View>

              {/* Dotted Underline Input Form Fields */}
              <View style={styles.fieldsContainer}>
                {/* Row 1: G.C. Note No. | Truck No. | Date */}
                <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                  <View style={[styles.fieldBlock, { flex: 1.1 }]}>
                    <Text style={styles.fieldLabel}>G.C. Note No. :</Text>
                    <TextInput
                      style={[styles.fieldInput, styles.noteNumberInput]}
                      value={noteNumber}
                      editable={false}
                      placeholder="Auto"
                      placeholderTextColor="#dc2626"
                    />
                  </View>
                  <View style={[styles.fieldBlock, { flex: 1.1 }]}>
                    <Text style={styles.fieldLabel}>Truck No. :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={truckNumber}
                      onChangeText={setTruckNumber}
                      placeholder="e.g. TN 30 AX 1234"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={[styles.fieldBlock, { flex: 0.9 }]}>
                    <Text style={styles.fieldLabel}>Date :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={gcDate}
                      onChangeText={setGcDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Row 2: From | To */}
                <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                  <View style={[styles.fieldBlock, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>From :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={from}
                      onChangeText={setFrom}
                      placeholder="Source origin"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.fieldBlock, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>To :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={to}
                      onChangeText={setTo}
                      placeholder="Destination"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* Row 3: Consignor M/s. | GSTIN */}
                <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                  <View style={[styles.fieldBlock, { flex: 1.5 }]}>
                    <Text style={styles.fieldLabel}>Consignor M/s.</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={consignor}
                      onChangeText={setConsignor}
                      placeholder="Consignor Company / Name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.fieldBlock, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>GSTIN :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={consignorGst}
                      onChangeText={setConsignorGst}
                      placeholder="Consignor GSTIN"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* Row 4: Consignee M/s. | GSTIN */}
                <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                  <View style={[styles.fieldBlock, { flex: 1.5 }]}>
                    <Text style={styles.fieldLabel}>Consignee M/s.</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={consignee}
                      onChangeText={setConsignee}
                      placeholder="Consignee Company / Name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.fieldBlock, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>GSTIN :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={consigneeGst}
                      onChangeText={setConsigneeGst}
                      placeholder="Consignee GSTIN"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* Row 5: AS PER BILL NO. | Delivery at */}
                <View style={[styles.formRow, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                  <View style={[styles.fieldBlock, { flex: 1.2 }]}>
                    <Text style={styles.fieldLabel}>AS PER BILL NO.</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={billNumber}
                      onChangeText={setBillNumber}
                      placeholder="Invoice / Bill No."
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.fieldBlock, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Delivery at :</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={deliveryAt}
                      onChangeText={setDeliveryAt}
                      placeholder="e.g. Door Delivery"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>

              {/* Main Grid: Items Table + Amount Box */}
              <View style={[styles.mainTableContainer, !isDesktop && { flexDirection: 'column' }]}>
                {/* Left Table: Items */}
                <View style={[styles.itemsTableBox, !isDesktop && { width: '100%', marginBottom: 12 }]}>
                  <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={true} style={{ flexGrow: 0 }}>
                    <View style={!isDesktop ? { width: 560 } : { width: '100%' }}>
                      <View style={styles.itemsHeaderRow}>
                        <Text style={[styles.itemsHeaderCell, styles.colArticles]}>No. of{"\n"}Articles</Text>
                        <Text style={[styles.itemsHeaderCell, styles.colDesc]}>Description of Goods{"\n"}(Said to Contain)</Text>
                        <Text style={[styles.itemsHeaderCell, styles.colWeight]}>Weight</Text>
                      </View>

                      {items.map((item, index) => (
                        <View key={index} style={styles.itemsDataRow}>
                          <TextInput
                            style={[styles.itemsInputCell, styles.colArticles, { textAlign: 'center' }]}
                            value={item.articlesCount}
                            onChangeText={(val) => updateItemField(index, 'articlesCount', val)}
                            placeholder=""
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.itemsInputCell, styles.colDesc, { paddingLeft: 8 }]}
                            value={item.description}
                            onChangeText={(val) => updateItemField(index, 'description', val)}
                            placeholder={`Item ${index + 1}`}
                            placeholderTextColor="#cbd5e1"
                          />
                          <TextInput
                            style={[styles.itemsInputCell, styles.colWeight, { textAlign: 'right', paddingRight: 8 }]}
                            value={item.weight}
                            onChangeText={(val) => updateItemField(index, 'weight', val)}
                            placeholder="0.00"
                            placeholderTextColor="#cbd5e1"
                            keyboardType="numeric"
                          />
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Right Table: Amount Box */}
                <View style={[styles.amountPanelBox, !isDesktop && { width: '100%' }]}>
                  <View style={styles.amountHeaderRow}>
                    <Text style={styles.amountHeaderTitle}>AMOUNT</Text>
                    <Text style={styles.amountHeaderRs}>Rs.</Text>
                    <Text style={styles.amountHeaderPs}>Ps.</Text>
                  </View>

                  <View style={styles.amountDataRow}>
                    <Text style={styles.amountRowLabel}>Freight</Text>
                    <TextInput
                      style={styles.amountValueInput}
                      value={freight}
                      onChangeText={setFreight}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.amountPsLabel}>{formatRupeeParts(freight).ps || '00'}</Text>
                  </View>

                  <View style={styles.amountDataRow}>
                    <Text style={styles.amountRowLabel}>CGST</Text>
                    <TextInput
                      style={styles.amountValueInput}
                      value={cgstAmount > 0 ? cgstAmount.toFixed(2) : ''}
                      onChangeText={(val) => setCgstPercent(fValue > 0 ? (Number(val) / fValue) * 100 : 0)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.amountPsLabel}>{formatRupeeParts(cgstAmount).ps || '00'}</Text>
                  </View>

                  <View style={styles.amountDataRow}>
                    <Text style={styles.amountRowLabel}>SGST</Text>
                    <TextInput
                      style={styles.amountValueInput}
                      value={sgstAmount > 0 ? sgstAmount.toFixed(2) : ''}
                      onChangeText={(val) => setSgstPercent(fValue > 0 ? (Number(val) / fValue) * 100 : 0)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.amountPsLabel}>{formatRupeeParts(sgstAmount).ps || '00'}</Text>
                  </View>

                  <View style={styles.amountDataRow}>
                    <Text style={styles.amountRowLabel}>IGST</Text>
                    <TextInput
                      style={styles.amountValueInput}
                      value={igstAmount > 0 ? igstAmount.toFixed(2) : ''}
                      onChangeText={(val) => setIgstPercent(fValue > 0 ? (Number(val) / fValue) * 100 : 0)}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.amountPsLabel}>{formatRupeeParts(igstAmount).ps || '00'}</Text>
                  </View>

                  <View style={[styles.amountDataRow, styles.totalAmountRow]}>
                    <Text style={[styles.amountRowLabel, { fontWeight: '900' }]}>Total</Text>
                    <Text style={[styles.amountValueInput, styles.readOnlyAmount]}>{formatRequiredRupeeParts(grandTotal).rs}</Text>
                    <Text style={[styles.amountPsLabel, { fontWeight: '900' }]}>{formatRequiredRupeeParts(grandTotal).ps}</Text>
                  </View>

                  <View style={styles.amountDataRow}>
                    <Text style={styles.amountRowLabel}>Less Advance</Text>
                    <TextInput
                      style={styles.amountValueInput}
                      value={lessAdvance}
                      onChangeText={setLessAdvance}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.amountPsLabel}>{formatRupeeParts(lessAdvance).ps || '00'}</Text>
                  </View>

                  <View style={[styles.amountDataRow, styles.balanceAmountRow]}>
                    <Text style={[styles.amountRowLabel, { fontWeight: '900', color: '#0b2c6d' }]}>Balance</Text>
                    <Text style={[styles.amountValueInput, styles.readOnlyAmount, { color: '#0b2c6d' }]}>{formatRequiredRupeeParts(balanceDue).rs}</Text>
                    <Text style={[styles.amountPsLabel, { fontWeight: '900', color: '#0b2c6d' }]}>{formatRequiredRupeeParts(balanceDue).ps}</Text>
                  </View>

                  <View style={styles.amountDataRow}>
                    <Text style={styles.amountRowLabel}>Payable at</Text>
                    <TextInput
                      style={[styles.amountValueInput, { flex: 1.5, textAlign: 'left', paddingHorizontal: 6 }]}
                      value={payableAt}
                      onChangeText={setPayableAt}
                      placeholder="Location"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>

              {/* Value Rs. & Payment Type Checkboxes */}
              <View style={styles.valueAndPaymentRow}>
                <View style={styles.valueRowBlock}>
                  <Text style={styles.valueRowLabel}>Value Rs.</Text>
                  <TextInput
                    style={styles.valueRowInput}
                    value={valueRs}
                    onChangeText={setValueRs}
                    placeholder="Enter declared value"
                    placeholderTextColor="#94a3b8"
                    editable={true}
                  />
                </View>

                <View style={styles.paymentCheckboxesGroup}>
                  {(['TBB', 'TO_PAY', 'PAID'] as const).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.paymentCheckItem}
                      onPress={() => setPaymentType(opt)}
                    >
                      <View style={[styles.checkSquare, paymentType === opt && styles.checkSquareActive]}>
                        {paymentType === opt && <MaterialIcons name="check" size={12} color="#ffffff" />}
                      </View>
                      <Text style={styles.checkText}>{opt === 'TO_PAY' ? 'TO PAY' : opt}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.rsAmountLabel}>Rs. {formatRequiredRupeeParts(grandTotal).rs}.{formatRequiredRupeeParts(grandTotal).ps}</Text>
                </View>
              </View>

              {/* GST Tax Pay & Company Signature Title */}
              <View style={styles.gstTaxAndCompanyRow}>
                <View style={styles.gstTaxGroup}>
                  <Text style={styles.gstTaxLabel}>GST TAX PAY :</Text>
                  {(['Transport', 'Consignor', 'Consignee'] as const).map((payee) => (
                    <TouchableOpacity
                      key={payee}
                      style={styles.paymentCheckItem}
                      onPress={() => setTaxPayee(payee)}
                    >
                      <View style={[styles.checkSquare, taxPayee === payee && styles.checkSquareActive]}>
                        {taxPayee === payee && <MaterialIcons name="check" size={12} color="#ffffff" />}
                      </View>
                      <Text style={styles.checkText}>{payee}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.forCompanyTitleBox}>
                  <Text style={styles.forCompanyTitle}>For NEW BALAJI TRANSPORTS</Text>
                  <Image
                    source={{ uri: nbtAuthorisedSignatureBase64 }}
                    style={styles.forCompanySignature}
                    resizeMode="contain"
                    accessibilityLabel="Authorised signature"
                  />
                  <Text style={styles.forCompanySignatory}>Authorised Signatory</Text>
                </View>
              </View>

              {/* Bank Details & GST Box Card */}
              <View style={[styles.bankGstCard, !isDesktop && { flexDirection: 'column', gap: 10 }]}>
                <View style={styles.bankCardCol}>
                  <Text style={styles.bankCardTitle}>New Balaji Transports - Karur Vysya Bank</Text>
                  <View style={styles.bankDetailLine}>
                    <Text style={styles.bankFieldKey}>C/Account No. :</Text>
                    <TextInput style={styles.bankFieldValueInput} value={bankAccountNumber} onChangeText={setBankAccountNumber} />
                  </View>
                  <View style={styles.bankDetailLine}>
                    <Text style={styles.bankFieldKey}>IFSC Code :</Text>
                    <TextInput style={styles.bankFieldValueInput} value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" />
                  </View>
                  <View style={styles.bankDetailLine}>
                    <Text style={styles.bankFieldKey}>Branch :</Text>
                    <TextInput style={styles.bankFieldValueInput} value={bankBranch} onChangeText={setBankBranch} />
                  </View>
                </View>

                {isDesktop && <View style={styles.cardVerticalDivider} />}

                <View style={styles.gstCardCol}>
                  <View style={styles.gstDetailLine}>
                    <Text style={styles.gstKeyText}>GSTIN</Text>
                    <TextInput style={styles.gstValueInput} value={gstinNumber} onChangeText={setGstinNumber} autoCapitalize="characters" />
                  </View>
                  <View style={styles.gstDetailLine}>
                    <Text style={styles.gstKeyText}>PAN No.</Text>
                    <TextInput style={styles.gstValueInput} value={panNumber} onChangeText={setPanNumber} autoCapitalize="characters" />
                  </View>
                </View>
              </View>

              {/* Disclaimer */}
              <Text style={styles.disclaimerText}>
                These Goods are Booked at Owners risk and Insured by Consignor / Consignee. Subject to Salem Jurisdiction only.
              </Text>
              <Text style={[styles.disclaimerText, { marginTop: 4 }]}>
                Certified that the service provided is by a Goods Transport Agency (GTA). GST on this service is payable by the Recipient (Consignee) under Reverse Charge Mechanism (RCM) pursuant to Notification No. 13/2017-Central Tax (Rate), and no tax has been charged by the transporter.
              </Text>

              {/* Driver & Lorry Owner Signatures Row */}
              <View style={[styles.signatureFieldsRow, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                <View style={styles.sigFieldBlock}>
                  <Text style={styles.sigLabelText}>Driver's Signature :</Text>
                  <TextInput
                    style={styles.sigInputText}
                    value={driverSignature}
                    onChangeText={setDriverSignature}
                    placeholder=""
                  />
                </View>
                <View style={styles.sigFieldBlock}>
                  <Text style={styles.sigLabelText}>Driver's Name :</Text>
                  <TextInput
                    style={styles.sigInputText}
                    value={driverName}
                    onChangeText={setDriverName}
                    placeholder="Name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.sigFieldBlock}>
                  <Text style={styles.sigLabelText}>DL No. :</Text>
                  <TextInput
                    style={styles.sigInputText}
                    value={dlNumber}
                    onChangeText={setDlNumber}
                    placeholder="License #"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.sigFieldBlock}>
                  <Text style={styles.sigLabelText}>Lorry Owner :</Text>
                  <TextInput
                    style={styles.sigInputText}
                    value={lorryOwner}
                    onChangeText={setLorryOwner}
                    placeholder="Owner"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Highway Road Decoration Strip at Bottom */}
              <View style={styles.highwayBottomStrip}>
                <View style={styles.highwayDashesRow}>
                  {Array.from({ length: 32 }).map((_, i) => (
                    <View key={i} style={styles.highwayYellowDash} />
                  ))}
                </View>
              </View>
            </View>

            {/* Bottom Action Buttons */}
            <View style={[styles.formBottomBar, !isDesktop && { flexDirection: 'column', gap: 10 }]}>
              <TouchableOpacity
                style={[styles.actionBtnLarge, editingGcId ? styles.updateBtnStyle : styles.saveBtnStyle, loading && { opacity: 0.6 }]}
                onPress={handleSaveGC}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialIcons name={editingGcId ? "check-circle" : "save"} size={18} color="#ffffff" />
                    <Text style={styles.actionBtnLargeText}>{editingGcId ? "UPDATE GC NOTE" : "SAVE NOTE"}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnLarge, styles.downloadBtnStyle]}
                onPress={handleDownloadCurrentForm}
              >
                <MaterialIcons name="file-download" size={18} color="#ffffff" />
                <Text style={styles.actionBtnLargeText}>DOWNLOAD PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnLarge, styles.printBtnStyle]}
                onPress={handlePrintCurrentForm}
              >
                <MaterialIcons name="print" size={18} color="#ffffff" />
                <Text style={styles.actionBtnLargeText}>PRINT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        // GC ARCHIVE TAB
        <View style={{ flex: 1 }}>
          <View style={styles.archiveHeader}>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color={COLORS.outline} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by Note #, Lorry, Party..."
                placeholderTextColor={COLORS.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.monthListContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChipsRow}>
              {activeMonths.length === 0 ? (
                <Text style={styles.noDataText}>No records archived</Text>
              ) : (
                activeMonths.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthChip, selectedMonth === m && styles.monthChipActive]}
                    onPress={() => setSelectedMonth(m)}
                  >
                    <Text style={[styles.monthChipText, selectedMonth === m && styles.monthChipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          {filteredNotes.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{selectedMonth} Financial aggregates</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL NOTES</Text>
                  <Text style={styles.summaryVal}>{filteredNotes.length}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL FREIGHT</Text>
                  <Text style={styles.summaryVal}>₹{totalFreight.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL GST</Text>
                  <Text style={styles.summaryVal}>₹{totalGst.toLocaleString()}</Text>
                </View>
              </View>
              <View style={[styles.summaryGrid, { marginTop: 10 }]}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL WEIGHT</Text>
                  <Text style={styles.summaryVal}>{totalWeight.toFixed(2)} Tons</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL REVENUE</Text>
                  <Text style={[styles.summaryVal, { color: COLORS.success }]}>₹{totalAmount.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
          ) : filteredNotes.length === 0 ? (
            <View style={styles.centerBox}>
              <MaterialIcons name="inventory" size={64} color={COLORS.outline} />
              <Text style={styles.emptyTitle}>No GC notes found</Text>
              <Text style={styles.emptyDesc}>Create a consignment copy to start the archive.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredNotes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.gcCard}>
                  <View style={styles.gcCardHeader}>
                    <Text style={styles.gcNoteId}>{item.noteNumber || item.id}</Text>
                    <Text style={styles.gcDate}>{item.date}</Text>
                  </View>
                  <View style={styles.gcRoute}>
                    <Text style={styles.gcRouteText}>{item.from} → {item.to}</Text>
                    <Text style={styles.gcTruck}>{item.truckNumber}</Text>
                  </View>
                  <View style={styles.gcParties}>
                    <Text style={styles.gcPartyText}><Text style={{ fontWeight: 'bold' }}>Shipper:</Text> {item.consignor}</Text>
                    <Text style={styles.gcPartyText}><Text style={{ fontWeight: 'bold' }}>Consignee:</Text> {item.consignee}</Text>
                  </View>
                  <View style={styles.gcFooter}>
                    <Text style={styles.gcFreight}>Freight: <Text style={{ color: COLORS.primary }}>₹{Number(item.freight || 0).toLocaleString()}</Text></Text>
                    <Text style={styles.gcFreight}>Total: <Text style={{ color: COLORS.success }}>₹{Number(item.total || 0).toLocaleString()}</Text></Text>
                    <Text style={styles.gcWeight}>
                      Wt: {(item.items || []).reduce((s, i) => s + (Number(i.weight) || 0), 0).toFixed(2)} T
                    </Text>
                    {item.paymentType ? (
                      <Text style={[styles.gcWeight, { color: COLORS.secondary, fontWeight: 'bold' }]}>{item.paymentType}</Text>
                    ) : null}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={async () => { await db.togglePinGc(item.id); fetchGcNotes(); }}>
                      <MaterialIcons name="push-pin" size={16} color={item.isPinned ? '#d97706' : COLORS.textMuted} />
                      <Text style={[styles.actionBtnText, { color: item.isPinned ? '#d97706' : COLORS.textMuted }]}>{item.isPinned ? 'UNPIN' : 'PIN'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]} onPress={() => handleEditGc(item)}>
                      <MaterialIcons name="edit" size={16} color="#2563eb" />
                      <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>EDIT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownloadPDF(item.id, item)}>
                      <MaterialIcons name="file-download" size={16} color="#0e7490" />
                      <Text style={[styles.actionBtnText, { color: '#0e7490' }]}>PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handlePrintPDF(item.id, item)}>
                      <MaterialIcons name="print" size={16} color={COLORS.secondary} />
                      <Text style={styles.actionBtnText}>PRINT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(item)}>
                      <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                      <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>DUPLICATE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteGcNote(item.id, item.noteNumber)}>
                      <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                      <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>DELETE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={{ padding: SPACING.gutter, paddingBottom: 120 }}
            />
          )}
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        transparent
        visible={confirmModal.visible}
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[
              styles.modalIconCircle,
              confirmModal.type === 'danger' && { backgroundColor: '#fee2e2' },
              confirmModal.type === 'success' && { backgroundColor: '#d1fae5' },
              confirmModal.type === 'info' && { backgroundColor: '#e0f2fe' },
            ]}>
              <MaterialIcons
                name={
                  confirmModal.type === 'danger' ? 'delete-forever' :
                    confirmModal.type === 'success' ? 'check-circle' : 'info'
                }
                size={36}
                color={
                  confirmModal.type === 'danger' ? '#dc2626' :
                    confirmModal.type === 'success' ? '#059669' : '#0284c7'
                }
              />
            </View>

            <Text style={styles.modalTitle}>{confirmModal.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal.message}</Text>

            <View style={styles.modalBtnRow}>
              {confirmModal.cancelText ? (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.modalCancelBtnText}>{confirmModal.cancelText}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  confirmModal.type === 'danger' && { backgroundColor: '#dc2626' },
                  confirmModal.type === 'success' && { backgroundColor: '#059669' },
                  confirmModal.type === 'info' && { backgroundColor: COLORS.primary },
                ]}
                onPress={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  else setConfirmModal(prev => ({ ...prev, visible: false }));
                }}
              >
                <Text style={styles.modalConfirmBtnText}>{confirmModal.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={deleteModalVisible}
        title="Delete GC Note"
        message="Are you sure you want to permanently delete this GC note? This action cannot be undone."
        itemLabel={deletingGcId?.label}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteGcNote}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingGcId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.secondary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: SPACING.gutter,
    paddingBottom: 96,
  },
  gcWrapper: {
    flex: 1,
    paddingBottom: 48,
  },
  editingBanner: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
    ...SHADOWS.light,
  },
  editingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  editingBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  editingBannerSub: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 2,
  },
  cancelEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelEditBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
  },

  // Design 3 Highway Layout Styles
  gcPage: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 20,
    ...SHADOWS.medium,
  },
  gcHeaderBanner: {
    backgroundColor: '#0a3a72',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 2,
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandMainTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  brandSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a8c6ed',
    marginTop: 3,
  },
  centerHighwaySlashes: {
    position: 'absolute',
    left: '52%',
    top: -20,
    bottom: -20,
    width: 80,
    overflow: 'hidden',
    zIndex: 1,
  },
  slashGold: {
    position: 'absolute',
    left: 8,
    top: -20,
    width: 24,
    height: 150,
    backgroundColor: '#f2a800',
    transform: [{ skewX: '-24deg' }],
  },
  slashWhite: {
    position: 'absolute',
    left: 42,
    top: -20,
    width: 6,
    height: 150,
    backgroundColor: '#ffffff',
    transform: [{ skewX: '-24deg' }],
  },
  headerRightArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 2,
  },
  addressDetails: {
    alignItems: 'flex-end',
  },
  addressLineText: {
    fontSize: 9.5,
    color: '#ffffff',
    fontWeight: '500',
    lineHeight: 14,
  },
  phoneNumbersText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#f2a800',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  contactEmailText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#a8c6ed',
    marginTop: 1,
  },
  contactWebText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#a8c6ed',
  },

  // Pill Banner
  pillBannerContainer: {
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  pillBanner: {
    alignSelf: 'flex-start',
    backgroundColor: '#f2a800',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pillBannerText: {
    color: '#0a3a72',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Fields Form Section
  fieldsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#93c5fd',
    borderStyle: 'dashed',
    paddingBottom: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b2c6d',
    marginRight: 6,
  },
  fieldInput: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 2,
    paddingHorizontal: 4,
    height: 26,
  },
  noteNumberInput: {
    color: '#dc2626',
    fontWeight: '900',
  },

  // Main Table Container
  mainTableContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  itemsTableBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRightWidth: Platform.OS === 'web' ? 0 : 1.5,
    backgroundColor: '#ffffff',
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  itemsHeaderCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0b2c6d',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1.5,
    borderRightColor: '#2563eb',
  },
  itemsDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    minHeight: 28,
  },
  itemsInputCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRightWidth: 1.5,
    borderRightColor: '#2563eb',
  },
  colArticles: {
    width: 80,
  },
  colDesc: {
    flex: 1,
  },
  colWeight: {
    width: 90,
  },

  // Amount Panel Box
  amountPanelBox: {
    width: 250,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
  },
  amountHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0b2c6d',
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  amountHeaderTitle: {
    flex: 1.2,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  amountHeaderRs: {
    width: 60,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  amountHeaderPs: {
    width: 32,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  amountDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    minHeight: 27,
  },
  amountRowLabel: {
    flex: 1.2,
    fontSize: 10,
    fontWeight: '700',
    color: '#0b2c6d',
  },
  amountValueInput: {
    width: 60,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'right',
    paddingVertical: 2,
    paddingHorizontal: 4,
    height: 24,
  },
  amountPsLabel: {
    width: 32,
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  totalAmountRow: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#2563eb',
  },
  balanceAmountRow: {
    backgroundColor: '#eff6ff',
    borderTopWidth: 1,
    borderTopColor: '#2563eb',
  },
  readOnlyAmount: {
    fontWeight: '900',
  },

  // Value & Payment
  valueAndPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#93c5fd',
    borderStyle: 'dashed',
    paddingBottom: 4,
    marginBottom: 8,
  },
  valueRowBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  valueRowLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b2c6d',
    marginRight: 8,
  },
  valueRowInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    height: 26,
    paddingVertical: 2,
  },
  paymentCheckboxesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  paymentCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkSquare: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#0b2c6d',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkSquareActive: {
    backgroundColor: '#0b2c6d',
  },
  checkText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0b2c6d',
  },
  rsAmountLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b2c6d',
    marginLeft: 6,
  },

  // GST Tax & Company Signature
  gstTaxAndCompanyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gstTaxGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gstTaxLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0b2c6d',
  },
  forCompanyTitleBox: {
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0b2c6d',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexShrink: 0,
  },
  forCompanyTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0b2c6d',
  },
  forCompanySignature: {
    width: 64,
    height: 34,
  },
  forCompanySignatory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0b2c6d',
  },

  // Bank & GST Card
  bankGstCard: {
    flexDirection: 'row',
    backgroundColor: '#edf5fd',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  bankCardCol: {
    flex: 1.3,
  },
  bankCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b2c6d',
    marginBottom: 4,
  },
  bankDetailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  bankFieldKey: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    width: 95,
  },
  bankFieldValueInput: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
    height: 22,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  cardVerticalDivider: {
    width: 1.5,
    backgroundColor: '#93c5fd',
    height: '80%',
    marginHorizontal: 16,
  },
  gstCardCol: {
    flex: 1,
    justifyContent: 'center',
  },
  gstDetailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gstKeyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0b2c6d',
    width: 65,
  },
  gstValueInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#0b2c6d',
    height: 24,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },

  // Disclaimer
  disclaimerText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
  },

  // Signatures Row
  signatureFieldsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  sigFieldBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#93c5fd',
    borderStyle: 'dashed',
    paddingBottom: 2,
  },
  sigLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0b2c6d',
    marginRight: 4,
  },
  sigInputText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0f172a',
    height: 24,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },

  // Highway Bottom Strip
  highwayBottomStrip: {
    height: 14,
    backgroundColor: '#0b2c6d',
    borderRadius: 2,
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 6,
  },
  highwayDashesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  highwayYellowDash: {
    width: 18,
    height: 3,
    backgroundColor: '#f59e0b',
    borderRadius: 1,
  },

  // Bottom Actions
  formBottomBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 24,
  },
  actionBtnLarge: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    ...SHADOWS.light,
  },
  saveBtnStyle: {
    backgroundColor: '#047857',
  },
  updateBtnStyle: {
    backgroundColor: '#2563eb',
  },
  downloadBtnStyle: {
    backgroundColor: '#0e7490',
  },
  printBtnStyle: {
    backgroundColor: '#6d28d9',
  },
  actionBtnLargeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // Archive Styles
  archiveHeader: {
    padding: SPACING.gutter,
    backgroundColor: COLORS.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 13,
    color: COLORS.textDark,
  },
  monthListContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingVertical: 8,
  },
  monthChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  monthChip: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  monthChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  monthChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  summaryCard: {
    margin: SPACING.gutter,
    marginBottom: 4,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 8,
    padding: 16,
    ...SHADOWS.light,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 6,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    marginTop: 64,
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
  noDataText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  gcCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.light,
  },
  gcCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    paddingBottom: 8,
    marginBottom: 8,
  },
  gcNoteId: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  gcDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  gcRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gcRouteText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  gcTruck: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  gcParties: {
    gap: 2,
    marginBottom: 8,
  },
  gcPartyText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  gcFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    paddingTop: 8,
    marginTop: 4,
  },
  gcFreight: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  gcWeight: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerLow,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },

  // Modal Dialogs
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  modalConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
