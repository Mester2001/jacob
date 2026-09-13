import React, { useState, useRef, useEffect } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  FileJson,
  X,
  AlertCircle,
  RefreshCw,
  FolderDown,
  ShieldCheck,
  Info,
  Database,
  Sliders,
} from 'lucide-react';
import { Order, CatalogItem, AuditLogEntry } from '../types';
import {
  getLastBackupInfo,
  createBackupPayload,
  downloadJsonFile,
  persistLatestBackupSnapshot,
  getBackupRecordsHistory,
  getBackupSettings,
  saveBackupSettings,
  getTodayDateKey,
  BackupRecord,
  BackupSettings,
  SystemBackupPayload,
} from '../utils/backupManager';

interface DailyBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  catalogItems: CatalogItem[];
  auditLogs: AuditLogEntry[];
  onRestoreData?: (restoredOrders: Order[], restoredCatalog?: CatalogItem[], restoredLogs?: AuditLogEntry[]) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const DailyBackupModal: React.FC<DailyBackupModalProps> = ({
  isOpen,
  onClose,
  orders,
  catalogItems,
  auditLogs,
  onRestoreData,
  onShowToast,
}) => {
  const [backupInfo, setBackupInfo] = useState(getLastBackupInfo());
  const [history, setHistory] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState<BackupSettings>(getBackupSettings());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<SystemBackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'restore' | 'settings'>('status');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh data when modal opens
  useEffect(() => {
    if (isOpen) {
      setBackupInfo(getLastBackupInfo());
      setHistory(getBackupRecordsHistory());
      setSettings(getBackupSettings());
      setRestoreFile(null);
      setRestorePreview(null);
      setRestoreError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayKey = getTodayDateKey();
  const isTodayRecorded = backupInfo.isToday;

  // Handle manual download of today's or fresh backup
  const handleDownloadBackupNow = (isFresh = false) => {
    try {
      setIsGenerating(true);
      const payload = createBackupPayload(orders, catalogItems, auditLogs, false);
      const record = persistLatestBackupSnapshot(payload);
      
      const fileName = isFresh
        ? `wdm-mining-backup-${todayKey}-manual.json`
        : record.fileName;

      downloadJsonFile(payload, fileName);
      
      setBackupInfo(getLastBackupInfo());
      setHistory(getBackupRecordsHistory());

      onShowToast(
        `تم تنزيل النسخة الاحتياطية بنجاح (${payload.ordersCount} طلب شراء) كملف JSON!`,
        'success'
      );
    } catch (e: any) {
      console.error('Backup generation failed:', e);
      onShowToast(`فشل إنشاء النسخة الاحتياطية: ${e?.message || 'خطأ غير معروف'}`, 'warning');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Auto-download setting
  const handleToggleAutoDownload = (enabled: boolean) => {
    const updated = { ...settings, autoDownloadOnSchedule: enabled };
    setSettings(updated);
    saveBackupSettings(updated);
    onShowToast(
      enabled
        ? 'تم تفعيل التنزيل التلقائي اليومي لملف JSON عند بدء تشغيل التطبيق.'
        : 'تم تعطيل التنزيل التلقائي. سيتم حفظ النسخة محلياً مع إمكانية تنزيلها يدوياً.',
      'info'
    );
  };

  // File selection for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestorePreview(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setRestoreError('يرجى اختيار ملف بامتداد .json صالح للنسخ الاحتياطي.');
      return;
    }

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('محتوى الملف غير صالح أو تالف.');
        }

        if (!Array.isArray(parsed.orders)) {
          // If the user uploaded a raw orders array
          if (Array.isArray(parsed)) {
            setRestorePreview({
              version: '1.0.0',
              exportDate: new Date().toISOString(),
              exportDateFormatted: 'ملف طلبات مخصص',
              systemName: 'مجموعة طلبات مباشرة',
              ordersCount: parsed.length,
              orders: parsed,
              catalogItems: [],
              auditLogs: [],
              metadata: {
                appVersion: '2.4.0',
                environment: 'custom-import',
                autoScheduled: false,
                siteCode: 'WDM',
                backupType: 'MANUAL',
              },
            });
            return;
          }
          throw new Error('الملف لا يحتوي على سجلات طلبات شراء صالحة (orders list missing).');
        }

        setRestorePreview(parsed);
      } catch (err: any) {
        console.error('Failed to parse restore file:', err);
        setRestoreError(err?.message || 'فشل قراءة ملف النسخة الاحتياطية.');
      }
    };
    reader.readAsText(file);
  };

  // Confirm and apply restore
  const handleConfirmRestore = () => {
    if (!restorePreview || !restorePreview.orders) {
      setRestoreError('لا توجد بيانات جاهزة للاستعادة.');
      return;
    }

    if (
      window.confirm(
        `تأكيد استعادة ${restorePreview.orders.length} طلب شراء من ملف النسخة الاحتياطية؟ سيتم تحديث قاعدة البيانات المحلية في المتصفح.`
      )
    ) {
      if (onRestoreData) {
        onRestoreData(
          restorePreview.orders,
          restorePreview.catalogItems?.length ? restorePreview.catalogItems : undefined,
          restorePreview.auditLogs?.length ? restorePreview.auditLogs : undefined
        );
      }
      onShowToast(
        `تم استعادة ${restorePreview.orders.length} طلب شراء وسجلات النظام بنجاح من ملف JSON!`,
        'success'
      );
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
      id="daily-backup-modal"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto border border-slate-200 animate-scaleUp">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">
                  النسخ الاحتياطي التلقائي اليومي (Daily JSON Backup)
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  حماية ضد انقطاع النت
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تأمين بيانات مشتريات منجم الجكوب بملف JSON مستقل وقابل للتنزيل والاستعادة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 flex items-center gap-2 pt-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'status'
                ? 'border-amber-500 text-amber-900 bg-white/70 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>حالة وتنزيل نسخة اليوم</span>
            {isTodayRecorded && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'restore'
                ? 'border-amber-500 text-amber-900 bg-white/70 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>استعادة البيانات من ملف (Restore)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-900 bg-white/70 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>إعدادات الجدولة</span>
          </button>
        </div>

        {/* Tab 1: Daily Status & Download */}
        {activeTab === 'status' && (
          <div className="p-5 space-y-4 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
            {/* Main Daily Snapshot Status Banner */}
            <div
              className={`p-4 rounded-xl border-2 transition ${
                isTodayRecorded
                  ? 'bg-emerald-50/70 border-emerald-400/80 shadow-2xs'
                  : 'bg-amber-50/70 border-amber-300 shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isTodayRecorded
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-500 text-slate-950 shadow-xs'
                    }`}
                  >
                    {isTodayRecorded ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-sm">
                        {isTodayRecorded
                          ? 'نسخة اليوم الاحتياطية متوفرة ومحفوظة محلياً'
                          : 'لم يتم استخراج نسخة اليوم التلقائية بعد'}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isTodayRecorded
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {isTodayRecorded ? 'جاهزة للتنزيل 📦' : 'مطلوب إجراء ⏳'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1">
                      تاريخ النسخة المسجلة:{' '}
                      <span className="font-bold text-slate-900">
                        {backupInfo.formattedTime || 'لا يوجد تسجيل مسبق'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Primary Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadBackupNow(false)}
                  disabled={isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-60"
                  title="تحميل ملف النسخة الاحتياطية لليوم بصيغة JSON"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إعداد الملف...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>تحميل نسخة اليوم (JSON)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Current Payload Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[11px] text-slate-500 font-bold block">إجمالي الطلبات</span>
                <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                  {orders.length}
                </span>
                <span className="text-[10px] text-slate-400">سجل شراء كامل</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[11px] text-slate-500 font-bold block">دليل الأصناف</span>
                <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                  {catalogItems.length}
                </span>
                <span className="text-[10px] text-slate-400">صنف مخزني</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <span className="text-[11px] text-slate-500 font-bold block">سجل التدقيق</span>
                <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                  {auditLogs.length}
                </span>
                <span className="text-[10px] text-slate-400">إجراء أمني</span>
              </div>
            </div>

            {/* Offline Peace-of-Mind Explanation */}
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-3 text-[11px] text-amber-950 leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-amber-900 mb-0.5">
                  ضمان استمرارية العمل الميداني دون إنترنت:
                </strong>
                ملف النسخة الاحتياطية (.json) هو ملف متكامل يحتوي على كل الطلبات، البنود، التوقيعات الرقمية،
                والتغييرات المنفذة. يمكنك حفظه في هاتفك أو فلاش ميموري ومشاركته أو استعادته فوراً على أي جهاز
                آخر حتى لو انقطع الاتصال بالإنترنت تماماً في منجم الجكوب.
              </div>
            </div>

            {/* On-Demand Fresh Backup Trigger */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                هل قمت بتعديلات جديدة وتريد تنزيل نسخة فورية طازجة؟
              </span>
              <button
                type="button"
                onClick={() => handleDownloadBackupNow(true)}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FolderDown className="w-3.5 h-3.5 text-amber-600" />
                <span>توليد وتنزيل نسخة فورية الآن</span>
              </button>
            </div>

            {/* Local History Table (if available) */}
            {history.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  <span>سجل النسخ الاحتياطية المسجلة محلياً (آخر 7 أيام):</span>
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between text-xs hover:bg-slate-100/80 transition"
                    >
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-amber-600" />
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-[11px] block">
                            {record.fileName}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {record.timeFormatted} • {record.ordersCount} طلب • {record.fileSizeKb} KB
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadBackupNow(false)}
                        className="px-2 py-1 text-[10px] font-bold bg-white text-slate-700 hover:text-amber-800 border border-slate-300 rounded hover:border-amber-400 transition cursor-pointer"
                        title="إعادة التنزيل"
                      >
                        تحميل
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Restore from Backup File */}
        {activeTab === 'restore' && (
          <div className="p-5 space-y-4 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-blue-950">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                تتيح لك هذه الميزة استعادة كافة الطلبات والبيانات السابقة من أي ملف نسخة احتياطية (.json)
                تم تنزيله مسبقاً من التطبيق، لاستئناف العمل الميداني بكل سلاسة.
              </p>
            </div>

            {/* File Dropzone / Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50/70 hover:bg-amber-50/30 rounded-xl p-6 text-center cursor-pointer transition"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-xs sm:text-sm">
                انقر هنا لاختيار ملف النسخة الاحتياطية (.json)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {restoreFile ? restoreFile.name : 'أو اسحب وأفلت الملف هنا'}
              </p>
            </div>

            {/* Error Display */}
            {restoreError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* Restore Preview */}
            {restorePreview && (
              <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-4 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="font-black text-emerald-950 text-xs">
                    بيانات الملف المؤكدة للاستعادة:
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded">
                    إصدار {restorePreview.version || '2.0'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">تاريخ التصدير:</span>
                    <span className="font-bold text-slate-900">
                      {restorePreview.exportDateFormatted || restorePreview.exportDate?.slice(0, 10)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">عدد الطلبات:</span>
                    <span className="font-black text-emerald-800 text-sm">
                      {restorePreview.orders?.length || 0} طلب
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">الأصناف وسجل الأمان:</span>
                    <span className="font-bold text-slate-900">
                      {restorePreview.catalogItems?.length || 0} صنف
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد استعادة البيانات وتطبيقها فوراً</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Scheduling Settings */}
        {activeTab === 'settings' && (
          <div className="p-5 space-y-4 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
            {/* Setting 1: Auto Download Prompt */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-black text-slate-900 block text-xs sm:text-sm">
                    التنزيل التلقائي لملف JSON مرة يومياً
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    يقوم النظام بتوليد وتنزيل ملف النسخة الاحتياطية تلقائياً عند أول فتح للتطبيق كل يوم.
                  </span>
                </div>

                <input
                  type="checkbox"
                  id="chk-auto-download"
                  checked={settings.autoDownloadOnSchedule}
                  onChange={(e) => handleToggleAutoDownload(e.target.checked)}
                  className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer shrink-0"
                />
              </div>
            </div>

            {/* Information Card on Schedule */}
            <div className="bg-slate-100 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-600">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>آلية الجدولة التلقائية:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>يتم فحص تاريخ اليوم (YYYY-MM-DD) دورياً عند بدء تشغيل التطبيق.</li>
                <li>في حال مرور يوم جديد، يتم تجميع وتأمين كافة الطلبات والتوقيعات كملف JSON.</li>
                <li>يتم حفظ السجل محلياً في ذاكرة التخزين الدائمة للمتصفح.</li>
                <li>في حال تفعيل التنزيل، يُطلق المتصفح نافذة تنزيل الملف لحفظه على جهازك.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <span>التاريخ الحالي:</span>
            <span className="font-bold text-slate-800">{todayKey}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
