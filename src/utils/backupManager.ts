import { Order, CatalogItem, AuditLogEntry } from '../types';

export interface SystemBackupPayload {
  version: string;
  exportDate: string; // ISO string
  exportDateFormatted: string; // formatted Arabic string
  systemName: string;
  ordersCount: number;
  orders: Order[];
  catalogItems: CatalogItem[];
  auditLogs: AuditLogEntry[];
  metadata: {
    appVersion: string;
    environment: string;
    autoScheduled: boolean;
    siteCode: string;
    backupType: 'DAILY_AUTOMATIC' | 'MANUAL';
  };
}

export interface BackupRecord {
  id: string;
  dateKey: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  timeFormatted: string;
  ordersCount: number;
  fileSizeKb: number;
  fileName: string;
}

export interface BackupSettings {
  autoDownloadOnSchedule: boolean;
  notifyOnDailyBackup: boolean;
  retentionDays: number;
}

const STORAGE_KEYS = {
  LAST_BACKUP_DATE: 'wdm_last_auto_backup_date',
  LAST_BACKUP_TIMESTAMP: 'wdm_last_auto_backup_timestamp',
  LATEST_BACKUP_DATA: 'wdm_latest_backup_json',
  BACKUP_HISTORY: 'wdm_backup_records_history',
  BACKUP_SETTINGS: 'wdm_backup_settings_config',
};

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  autoDownloadOnSchedule: true,
  notifyOnDailyBackup: true,
  retentionDays: 7,
};

// Get current date formatted key YYYY-MM-DD
export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Load backup settings
export function getBackupSettings(): BackupSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKUP_SETTINGS);
    if (saved) {
      return { ...DEFAULT_BACKUP_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to parse backup settings, using defaults', e);
  }
  return DEFAULT_BACKUP_SETTINGS;
}

// Save backup settings
export function saveBackupSettings(settings: BackupSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BACKUP_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save backup settings', e);
  }
}

// Format date into human-readable Arabic format
export function formatArabicDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// Build complete backup payload
export function createBackupPayload(
  orders: Order[],
  catalogItems: CatalogItem[],
  auditLogs: AuditLogEntry[],
  isAuto = false
): SystemBackupPayload {
  const now = new Date();
  const iso = now.toISOString();

  return {
    version: '2.4.0',
    exportDate: iso,
    exportDateFormatted: formatArabicDateTime(iso),
    systemName: 'منظومة إدارة وتتبع مشتريات منجم الجكوب (WDM Mining)',
    ordersCount: orders.length,
    orders,
    catalogItems,
    auditLogs,
    metadata: {
      appVersion: '2.4.0',
      environment: 'production-offline-safe',
      autoScheduled: isAuto,
      siteCode: 'WDM-ALJAKOB',
      backupType: isAuto ? 'DAILY_AUTOMATIC' : 'MANUAL',
    },
  };
}

// Trigger file download in browser
export function downloadJsonFile(data: unknown, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Retrieve backup records history
export function getBackupRecordsHistory(): BackupRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse backup records history', e);
  }
  return [];
}

// Record a backup into history
function recordBackupHistory(record: BackupRecord, maxRetention = 7): void {
  try {
    const history = getBackupRecordsHistory();
    // Filter out existing record with same dateKey or prepend
    const filtered = history.filter((r) => r.id !== record.id && r.dateKey !== record.dateKey);
    const updated = [record, ...filtered].slice(0, maxRetention);
    localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update backup records history', e);
  }
}

// Save snapshot to local storage
export function persistLatestBackupSnapshot(payload: SystemBackupPayload): BackupRecord {
  const dateKey = getTodayDateKey();
  const jsonStr = JSON.stringify(payload);
  const fileSizeKb = Math.round((new Blob([jsonStr]).size / 1024) * 10) / 10;
  const fileName = `wdm-mining-backup-${dateKey}.json`;

  try {
    localStorage.setItem(STORAGE_KEYS.LATEST_BACKUP_DATA, jsonStr);
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, dateKey);
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, payload.exportDate);
  } catch (e) {
    console.warn('LocalStorage quota limit while storing backup payload:', e);
  }

  const record: BackupRecord = {
    id: `BK-${dateKey}-${Date.now()}`,
    dateKey,
    timestamp: payload.exportDate,
    timeFormatted: formatArabicDateTime(payload.exportDate),
    ordersCount: payload.ordersCount,
    fileSizeKb,
    fileName,
  };

  recordBackupHistory(record);
  return record;
}

// Check if today's scheduled backup has already executed
export function hasTodayBackupRun(): boolean {
  const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
  const todayKey = getTodayDateKey();
  return lastDate === todayKey;
}

// Get the last recorded backup info
export function getLastBackupInfo(): {
  dateKey: string | null;
  timestamp: string | null;
  formattedTime: string | null;
  isToday: boolean;
} {
  const dateKey = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
  const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIMESTAMP);
  const todayKey = getTodayDateKey();

  return {
    dateKey,
    timestamp,
    formattedTime: timestamp ? formatArabicDateTime(timestamp) : null,
    isToday: dateKey === todayKey,
  };
}

// Get latest stored backup JSON payload
export function getLatestStoredBackupPayload(): SystemBackupPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LATEST_BACKUP_DATA);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse stored backup payload', e);
  }
  return null;
}

// Core Automatic Daily Scheduler Check & Executor
export interface DailySchedulerResult {
  triggered: boolean;
  isFirstRunToday: boolean;
  fileName: string;
  ordersCount: number;
  timestamp: string;
  fileDownloaded: boolean;
}

export function evaluateAndRunDailyAutoBackup(
  orders: Order[],
  catalogItems: CatalogItem[],
  auditLogs: AuditLogEntry[]
): DailySchedulerResult {
  const todayKey = getTodayDateKey();
  const lastRunDate = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
  const settings = getBackupSettings();

  // If already ran today, return status without re-downloading automatically
  if (lastRunDate === todayKey) {
    const lastTimestamp = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIMESTAMP) || new Date().toISOString();
    return {
      triggered: false,
      isFirstRunToday: false,
      fileName: `wdm-mining-backup-${todayKey}.json`,
      ordersCount: orders.length,
      timestamp: lastTimestamp,
      fileDownloaded: false,
    };
  }

  // Create new daily automatic backup
  const payload = createBackupPayload(orders, catalogItems, auditLogs, true);
  const record = persistLatestBackupSnapshot(payload);

  let downloaded = false;
  if (settings.autoDownloadOnSchedule) {
    downloadJsonFile(payload, record.fileName);
    downloaded = true;
  }

  return {
    triggered: true,
    isFirstRunToday: true,
    fileName: record.fileName,
    ordersCount: payload.ordersCount,
    timestamp: payload.exportDate,
    fileDownloaded: downloaded,
  };
}
