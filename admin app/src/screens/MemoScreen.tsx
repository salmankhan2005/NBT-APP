import React, { type Component, type ComponentType, type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { COLORS, SHADOWS, SPACING } from '../theme';
import nbtAuthorisedSignatureBase64 from '../nbtSignatureBase64';
import { db, MemoDocument } from '../db/database';

const A4_RATIO = 210 / 297;
const PAGE_FILENAME_PREFIX = 'NBT_Memo';
const isWeb = Platform.OS === 'web';
const AnyWebView = WebView as any;
const FileSystemCompat = FileSystem as unknown as {
  cacheDirectory: string;
  copyAsync(options: { from: string; to: string }): Promise<void>;
};

const formatMemoPreview = (html: string) => {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 120 ? `${text.slice(0, 120).trim()}...` : text;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildMemoDocumentHtml = (date: string, contentHtml: string, editorMode = false) => {
  const safeDate = escapeHtml(date);
  const safeContent = contentHtml || '<div><br></div>';
  const editableAttributes = editorMode ? 'contenteditable="true" spellcheck="true"' : '';
  const editableDateAttributes = editorMode ? 'contenteditable="true" spellcheck="false"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #08124a;
      font-family: 'Helvetica', Arial, sans-serif;
      overflow: auto;
    }
    body {
      display: block;
      line-height: 1.4;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .page {
      width: 100%;
      max-width: 210mm;
      min-height: 277mm;
      padding: 12mm;
      background: #ffffff;
      border: 3px solid #102168;
      border-radius: 8px;
      position: relative;
      page-break-inside: avoid;
      overflow: visible;
      margin: 0 auto;
    }
    @media print {
      html, body {
        width: auto;
        min-height: auto;
        background: #ffffff;
        overflow: visible;
      }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page {
        width: 100%;
        max-width: none;
        min-height: 0;
        margin: 0;
        border-radius: 0;
        border-width: 2px;
      }
    }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .logo-area { width: 92px; min-width: 92px; }
    .logo-circle { width: 92px; height: 92px; border: 3px solid #102168; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px; box-sizing: border-box; text-align: center; }
    .logo-mark { font-size: 24px; font-weight: 900; letter-spacing: 0.14em; }
    .logo-text { font-size: 8px; line-height: 1.2; font-weight: 700; margin-top: 4px; letter-spacing: 0.1em; }
    .logo-sub { font-size: 6px; line-height: 1.2; margin-top: 2px; font-weight: 700; letter-spacing: 0.08em; opacity: 0.9; }
    .header-center { text-align: center; flex: 1; }
    .signed-by { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; margin-bottom: 2px; }
    .company-name { font-size: 30px; font-weight: 900; letter-spacing: 0.12em; margin: 0; line-height: 1.05; }
    .company-subtitle { font-size: 13px; margin: 4px 0 0; font-style: italic; line-height: 1.1; }
    .address { font-size: 11px; line-height: 1.5; margin-top: 8px; color: #102168; }
    .contact-right { min-width: 132px; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
    .contact-block { display: flex; align-items: flex-start; gap: 8px; }
    .phone-circle { width: 26px; height: 26px; border: 2px solid #102168; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; }
    .contact-text { display: flex; flex-direction: column; align-items: flex-end; font-size: 11px; line-height: 1.2; color: #102168; }
    .contact-label { font-weight: 700; }
    .contact-value { font-size: 13px; font-weight: 700; }
    .divider-row { position: relative; margin-top: 14px; padding-top: 16px; }
    .divider-line { position: absolute; left: 0; right: 0; top: 12px; border-top: 2px solid #102168; }
    .memo-badge { position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%); background: #ffffff; border: 2px solid #102168; border-radius: 12px; padding: 4px 18px; font-size: 12px; font-weight: 900; letter-spacing: 0.12em; }
    .body { margin-top: 14mm; display: flex; flex-direction: column; min-height: calc(100% - 104mm); }
    .date-row { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 12px; }
    .date-label { font-weight: 700; }
    .date-value { min-width: 140px; border-bottom: 1px solid #102168; padding-bottom: 2px; }
    .editable-area {
      flex: 1;
      outline: none;
      font-size: 12px;
      line-height: 1.7;
      min-height: 100px;
      max-height: none;
      overflow: visible;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .editable-area:empty::before { content: 'Type memo content here...'; color: #94a3b8; }
    .memo-content p { margin: 0 0 10px; }
    .memo-content { word-break: break-word; overflow-wrap: anywhere; }
    .footer { display: flex; justify-content: flex-end; margin-top: 10mm; }
    .signature-block { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; max-width: 140px; }
    .signature-caption { font-size: 10px; font-weight: 900; letter-spacing: 0.08em; }
    .signature-img { width: 120px; height: auto; display: block; }
    .signatory-text { font-size: 10px; letter-spacing: 0.08em; margin-top: 2px; }
    @media print { body { background: #ffffff; } .page { border-color: #102168; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-top">
      <div class="logo-area">
        <div class="logo-circle">
          <div class="logo-mark">NBT</div>
          <div class="logo-text">NEW BALAJI TRANSPORTS</div>
          <div class="logo-sub">LOGISTICS SOLUTIONS SINCE 2010</div>
        </div>
      </div>
      <div class="header-center">
        <div class="signed-by">Sri Ramajayam</div>
        <div class="company-name">NEW BALAJI TRANSPORTS</div>
        <div class="company-subtitle">(Lorry Suppliers & Commission Agent)</div>
        <div class="address">
          3/131, V.K.V. Complex, 1st Floor,<br />
          Bangalore Bye Pass Road,<br />
          Post - Kandampatty, Salem - 636 005. (TN)
        </div>
      </div>
      <div class="contact-right">
        <div class="contact-block">
          <span class="phone-circle">📞</span>
          <div class="contact-text">
            <span class="contact-label">Cell :</span>
            <span class="contact-value">94433-51789</span>
            <span class="contact-value">93622-51789</span>
          </div>
        </div>
        <div class="contact-block">
          <span class="phone-circle">📞</span>
          <div class="contact-text">
            <span class="contact-label">Offi. :</span>
            <span class="contact-value">2225575</span>
            <span class="contact-value">2225576</span>
          </div>
        </div>
      </div>
    </div>
    <div class="divider-row">
      <div class="divider-line"></div>
      <div class="memo-badge">MEMO</div>
    </div>
    <div class="body">
      <div class="date-row">
        <span class="date-label">Date :</span>
        <div id="dateField" class="date-value" ${editableDateAttributes}>${safeDate}</div>
      </div>
      <div id="memoEditor" class="editable-area memo-content" ${editableAttributes}>${safeContent}</div>
      <div class="footer">
        <div class="signature-block">
          <div class="signature-caption">For NEW BALAJI TRANSPORTS</div>
          <img class="signature-img" src="${nbtAuthorisedSignatureBase64}" alt="Authorised Signature" />
          <div class="signatory-text">Authorised Signatory</div>
        </div>
      </div>
    </div>
  </div>
  ${
    editorMode
      ? `<script>
    const editor = document.getElementById('memoEditor');
    const dateField = document.getElementById('dateField');

    const sendState = () => {
      const html = editor.innerHTML;
      const memoDate = dateField.innerText.replace(/[\u200B]/g, '').trim() || '${safeDate}';
      const overflow = editor.scrollHeight > editor.clientHeight;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentChange', html, date: memoDate, overflow }));
    };

    const applyCommand = (command, value) => {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(command, false, value || null);
      editor.focus();
      sendState();
    };

    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : JSON.parse(event.data.data);
        if (data.type === 'command') {
          applyCommand(data.command, data.value);
          return;
        }
        if (data.type === 'setData') {
          dateField.innerText = data.date || '${safeDate}';
          editor.innerHTML = data.html || '<div><br></div>';
          sendState();
        }
      } catch (error) {
        // ignore malformed messages
      }
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    editor.addEventListener('input', sendState);
    dateField.addEventListener('input', sendState);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>`
      : ''
  }
</body>
</html>`;
};

const buildMemoHtml = (date: string, contentHtml: string) => buildMemoDocumentHtml(date, contentHtml, false);

const openWebMemoPrintPreview = async (html: string) => {
  if (!isWeb || typeof window === 'undefined') return false;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Memo print fallback failed', error);
      Alert.alert('Print failed', 'Unable to open memo preview.');
    }
    return false;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  const checkReady = window.setInterval(() => {
    if (printWindow.document.readyState === 'complete') {
      window.clearInterval(checkReady);
      try {
        printWindow.focus();
        printWindow.print();
      } catch (error) {
        console.warn('Memo print window failed', error);
      }
    }
  }, 100);
  return true;
};

const downloadWebMemoAsPdf = (html: string, filename: string) => {
  if (typeof window === 'undefined') return;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.title = filename;
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      try {
        printWin.print();
      } catch (e) {
        console.warn('Print preview error:', e);
      }
    }, 400);
  }
};

const MemoScreen = () => {
  const { width } = useWindowDimensions();
  const webViewRef = useRef<any>(null);
  const webEditorRef = useRef<any>(null);
  const webDateRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'EDITOR' | 'ARCHIVE'>('EDITOR');
  const [memoId, setMemoId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [contentHtml, setContentHtml] = useState('<div><br></div>');
  const [memoDocuments, setMemoDocuments] = useState<MemoDocument[]>([]);
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebReady, setIsWebReady] = useState(false);
  const [isWebTyping, setIsWebTyping] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
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
    onConfirm: () => void,
    type: 'danger' | 'success' | 'info' = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
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

  const isDesktop = width >= 880;
  const pageWidth = Math.min(Math.max(width - 24, 280), 760);
  const pageHeight = pageWidth / A4_RATIO;

  const loadMemoDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await db.getMemoDocuments();
      setMemoDocuments(docs);
    } catch (error) {
      console.warn('Failed to load memo documents', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemoDocuments();
    createNewMemo();
  }, []);

  const generateMemoId = () => {
    const next = memoDocuments.length + 1;
    const candidate = `MEM-${String(next).padStart(4, '0')}`;
    if (memoDocuments.some((doc) => doc.memoId === candidate)) {
      return `MEM-${String(memoDocuments.length + 1).padStart(4, '0')}`;
    }
    return candidate;
  };

  const createNewMemo = () => {
    const nextId = generateMemoId();
    setSelectedMemoId(null);
    setMemoId(nextId);
    const freshDate = new Date().toISOString().split('T')[0];
    setDate(freshDate);
    setContentHtml('<div><br></div>');
    setIsOverflowing(false);
    setTimeout(() => {
      if (isWebReady) {
        sendMessageToEditor({ type: 'setData', date: freshDate, html: '<div><br></div>' });
      }
      if (isWeb && webEditorRef.current) {
        webEditorRef.current.innerHTML = '<div><br></div>';
      }
      if (isWeb && webDateRef.current) {
        webDateRef.current.innerText = freshDate;
      }
    }, 100);
  };

  const openMemoForEdit = async (memo: MemoDocument) => {
    setActiveTab('EDITOR');
    setSelectedMemoId(memo.memoId);
    setMemoId(memo.memoId);
    setDate(memo.date);
    setContentHtml(memo.contentHtml || '<div><br></div>');
    setIsOverflowing(false);
    setTimeout(() => {
      if (isWebReady) {
        sendMessageToEditor({ type: 'setData', date: memo.date, html: memo.contentHtml || '<div><br></div>' });
      }
      if (isWeb && webEditorRef.current) {
        webEditorRef.current.innerHTML = memo.contentHtml || '<div><br></div>';
      }
      if (isWeb && webDateRef.current) {
        webDateRef.current.innerText = memo.date;
      }
    }, 100);
  };

  const sendMessageToEditor = (payload: Record<string, any>) => {
    const json = JSON.stringify(payload);
    if (webViewRef.current) {
      webViewRef.current.postMessage(json);
    }
  };

  const handleEditorMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setIsWebReady(true);
        sendMessageToEditor({ type: 'setData', date, html: contentHtml });
        return;
      }
      if (data.type === 'contentChange') {
        setContentHtml(data.html || '<div><br></div>');
        setDate(data.date || date);
        setIsOverflowing(Boolean(data.overflow));
      }
    } catch (error) {
      console.warn('Invalid editor message', error);
    }
  };

  const applyWebFontSize = (size: number) => {
    if (!isWeb || !webEditorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!range) return;
    if (range.collapsed) {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, '4');
      const editor = webEditorRef.current;
      const lastFont = editor.querySelector('font[size="4"]');
      if (lastFont) {
        lastFont.style.fontSize = `${size}px`;
        lastFont.removeAttribute('size');
      }
      setContentHtml(editor.innerHTML || '<div><br></div>');
      return;
    }
    const span = document.createElement('span');
    span.style.fontSize = `${size}px`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.setEndAfter(span);
    selection.addRange(newRange);
    setContentHtml(webEditorRef.current.innerHTML || '<div><br></div>');
    webEditorRef.current.focus();
  };

  const executeEditorCommand = (command: string, value?: string) => {
    if (isWeb) {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(command, false, value || undefined);
      webEditorRef.current?.focus();
      setContentHtml(webEditorRef.current?.innerHTML ?? '<div><br></div>');
      return;
    }
    sendMessageToEditor({ type: 'command', command, value });
  };

  const focusWebEditor = () => {
    if (isWeb && webEditorRef.current) {
      webEditorRef.current.focus();
    }
  };

  const handleWebEditorInput = (event: any) => {
    setContentHtml(event.currentTarget.innerHTML || '<div><br></div>');
  };

  const handleWebEditorFocus = () => setIsWebTyping(true);
  const handleWebEditorBlur = () => setIsWebTyping(false);

  const handleWebDateInput = (event: any) => {
    const value = event.currentTarget.innerText.replace(/[\u200B]/g, '').trim();
    setDate(value);
  };

  const handleWebDateFocus = () => setIsWebTyping(true);
  const handleWebDateBlur = () => setIsWebTyping(false);

  useEffect(() => {
    if (isWeb && webDateRef.current && !isWebTyping) {
      webDateRef.current.innerText = date || '';
    }
  }, [date, isWebTyping]);

  useEffect(() => {
    if (isWeb && webEditorRef.current && !isWebTyping) {
      webEditorRef.current.innerHTML = contentHtml || '<div><br></div>';
    }
  }, [contentHtml, isWebTyping]);

  const validateMemo = () => {
    if (!memoId.trim()) {
      Alert.alert('Missing Memo ID', 'Memo ID is required.');
      return false;
    }
    if (isOverflowing) {
      Alert.alert(
        'Memo too long',
        'Memo content exceeds the available A4 page space. Please shorten the memo before saving or printing.'
      );
      return false;
    }
    return true;
  };

  const persistMemo = async (memoDate?: string, memoHtml?: string) => {
    const saveDate = memoDate ?? date;
    const saveHtml = memoHtml ?? contentHtml;
    if (!validateMemo()) return null;
    setIsSaving(true);
    try {
      const currentUser = db.getUsername() || 'admin';
      const memo: MemoDocument = await db.saveMemoDocument({
        id: selectedMemoId || memoId,
        memoId: selectedMemoId || memoId,
        date: saveDate,
        contentHtml: saveHtml,
        createdBy: currentUser,
        status: 'SAVED',
      });
      await loadMemoDocuments();
      setSelectedMemoId(memo.memoId);
      setMemoId(memo.memoId);
      setDate(saveDate);
      setContentHtml(saveHtml);
      return memo;
    } catch (error) {
      console.warn('Failed to save memo', error);
      Alert.alert('Save failed', 'Unable to save memo. Please try again.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const readWebMemoState = (currentDate: string, currentHtml: string) => {
    const dateValue = isWeb && webDateRef.current ? webDateRef.current.innerText.replace(/[\u200B]/g, '').trim() : currentDate;
    const htmlValue = isWeb && webEditorRef.current ? webEditorRef.current.innerHTML || '<div><br></div>' : currentHtml;
    return { dateValue: dateValue || currentDate, htmlValue };
  };

  const memoEditorSource = useMemo(
    () => ({ html: buildMemoDocumentHtml(date, contentHtml, true) }),
    [date, contentHtml]
  );

  const saveMemo = async () => {
    const memo = await persistMemo();
    if (!memo) return;
    Alert.alert('Memo saved', `Memo ${memo.memoId} saved successfully.`);
  };

  const downloadPdf = async () => {
    const { dateValue, htmlValue } = readWebMemoState(date, contentHtml);
    if (!validateMemo()) return;
    setIsSaving(true);
    try {
      const memo = await persistMemo(dateValue, htmlValue);
      if (!memo) return;
      const html = buildMemoHtml(dateValue, htmlValue);
      const filename = `${PAGE_FILENAME_PREFIX}_${memo.memoId}_${memo.date}.pdf`;
      if (isWeb) {
        downloadWebMemoAsPdf(html, filename);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const dest = FileSystemCompat.cacheDirectory + filename;
      await FileSystemCompat.copyAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: filename });
    } catch (error) {
      console.warn('Failed to download memo PDF', error);
      Alert.alert('Download failed', 'Unable to create memo PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  const printMemo = async () => {
    const { dateValue, htmlValue } = readWebMemoState(date, contentHtml);
    if (!validateMemo()) return;
    setIsSaving(true);
    try {
      const memo = await persistMemo(dateValue, htmlValue);
      if (!memo) return;
      const html = buildMemoHtml(dateValue, htmlValue);
      if (isWeb) {
        await openWebMemoPrintPreview(html);
        return;
      }
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Print failed', error);
      Alert.alert('Print failed', 'Unable to print memo.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMemo = (memo: MemoDocument) => {
    showConfirmDialog(
      'Delete Lorry Memo',
      `Are you sure you want to delete Memo ${memo.memoId}? This action cannot be undone.`,
      async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        try {
          const success = await db.deleteMemoDocument(memo.memoId);
          if (success) {
            await loadMemoDocuments();
            if (selectedMemoId === memo.memoId) {
              createNewMemo();
            }
          }
        } catch (err) {
          console.error('Delete memo error:', err);
        }
      },
      'danger',
      'Yes, Delete',
      'Cancel'
    );
  };

  const downloadExistingMemo = async (memo: MemoDocument) => {
    try {
      const html = buildMemoHtml(memo.date, memo.contentHtml);
      const filename = `${PAGE_FILENAME_PREFIX}_${memo.memoId}_${memo.date}`;
      if (isWeb) {
        downloadWebMemoAsPdf(html, filename);
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const dest = FileSystemCompat.cacheDirectory + `${filename}.pdf`;
      await FileSystemCompat.copyAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: `${filename}.pdf` });
    } catch (error) {
      console.warn('Download failed', error);
      Alert.alert('Download failed', 'Unable to generate memo PDF.');
    }
  };

  const printExistingMemo = async (memo: MemoDocument) => {
    try {
      const html = buildMemoHtml(memo.date, memo.contentHtml);
      const filename = `${PAGE_FILENAME_PREFIX}_${memo.memoId}_${memo.date}`;
      if (isWeb) {
        await openWebMemoPrintPreview(html);
        return;
      }
      await Print.printAsync({ html });
    } catch (error) {
      console.warn('Print failed', error);
      Alert.alert('Print failed', 'Unable to print memo PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Memo</Text>
          <Text style={styles.screenSubtitle}>Create, save and print A4 memo documents</Text>
        </View>
        <View style={styles.tabRow}>
          {(['EDITOR', 'ARCHIVE'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'EDITOR' ? (
        <ScrollView contentContainerStyle={styles.editorContent}>
          <View style={styles.toolbarRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('bold')}>
                <MaterialIcons name="format-bold" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('italic')}>
                <MaterialIcons name="format-italic" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('underline')}>
                <MaterialIcons name="format-underlined" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('justifyLeft')}>
                <MaterialIcons name="format-align-left" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('justifyCenter')}>
                <MaterialIcons name="format-align-center" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('justifyRight')}>
                <MaterialIcons name="format-align-right" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('insertUnorderedList')}>
                <MaterialIcons name="format-list-bulleted" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => executeEditorCommand('insertOrderedList')}>
                <MaterialIcons name="format-list-numbered" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWebFontSize(14)}>
                <Text style={styles.toolbarLabel}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWebFontSize(18)}>
                <Text style={styles.toolbarLabel}>A</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolbarButton} onPress={() => applyWebFontSize(22)}>
                <Text style={styles.toolbarLabel}>A+</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={[styles.pageWrapper, { width: pageWidth, height: pageHeight }]}> 
            {isWeb ? (
              <View
                style={styles.memoPage}
                onStartShouldSetResponder={() => true}
                onResponderGrant={focusWebEditor as any}
              > 
                <View style={[styles.headerTop, !isDesktop && { flexDirection: 'column', alignItems: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: '#102168', paddingBottom: 14 }]}>
                  <View style={styles.logoArea}>
                    <View style={styles.logoCircle}>
                      <Text style={styles.logoMark}>NBT</Text>
                      <Text style={styles.logoText}>NEW BALAJI TRANSPORTS</Text>
                      <Text style={styles.logoSub}>LOGISTICS SOLUTIONS SINCE 2010</Text>
                    </View>
                  </View>
                  <View style={styles.headerCenter}>
                    <Text style={styles.signedBy}>Sri Ramajayam</Text>
                    <Text style={styles.companyName}>NEW BALAJI</Text>
                    <Text style={styles.companyNameSecondary}>TRANSPORTS</Text>
                    <Text style={styles.companySubtitle}>(Lorry Suppliers & Commission Agent)</Text>
                    <Text style={styles.address}>
                      3/131, V.K.V. Complex, 1st Floor,
                      {'\n'}Bangalore Bye Pass Road,
                      {'\n'}Post - Kandampatty, Salem - 636 005. (TN)
                    </Text>
                  </View>
                  <View style={[styles.contactRight, !isDesktop && { minWidth: '100%', alignItems: 'center', gap: 6 }]}>
                    <View style={styles.contactBlock}>
                      <Text style={styles.phoneCircle}>☎</Text>
                      <View style={[styles.contactText, !isDesktop && { alignItems: 'center' }]}>
                        <Text style={styles.contactLabel}>Cell :</Text>
                        <Text style={styles.contactValue}>94433-51789</Text>
                        <Text style={styles.contactValue}>93622-51789</Text>
                      </View>
                    </View>
                    <View style={styles.contactBlock}>
                      <Text style={styles.phoneCircle}>☎</Text>
                      <View style={[styles.contactText, !isDesktop && { alignItems: 'center' }]}>
                        <Text style={styles.contactLabel}>Offi. :</Text>
                        <Text style={styles.contactValue}>2225575</Text>
                        <Text style={styles.contactValue}>2225576</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <View style={styles.memoBadge}><Text style={styles.memoBadgeText}>MEMO</Text></View>
                </View>
                <View style={styles.body} onPointerDown={focusWebEditor as any}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Date :</Text>
                    {isWeb ? (
                      <div
                        ref={webDateRef as any}
                        style={{ ...styles.dateValue as any, outline: 'none' }}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleWebDateInput as any}
                        onFocus={handleWebDateFocus as any}
                        onBlur={handleWebDateBlur as any}
                      >
                        {date}
                      </div>
                    ) : (
                      <View ref={webDateRef as any} style={styles.dateValue as any}>
                        <Text style={styles.dateText}>{date}</Text>
                      </View>
                    )}
                  </View>
                  {isWeb ? (
                    <div
                      ref={webEditorRef as any}
                      style={{ ...styles.editableArea as any, whiteSpace: 'pre-wrap', outline: 'none', display: 'block', width: '100%', cursor: 'text', flex: 1 }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleWebEditorInput as any}
                      onFocus={handleWebEditorFocus as any}
                      onBlur={handleWebEditorBlur as any}
                      tabIndex={0}
                    />
                  ) : (
                    <View ref={webEditorRef as any} style={styles.editableArea as any}>
                      <Text style={styles.memoText}>{''}</Text>
                    </View>
                  )}
                  <View style={styles.footer}>
                    <View style={styles.signatureBlock}>
                      <Text style={styles.signatureCaption}>For NEW BALAJI TRANSPORTS</Text>
                      <Image source={{ uri: nbtAuthorisedSignatureBase64 }} style={styles.signatureImgWeb} resizeMode="contain" />
                      <View style={styles.signatureLine} />
                      <Text style={styles.signatureText}>Authorised Signatory</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <AnyWebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={memoEditorSource}
                style={styles.webView}
                onMessage={handleEditorMessage}
                javaScriptEnabled
                domStorageEnabled
                scalesPageToFit
                startInLoadingState
              />
            )}
            {isOverflowing && (
              <View style={styles.overflowWarning}>
                <Text style={styles.overflowText}>Memo content exceeds available A4 page space. Please shorten content.</Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.primaryButton, styles.saveButton]} onPress={saveMemo} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>SAVE MEMO</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, styles.downloadButton]} onPress={downloadPdf} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>⬇ DOWNLOAD PDF</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, styles.printButton]} onPress={printMemo} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>🖨 PRINT</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton]} onPress={createNewMemo} disabled={isSaving}>
              <Text style={styles.secondaryButtonText}>NEW MEMO</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Memo ID: {memoId}</Text>
            <Text style={styles.metaText}>Date: {date}</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.archiveContent}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <FlatList
              data={[...memoDocuments].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))}
              keyExtractor={(item) => item.memoId}
              renderItem={({ item }) => (
                <View style={styles.memoCard}>
                  <View style={[styles.memoCardRow, !isDesktop && { flexDirection: 'column', gap: 12 }]}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memoCardId}>{item.memoId}</Text>
                        {item.isPinned && (
                          <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f59e0b' }}>
                            <Text style={{ fontSize: 9, color: '#b45309', fontWeight: 'bold' }}>📌 PINNED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memoCardMeta}>Date: {item.date}</Text>
                      <Text style={styles.memoCardMeta}>Created by: {item.createdBy}</Text>
                      <Text style={styles.memoCardMeta}>Updated: {new Date(item.updatedAt).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.memoCardActions, !isDesktop && { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }]}>
                      <TouchableOpacity style={[styles.cardActionButton, { backgroundColor: item.isPinned ? '#d97706' : COLORS.surfaceContainerHigh }]} onPress={async () => { await db.togglePinMemo(item.id); loadMemoDocuments(); }}>
                        <Text style={[styles.cardActionText, { color: item.isPinned ? '#ffffff' : COLORS.textDark }]}>{item.isPinned ? '📌 UNPIN' : '📌 PIN'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionButton} onPress={() => openMemoForEdit(item)}>
                        <Text style={styles.cardActionText}>VIEW / EDIT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionButton} onPress={() => downloadExistingMemo(item)}>
                        <Text style={styles.cardActionText}>DOWNLOAD</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.cardActionButton} onPress={() => printExistingMemo(item)}>
                        <Text style={styles.cardActionText}>PRINT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cardActionButton, styles.cardActionDanger]} onPress={() => deleteMemo(item)}>
                        <Text style={styles.cardActionText}>DELETE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.memoCardPreview}>{formatMemoPreview(item.contentHtml)}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No saved memos yet.</Text>}
            />
          )}
        </ScrollView>
      )}

      {/* Attractive Custom Modal Confirmation Dialog */}
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
                }}
              >
                <Text style={styles.modalConfirmBtnText}>{confirmModal.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { paddingHorizontal: SPACING.gutter, paddingTop: SPACING.gutter, paddingBottom: SPACING.base, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  screenSubtitle: { marginTop: 4, fontSize: 13, color: COLORS.textMuted },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: COLORS.surfaceContainerLow },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabButtonText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12 },
  tabButtonTextActive: { color: '#ffffff' },
  editorContent: { alignItems: 'center', paddingBottom: 40 },
  archiveContent: { paddingHorizontal: SPACING.gutter, paddingBottom: 40 },
  toolbarRow: { width: '100%', paddingHorizontal: SPACING.gutter, marginBottom: 12 },
  toolbarScroll: { alignItems: 'center', paddingVertical: 4 },
  toolbarButton: { marginRight: 10, width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.outline },
  toolbarLabel: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  pageWrapper: { backgroundColor: 'transparent', borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', padding: 0 },
  memoPage: { flex: 1, width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 3, borderColor: '#102168', overflow: 'hidden' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: '#102168' },
  logoArea: { width: 100, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  logoCircle: { width: 100, height: 100, borderWidth: 3, borderColor: '#102168', borderRadius: 50, alignItems: 'center', justifyContent: 'center', padding: 8 },
  logoMark: { fontSize: 22, fontWeight: '900', letterSpacing: 3, color: '#102168' },
  logoText: { fontSize: 8, lineHeight: 10, fontWeight: '700', letterSpacing: 1, marginTop: 4, textAlign: 'center', color: '#102168' },
  logoSub: { fontSize: 6, lineHeight: 8, fontWeight: '700', letterSpacing: 1, marginTop: 2, opacity: 0.9, color: '#102168', textAlign: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  signedBy: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, color: '#102168' },
  companyName: { fontSize: 26, fontWeight: '900', letterSpacing: 2, lineHeight: 34, textAlign: 'center', color: '#102168' },
  companyNameSecondary: { fontSize: 26, fontWeight: '900', letterSpacing: 2, lineHeight: 34, textAlign: 'center', color: '#102168' },
  companySubtitle: { fontSize: 13, fontStyle: 'italic', marginTop: 4, textAlign: 'center', color: '#102168' },
  address: { fontSize: 11, lineHeight: 18, marginTop: 8, color: '#102168', textAlign: 'center' },
  contactRight: { minWidth: 140, alignItems: 'flex-end', gap: 10 },
  contactBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneCircle: { width: 26, height: 26, borderWidth: 2, borderColor: '#102168', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  contactText: { alignItems: 'flex-end' },
  contactLabel: { fontWeight: '700', color: '#102168', fontSize: 12 },
  contactValue: { fontSize: 13, fontWeight: '700', color: '#102168' },
  dividerRow: { position: 'relative', marginTop: 18, paddingTop: 20 },
  dividerLine: { position: 'absolute', left: 0, right: 0, top: 12, borderTopWidth: 2, borderTopColor: '#102168' },
  memoBadge: { position: 'absolute', left: '50%', top: 0, transform: [{ translateX: -50 }, { translateY: -50 }], backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#102168', borderRadius: 16, paddingHorizontal: 22, paddingVertical: 6 },
  memoBadgeText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.4, color: '#102168' },
  body: { marginTop: 26, flex: 1, overflow: 'hidden' },
  dateRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 16 },
  dateLabel: { fontWeight: '700', color: '#102168', fontSize: 12 },
  dateValue: { minWidth: 200, borderBottomWidth: 2, borderBottomColor: '#102168', paddingBottom: 2, color: '#102168', fontSize: 12 },
  dateText: { color: '#102168', fontSize: 12 },
  editableArea: { flex: 1, fontSize: 13, lineHeight: 24, color: '#08124a', padding: 4, backgroundColor: 'transparent' },
  memoText: { fontSize: 12, lineHeight: 20, color: '#08124a' },
  footer: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginTop: 42, paddingBottom: 8, paddingRight: 16 },
  signatureBlock: { alignItems: 'flex-end', gap: 4, maxWidth: 180 },
  signatureCaption: { fontSize: 10, fontWeight: '900', letterSpacing: 1, color: '#102168' },
  signatureImgWeb: { maxWidth: 140, width: '100%', aspectRatio: 7 / 3 },
  signatureLine: { width: 140, borderBottomWidth: 1, borderBottomColor: '#102168', marginTop: -10 },
  signatureText: { fontSize: 10, color: '#102168', marginTop: 6 },
  webView: { flex: 1, width: '100%' },
  actionRow: { width: '100%', flexWrap: 'wrap', gap: 12, paddingHorizontal: SPACING.gutter, marginTop: 18, flexDirection: 'row', justifyContent: 'center' },
  primaryButton: { minWidth: 130, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: COLORS.primary },
  downloadButton: { backgroundColor: '#0e7490' },
  printButton: { backgroundColor: '#7c3aed' },
  primaryButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  secondaryButton: { minWidth: 120, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.outline },
  secondaryButtonText: { color: COLORS.primary, fontWeight: '700' },
  metaRow: { width: '100%', paddingHorizontal: SPACING.gutter, marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  metaText: { color: COLORS.textMuted, fontSize: 12 },
  overflowWarning: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: '#fef3c7', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a' },
  overflowText: { color: '#92400e', fontSize: 12, textAlign: 'center' },
  memoCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14, ...SHADOWS.light },
  memoCardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  memoCardId: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  memoCardMeta: { fontSize: 12, color: COLORS.textMuted },
  memoCardActions: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  cardActionButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: COLORS.primary },
  cardActionDanger: { backgroundColor: '#b91c1c' },
  cardActionText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  memoCardPreview: { marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  emptyText: { width: '100%', textAlign: 'center', marginTop: 32, color: COLORS.textMuted, fontSize: 14 },
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

export default MemoScreen;
