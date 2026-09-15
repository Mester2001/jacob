import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Copy,
  Check,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  FileCheck,
  Truck,
  Building,
  User,
  Calendar,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  Printer,
  Sparkles,
  ArrowRight,
  Info,
  Lock,
  Unlock,
  MessageSquare,
  FileText,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Sliders,
  X,
  Radio,
  Zap,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Order, OrderStatus, UserRole, UserAudioSettings, AuditLogEntry } from '../types';
import { getLifecycleCategory } from '../utils/statusLifecycle';
import { PriorityBadge } from './PriorityBadge';
import { OfficialRequisitionSheet } from './OfficialRequisitionSheet';
import { AuditModificationDetails } from './AuditModificationDetails';
import { subscribeToOrderById } from '../lib/firebase';
import { playStatusChangeSound, playNewOrderSound, playTestAudio } from '../utils/audioNotifications';
import {
  copyToClipboardSafe,
  buildWhatsAppShareData,
  generateMemberViewUrl,
  generateStaffTrackUrl,
} from '../utils/linkSharing';

export interface StatusChangeAlert {
  id: string;
  orderId: string;
  referenceNumber: string;
  orderPurpose?: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: string;
  formattedTime: string;
  source: 'FIREBASE_SNAPSHOT' | 'COLLECTION_SYNC' | 'SIMULATION';
}

interface OrderTrackerViewProps {
  orders: Order[];
  activeOrder: Order | null;
  onSelectOrder: (order: Order) => void;
  onNavigateToCreate: () => void;
  currentUserRole: UserRole;
  currentUserName?: string;
  onQuickStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  onOpenDetailsModal?: (order: Order) => void;
  onOpenPrintView?: (order: Order) => void;
  onClaimTask?: (orderId: string, claimantName: string) => void;
  onReleaseTaskLock?: (orderId: string) => void;
  onOpenWhatsAppModal?: (order: Order) => void;
  onOpenShareModal?: (order: Order) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onShowToast?: (text: string, type?: 'success' | 'warning' | 'info') => void;
  audioSettings?: UserAudioSettings;
  onToggleAudioMaster?: () => void;
  onUpdateAudioSettings?: (settings: UserAudioSettings) => void;
  onOpenUserSettingsModal?: () => void;
  auditLogs?: AuditLogEntry[];
}

export const OrderTrackerView: React.FC<OrderTrackerViewProps> = ({
  orders,
  activeOrder,
  onSelectOrder,
  onNavigateToCreate,
  currentUserRole,
  currentUserName = 'عضو الفريق اللوجستي',
  onQuickStatusChange,
  onOpenDetailsModal,
  onOpenPrintView,
  onClaimTask,
  onReleaseTaskLock,
  onOpenWhatsAppModal,
  onOpenShareModal,
  onUpdateOrder,
  onShowToast,
  audioSettings,
  onToggleAudioMaster,
  onUpdateAudioSettings,
  onOpenUserSettingsModal,
  auditLogs = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'SHEET' | 'STEPPER'>('SHEET');
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);

  // Current order to display
  const currentOrder = activeOrder || orders[0];

  // Generate tracking URL
  const trackingUrl = currentOrder ? generateMemberViewUrl(currentOrder.referenceNumber) : '';

  const handleCopyLink = async () => {
    if (!trackingUrl) return;
    const ok = await copyToClipboardSafe(trackingUrl);
    if (ok) {
      setCopied(true);
      if (onShowToast) {
        onShowToast('تم نسخ رابط متابعة الأعضاء (عرض فقط) بنجاح!', 'success');
      }
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Search by reference or requester
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    if (!searchTerm.trim()) return;

    const term = searchTerm.trim().toLowerCase();
    const found = orders.find(
      (o) =>
        o.referenceNumber.toLowerCase().includes(term) ||
        o.sequenceNumber.toString() === term ||
        o.requesterName.toLowerCase().includes(term)
    );

    if (found) {
      onSelectOrder(found);
      setSearchTerm('');
    } else {
      setSearchError(`لم يتم العثور على طلب بالرقم أو الاسم "${searchTerm}". يرجى التحقق من الرقم المرجعي.`);
    }
  };

  // Firebase Real-time Tracking & Alert States
  const [latestAlert, setLatestAlert] = useState<StatusChangeAlert | null>(null);
  const [alertHistory, setAlertHistory] = useState<StatusChangeAlert[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // References to accurately detect status transitions without stale closures
  const lastKnownStatusRef = useRef<OrderStatus | null>(currentOrder ? currentOrder.status : null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Status mapping
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return { label: 'مسودة قيد الإعداد', color: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'PENDING_DEPT_HEAD':
        return { label: 'قيد مراجعة واعتماد رئيس القسم', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'PENDING_SITE_MANAGER':
        return { label: 'قيد مصادقة مدير الموقع', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'PENDING_GENERAL_MANAGER':
        return { label: 'قيد الاعتماد المالي والتنفيذي', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'APPROVED_FOR_PO':
        return { label: 'معتمد نهائياً - قيد إصدار أمر التوريد', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'PO_ISSUED':
        return { label: 'تم إصدار أمر الشراء وقيد التوريد والشحن', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
      case 'DELIVERED_RECEIVED':
        return { label: 'تم الاستلام والتسليم الميداني بالمستودع', color: 'bg-emerald-600 text-white border-emerald-700' };
      case 'REJECTED':
        return { label: 'مرفوض', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'MODIFICATION_REQUESTED':
        return { label: 'مطلوب استكمال مواصفات ونواقص', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  // Audio Chime synthesizer via Web Audio API
  const playNotificationChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1 (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Note 2 (A5 - 880 Hz) - crisp notification ping
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch {
      // Handled silently
    }
  };

  // Helper to trigger alert when status change is detected
  const triggerStatusAlert = (
    order: Order,
    prevStatus: OrderStatus,
    newStatus: OrderStatus,
    source: 'FIREBASE_SNAPSHOT' | 'COLLECTION_SYNC' | 'SIMULATION' = 'FIREBASE_SNAPSHOT'
  ) => {
    const oldInfo = getStatusBadge(prevStatus);
    const newInfo = getStatusBadge(newStatus);
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const alertItem: StatusChangeAlert = {
      id: `${order.referenceNumber}-${Date.now()}`,
      orderId: order.id,
      referenceNumber: order.referenceNumber,
      orderPurpose: order.purpose,
      oldStatus: prevStatus,
      newStatus: newStatus,
      timestamp: now.toISOString(),
      formattedTime,
      source,
    };

    // Play chime sound using user settings
    if (audioSettings) {
      if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
        playStatusChangeSound(audioSettings.volume);
      }
    } else {
      playNotificationChime();
    }

    // Trigger local Toast alert
    setLatestAlert(alertItem);
    setHasUnreadAlert(true);
    setAlertHistory((prev) => [alertItem, ...prev.slice(0, 9)]);

    // Trigger App-level Toast notification
    if (onShowToast) {
      onShowToast(
        `🔔 تنبيه فوري (Firebase): تم تحديث حالة الطلب ${order.referenceNumber} إلى [${newInfo.label}]!`,
        'success'
      );
    }
  };

  // 1. Subscribe to real-time changes of the currently tracked order in Firebase Firestore
  useEffect(() => {
    if (!currentOrder?.id) return;

    // Reset baseline status when switching to a new order
    lastKnownStatusRef.current = currentOrder.status;
    isInitialLoadRef.current = true;
    setIsFirebaseConnected(true);

    const unsubscribe = subscribeToOrderById(
      currentOrder.id,
      (remoteOrder) => {
        setIsFirebaseConnected(true);
        const prevStatus = lastKnownStatusRef.current;
        const newStatus = remoteOrder.status;

        // Skip the very first initial snapshot upon mount
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          lastKnownStatusRef.current = newStatus;
          return;
        }

        // Check if status changed
        if (prevStatus && prevStatus !== newStatus) {
          triggerStatusAlert(remoteOrder, prevStatus, newStatus, 'FIREBASE_SNAPSHOT');
          lastKnownStatusRef.current = newStatus;

          if (onUpdateOrder) {
            onUpdateOrder(remoteOrder);
          }
        } else {
          lastKnownStatusRef.current = newStatus;
        }
      },
      (err) => {
        console.warn('Firestore subscription status:', err);
        setIsFirebaseConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentOrder?.id]);

  // 2. Secondary listener: if parent orders array updates (e.g. from top-level collection snapshot)
  useEffect(() => {
    if (!currentOrder) return;
    const prevStatus = lastKnownStatusRef.current;
    if (!isInitialLoadRef.current && prevStatus && prevStatus !== currentOrder.status) {
      triggerStatusAlert(currentOrder, prevStatus, currentOrder.status, 'COLLECTION_SYNC');
      lastKnownStatusRef.current = currentOrder.status;
    }
  }, [currentOrder?.status]);

  // Auto-dismiss latestAlert toast after 8.5 seconds
  useEffect(() => {
    if (latestAlert) {
      const timer = setTimeout(() => {
        setLatestAlert(null);
      }, 8500);
      return () => clearTimeout(timer);
    }
  }, [latestAlert]);

  // Quick simulation / testing trigger
  const handleSimulateStatusChange = () => {
    if (!currentOrder) return;
    const statuses: OrderStatus[] = [
      'PENDING_DEPT_HEAD',
      'PENDING_SITE_MANAGER',
      'PENDING_GENERAL_MANAGER',
      'APPROVED_FOR_PO',
      'PO_ISSUED',
      'DELIVERED_RECEIVED',
    ];
    const currentIndex = statuses.indexOf(currentOrder.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    if (onQuickStatusChange) {
      onQuickStatusChange(currentOrder.id, nextStatus);
    } else {
      triggerStatusAlert(currentOrder, currentOrder.status, nextStatus, 'SIMULATION');
    }
  };

  // Steps definition for the visual stepper
  const steps = [
    {
      id: 1,
      title: 'تقديم الطلب',
      subtitle: currentOrder?.requesterName || 'مقدم الطلب',
      date: currentOrder?.orderDate || currentOrder?.createdAt?.split('T')[0],
      isDone: true,
      isCurrent: currentOrder?.status === 'PENDING_DEPT_HEAD',
      icon: User,
    },
    {
      id: 2,
      title: 'اعتماد رئيس القسم',
      subtitle: currentOrder?.approvals?.find((a) => a.stage === 'DEPT_HEAD')?.approverName || 'رئيس القسم المختص',
      date: currentOrder?.approvals?.find((a) => a.stage === 'DEPT_HEAD')?.timestamp?.split('T')[0],
      isDone:
        currentOrder?.status !== 'DRAFT' &&
        currentOrder?.status !== 'PENDING_DEPT_HEAD' &&
        currentOrder?.status !== 'MODIFICATION_REQUESTED' &&
        currentOrder?.status !== 'REJECTED',
      isCurrent: currentOrder?.status === 'PENDING_DEPT_HEAD',
      isRejected: currentOrder?.status === 'REJECTED',
      isModRequested: currentOrder?.status === 'MODIFICATION_REQUESTED',
      icon: FileCheck,
    },
    {
      id: 3,
      title: 'اعتماد مدير الموقع',
      subtitle: currentOrder?.approvals?.find((a) => a.stage === 'SITE_MANAGER')?.approverName || 'مدير مشروع الجكوب',
      date: currentOrder?.approvals?.find((a) => a.stage === 'SITE_MANAGER')?.timestamp?.split('T')[0],
      isDone:
        currentOrder?.status === 'PENDING_GENERAL_MANAGER' ||
        currentOrder?.status === 'APPROVED_FOR_PO' ||
        currentOrder?.status === 'PO_ISSUED' ||
        currentOrder?.status === 'DELIVERED_RECEIVED',
      isCurrent: currentOrder?.status === 'PENDING_SITE_MANAGER',
      icon: Building,
    },
    {
      id: 4,
      title: 'الاعتماد المالي التنفيذي',
      subtitle: currentOrder?.approvals?.find((a) => a.stage === 'GENERAL_MANAGER')?.approverName || 'المدير العام',
      date: currentOrder?.approvals?.find((a) => a.stage === 'GENERAL_MANAGER')?.timestamp?.split('T')[0],
      isDone:
        currentOrder?.status === 'APPROVED_FOR_PO' ||
        currentOrder?.status === 'PO_ISSUED' ||
        currentOrder?.status === 'DELIVERED_RECEIVED',
      isCurrent: currentOrder?.status === 'PENDING_GENERAL_MANAGER',
      icon: ShieldCheck,
    },
    {
      id: 5,
      title: 'أمر الشراء والتوريد (PO)',
      subtitle: currentOrder?.logistics?.vendor || 'المشتريات وسلسلة الإمداد',
      date: currentOrder?.logistics?.estimatedDeliveryDate,
      isDone: currentOrder?.status === 'PO_ISSUED' || currentOrder?.status === 'DELIVERED_RECEIVED',
      isCurrent: currentOrder?.status === 'APPROVED_FOR_PO',
      icon: Truck,
    },
    {
      id: 6,
      title: 'الاستلام المخزني والتسليم',
      subtitle: currentOrder?.logistics?.receivedBy || 'مستودع المنجم الميداني',
      date: currentOrder?.logistics?.receivedDate,
      isDone: currentOrder?.status === 'DELIVERED_RECEIVED',
      isCurrent: currentOrder?.status === 'PO_ISSUED',
      icon: Package,
    },
  ];

  const statusBadge = currentOrder ? getStatusBadge(currentOrder.status) : null;
  const lifecycle = currentOrder ? getLifecycleCategory(currentOrder.status) : null;

  const isLogisticsReady =
    currentOrder?.status === 'APPROVED_FOR_PO' ||
    currentOrder?.status === 'PO_ISSUED' ||
    currentOrder?.status === 'DELIVERED_RECEIVED';

  return (
    <div className="space-y-6 animate-fadeIn" id="order-tracker-view">
      {/* Real-time Status Change Floating Toast (Firebase Instant Alert) */}
      {latestAlert && (
        <div
          className="fixed bottom-5 right-5 sm:right-8 z-50 max-w-md w-[calc(100%-2.5rem)] bg-slate-950/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border-2 border-amber-500 animate-slideIn no-print"
          dir="rtl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-extrabold text-amber-400">
                    تنبيه فوري: تحديث حالة الطلب عبر Firebase
                  </span>
                </div>
                <div className="text-sm font-black text-white font-mono mt-0.5">
                  {latestAlert.referenceNumber}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLatestAlert(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>تم تغيير الحالة لحظياً إلى:</span>
              <span className="font-mono text-slate-400">{latestAlert.formattedTime}</span>
            </div>

            <div className="flex items-center gap-2 justify-between pt-1">
              <div className="flex-1 bg-slate-800/80 px-2 py-1.5 rounded-lg border border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 block">السابقة:</span>
                <span className="font-bold text-slate-300 text-xs">
                  {getStatusBadge(latestAlert.oldStatus).label}
                </span>
              </div>

              <div className="text-amber-400 font-bold text-sm shrink-0">➔</div>

              <div className="flex-1 bg-emerald-950/80 px-2 py-1.5 rounded-lg border border-emerald-500/40 text-center">
                <span className="text-[10px] text-emerald-400 block font-semibold">الجديدة:</span>
                <span className="font-bold text-emerald-200 text-xs">
                  {getStatusBadge(latestAlert.newStatus).label}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              مزامنة فورية عبر Firestore
            </span>
            <button
              type="button"
              onClick={() => {
                setShowNotificationDrawer(true);
                setLatestAlert(null);
              }}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              سجل التنبيهات ({alertHistory.length})
            </button>
          </div>
        </div>
      )}

      {/* Search and Direct Navigation Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Share2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                متابعة وتتبع حالة الطلبات عبر الروابط
              </h2>

              {/* Real-time Firebase Status Indicator */}
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300/70 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span>اشتراك Firebase نشط</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              أدخل الرقم المرجعي للطلب أو تصفح الطلبات الحالية لمتابعة خط السير والاعتمادات بالرابط المباشر
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full">
            <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث برقم الطلب (مثال: WDM-MI26002)..."
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-4 py-2.5 font-mono focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
              >
                <span>تتبع</span>
              </button>
            </form>

            {/* Notification Bell & Live Center */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowNotificationDrawer(!showNotificationDrawer);
                  setHasUnreadAlert(false);
                }}
                className={`relative px-3 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none font-bold text-xs shadow-xs ${
                  hasUnreadAlert
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md animate-pulse ring-2 ring-amber-400'
                    : (audioSettings?.soundEnabled ?? soundEnabled)
                    ? 'bg-amber-50 hover:bg-amber-100/90 text-amber-900 border-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                }`}
                title="تنبيهات استلام الطلب الجديد وتغير الحالة اللحظية عبر Firebase"
              >
                {hasUnreadAlert ? (
                  <BellRing className="w-4 h-4 text-slate-950 animate-bounce" />
                ) : (
                  <Bell className={`w-4 h-4 ${(audioSettings?.soundEnabled ?? soundEnabled) ? 'text-amber-600' : 'text-slate-500'}`} />
                )}
                
                <span className="hidden sm:inline text-[11px]">التنبيهات</span>

                {(audioSettings?.soundEnabled ?? soundEnabled) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" title="التنبيهات الصوتية مشغلة" />
                )}

                {alertHistory.length > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {alertHistory.length}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotificationDrawer && (
                <div
                  className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-4 animate-scaleUp text-right"
                  dir="rtl"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">سجل التنبيهات المباشرة (Firebase)</h4>
                        <p className="text-[10px] text-slate-500">مراقبة التغييرات في الوقت الفعلي</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleAudioMaster) {
                            onToggleAudioMaster();
                          } else {
                            setSoundEnabled(!soundEnabled);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                        title={
                          (audioSettings ? audioSettings.soundEnabled : soundEnabled)
                            ? 'صوت التنبيه مفعّل (انقر للكتم)'
                            : 'صوت التنبيه مكتوم (انقر للتشغيل)'
                        }
                      >
                        {(audioSettings ? audioSettings.soundEnabled : soundEnabled) ? (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      {onOpenUserSettingsModal && (
                        <button
                          type="button"
                          onClick={onOpenUserSettingsModal}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          title="إعدادات المستخدم وتخصيص التنبيهات الصوتية"
                        >
                          <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotificationDrawer(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Realtime Subscription & Sound Status Box */}
                  <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                        </span>
                        <span className="text-slate-800 text-[11px] font-bold">
                          استماع Firebase المباشر: <span className="text-emerald-700">نشط لحظياً</span>
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        (audioSettings?.soundEnabled ?? soundEnabled)
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}>
                        {(audioSettings?.soundEnabled ?? soundEnabled) ? 'التنبيهات مفعّلة 🔊' : 'التنبيهات مكتومة 🔇'}
                      </span>
                    </div>

                    {/* Quick Toggles for user request: new order and status change */}
                    <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          if (audioSettings && onUpdateAudioSettings) {
                            const updated = {
                              ...audioSettings,
                              notifyOnStatusChange: !audioSettings.notifyOnStatusChange,
                              // If enabling this, ensure soundEnabled is true
                              soundEnabled: !audioSettings.notifyOnStatusChange ? true : audioSettings.soundEnabled
                            };
                            onUpdateAudioSettings(updated);
                            if (updated.notifyOnStatusChange) {
                              playTestAudio('status_change', updated.volume);
                              onShowToast?.('تم تفعيل تنبيه تغير حالة الطلب 🔔', 'success');
                            } else {
                              onShowToast?.('تم إيقاف تنبيه تغير حالة الطلب', 'info');
                            }
                          } else {
                            handleSimulateStatusChange();
                          }
                        }}
                        className={`p-2 rounded-lg border text-right transition flex items-center justify-between gap-1.5 cursor-pointer ${
                          audioSettings?.notifyOnStatusChange
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="تشغيل أو إيقاف التنبيه الصوتي عند تغير حالة الطلب"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Zap className={`w-3.5 h-3.5 shrink-0 ${audioSettings?.notifyOnStatusChange ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="truncate">تغير الحالة</span>
                        </div>
                        {audioSettings?.notifyOnStatusChange && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (audioSettings && onUpdateAudioSettings) {
                            const updated = {
                              ...audioSettings,
                              notifyOnNewOrder: !audioSettings.notifyOnNewOrder,
                              soundEnabled: !audioSettings.notifyOnNewOrder ? true : audioSettings.soundEnabled
                            };
                            onUpdateAudioSettings(updated);
                            if (updated.notifyOnNewOrder) {
                              playTestAudio('new_order', updated.volume);
                              onShowToast?.('تم تفعيل تنبيه استلام طلب جديد 📦', 'success');
                            } else {
                              onShowToast?.('تم إيقاف تنبيه استلام طلب جديد', 'info');
                            }
                          } else {
                            playNewOrderSound(0.7);
                            onShowToast?.('تم اختبار نغمة طلب جديد 📦', 'success');
                          }
                        }}
                        className={`p-2 rounded-lg border text-right transition flex items-center justify-between gap-1.5 cursor-pointer ${
                          audioSettings?.notifyOnNewOrder
                            ? 'bg-amber-50 text-amber-950 border-amber-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="تشغيل أو إيقاف التنبيه الصوتي عند استلام طلب جديد"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <BellRing className={`w-3.5 h-3.5 shrink-0 ${audioSettings?.notifyOnNewOrder ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span className="truncate">طلب جديد</span>
                        </div>
                        {audioSettings?.notifyOnNewOrder && (
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Test Audio Buttons */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-slate-500 font-medium">تجربة النغمات:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playNewOrderSound(audioSettings?.volume ?? 0.7);
                            onShowToast?.('تجربة نغمة استلام طلب جديد (C5 ➔ E5 ➔ G5) 📦', 'info');
                          }}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>نغمة طلب جديد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playStatusChangeSound(audioSettings?.volume ?? 0.7);
                            onShowToast?.('تجربة نغمة تغير حالة الطلب (D5 ➔ A5) 🔔', 'info');
                          }}
                          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>نغمة تغير الحالة</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* History List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {alertHistory.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        <Bell className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                        <p>لا توجد تنبيهات جديدة بعد.</p>
                        <p className="text-[10px] mt-0.5 text-slate-400">
                          سيظهر أي تعديل في حالة الطلب هنا فور اعتماده في Firebase مع إطلاق صوت التنبيه ورسالة الـ Toast.
                        </p>
                      </div>
                    ) : (
                      alertHistory.map((item) => {
                        const oldBadge = getStatusBadge(item.oldStatus);
                        const newBadge = getStatusBadge(item.newStatus);
                        return (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                                {item.referenceNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.formattedTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                              <span className="text-slate-500 text-[10px] line-through">{oldBadge.label}</span>
                              <span className="text-amber-600 font-bold">➔</span>
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {newBadge.label}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {alertHistory.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAlertHistory([]);
                          setLatestAlert(null);
                        }}
                        className="text-[10px] text-rose-600 hover:text-rose-700 font-medium transition cursor-pointer"
                      >
                        مسح السجل
                      </button>
                      <span className="text-[10px] text-slate-400">
                        {alertHistory.length} تنبيهات في هذه الجلسة
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {searchError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Quick select pills */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> نماذج طلبات جاهزة للتتبع:
          </span>
          {orders.slice(0, 5).map((ord) => {
            const isSelected = currentOrder?.id === ord.id;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => onSelectOrder(ord)}
                className={`text-xs px-3 py-1 rounded-lg border font-mono transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{ord.referenceNumber}</span>
                <span className="text-[10px] opacity-80">({ord.items.length} أصناف)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Notification Banner above the order sheet */}
      {latestAlert && latestAlert.referenceNumber === currentOrder?.referenceNumber && (
        <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border-2 border-amber-400/80 rounded-2xl p-4 shadow-sm animate-fadeIn flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0 animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md font-mono">
                  {latestAlert.referenceNumber}
                </span>
                <span className="text-xs font-black text-slate-900">
                  تم تحديث حالة هذا الطلب لحظياً الآن عبر Firebase!
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({latestAlert.formattedTime})
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                انتقل الطلب إلى: <strong className="text-emerald-800 font-extrabold">{getStatusBadge(latestAlert.newStatus).label}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setLatestAlert(null)}
              className="text-xs font-bold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer"
            >
              فهمت، إخفاء
            </button>
          </div>
        </div>
      )}

      {currentOrder ? (
        <>
          {/* View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveViewMode('SHEET')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  activeViewMode === 'SHEET'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>استمارة طلب الشراء الرسمية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode('STEPPER')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeViewMode === 'STEPPER'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>المسار الزمني وحجز المهام</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-medium px-2">
              الطلب الحالي: <strong className="font-mono text-slate-900 font-bold text-xs">{currentOrder.referenceNumber}</strong>
            </div>
          </div>

          {/* MODE 1: Official Requisition Sheet (Exact replica of photo with live status & WhatsApp sharing) */}
          {activeViewMode === 'SHEET' && (
            <div className="mt-2">
              <OfficialRequisitionSheet
                order={currentOrder}
                onStatusChange={(newStatus) => onQuickStatusChange && onQuickStatusChange(currentOrder.id, newStatus)}
                onUpdateOrder={onUpdateOrder}
                showControls={true}
              />
            </div>
          )}

          {/* MODE 2: Logistics Stepper & Task Ownership */}
          {activeViewMode === 'STEPPER' && (
            <div className="space-y-6">
              {/* Hero Tracking Link Card */}
              <div className="bg-slate-950 rounded-2xl p-5 sm:p-6 text-white shadow-xs border border-slate-800 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider font-mono">
                        {currentOrder.referenceNumber}
                      </span>
                      <span className="text-slate-300 text-xs font-semibold">
                        طلب مشتريات وتوريد ميداني
                      </span>
                      <PriorityBadge priority={currentOrder.priority} size="sm" showSla={true} />

                      {/* 5-tier lifecycle category badge */}
                      {lifecycle && (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${lifecycle.badgeBg} ${lifecycle.textColor} ${lifecycle.borderColor}`}>
                          {lifecycle.emoji} {lifecycle.label}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-extrabold text-white">
                      {currentOrder.purpose || 'طلب مستلزمات وتوريدات تشغيلية'}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>مقدم الطلب: <strong className="text-white">{currentOrder.requesterName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>تاريخ التقديم: <strong className="text-white font-mono">{currentOrder.orderDate}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        <span>الأصناف: <strong className="text-white font-mono">{currentOrder.items.length} صنف</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Share link action & WhatsApp Button */}
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl lg:max-w-md w-full space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                      <span className="flex items-center gap-1.5 text-amber-300">
                        <Share2 className="w-3.5 h-3.5" />
                        رابط متابعة الأعضاء على واتساب:
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        عرض عام
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1.5 px-2.5">
                      <input
                        type="text"
                        readOnly
                        value={trackingUrl}
                        className="text-[11px] font-mono text-amber-200 bg-transparent flex-1 outline-none truncate"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-md transition shrink-0 cursor-pointer ${
                          copied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الرابط</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* WhatsApp & Advanced Link Sharing Triggers */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-800">
                      {onOpenShareModal && (
                        <button
                          type="button"
                          onClick={() => onOpenShareModal(currentOrder)}
                          className="w-full sm:w-auto flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-slate-700"
                          title="توليد كافة الروابط المباشرة ورمز QR للمسح بالجوال"
                        >
                          <Share2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>إدارة الروابط وQR</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const waData = buildWhatsAppShareData(currentOrder);
                          window.open(waData.waDirectUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="w-full sm:w-auto flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="فتح واتساب مباشرة وإرسال رسالة منسقة بالرابط"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>مشاركة واتساب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenWhatsAppModal && onOpenWhatsAppModal(currentOrder)}
                        className="w-full sm:w-auto py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                        title="معاينة نموذج إشعار واتساب السحابي وتجربة حجز المهمة"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>محاكاة الإشعار</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

          {/* Task Ownership & Conflict Prevention Card (منع التضارب وتوزيع المهام) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  currentOrder.taskLock?.isLocked
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {currentOrder.taskLock?.isLocked ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>حجز المهمة وتوزيع العمل (Task Ownership & Conflict Prevention)</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      currentOrder.taskLock?.isLocked
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {currentOrder.taskLock?.isLocked ? 'محجوزة قيد التنفيذ' : 'متاحة للاستلام'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    نظام منع التضارب يمنع تكرار الشراء أو ازدواجية العمل بين أعضاء الفريق اللوجستي
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {currentOrder.taskLock?.isLocked ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-medium border border-slate-200">
                      قيد التنفيذ بواسطة: <strong>{currentOrder.taskLock.lockedBy}</strong>
                    </span>
                    {(currentUserRole === 'ADMIN' || currentUserRole === 'LOGISTICS_OFFICER') && (
                      <button
                        type="button"
                        onClick={() => onReleaseTaskLock && onReleaseTaskLock(currentOrder.id)}
                        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                        title="إلغاء الحجز وإتاحة المهمة لعضو آخر"
                      >
                        تحرير القفل
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onClaimTask && onClaimTask(currentOrder.id, currentUserName)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>⚡ استلام المهمة وحجزها الآن</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification alert on lock */}
            {currentOrder.taskLock?.isLocked ? (
              <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>تنبيه منع التضارب:</strong> تم حجز هذا الطلب بواسطة{' '}
                  <strong>{currentOrder.taskLock.lockedBy}</strong> بتاريخ{' '}
                  <span className="font-mono">{new Date(currentOrder.taskLock.lockedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>.
                  تم إغلاق خيار الاستلام أمام باقي الزملاء لمنع تكرار المراسلات أو ازدواجية الشراء.
                </span>
              </div>
            ) : (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  الطلب متاح حالياً. بمجرد الضغط على زر <strong>[استلام المهمة]</strong>، سيتم قفله باسمك مباشرة وإعلام المجموعة عبر الواتساب.
                </span>
              </div>
            )}
          </div>

          {/* Stepper Progress Bar (خط سير ومراحل الطلب) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>خط سير ومراحل الطلب الميداني (Live Stepper)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  مراحل الاعتماد الفني والمالي والتوريد المحدثة تلقائياً
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onOpenPrintView && (
                  <button
                    type="button"
                    onClick={() => onOpenPrintView(currentOrder)}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold border border-slate-200 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>معاينة للطباعة (PDF)</span>
                  </button>
                )}
                {onOpenDetailsModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDetailsModal(currentOrder)}
                    className="flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-bold border border-amber-200 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>التفاصيل الكاملة</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      step.isDone
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : step.isCurrent
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400 text-amber-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-500 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.isDone
                          ? 'bg-emerald-600 text-white'
                          : step.isCurrent
                          ? 'bg-amber-500 text-slate-950 font-extrabold animate-pulse'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {step.isDone ? '✓' : step.id}
                      </span>
                      <Icon className={`w-4 h-4 ${
                        step.isDone ? 'text-emerald-600' : step.isCurrent ? 'text-amber-600' : 'text-slate-400'
                      }`} />
                    </div>

                    <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                      {step.title}
                    </h5>
                    <p className="text-[11px] text-slate-600 truncate mt-1">
                      {step.subtitle}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className={`font-semibold ${
                        step.isDone
                          ? 'text-emerald-700'
                          : step.isCurrent
                          ? 'text-amber-800 font-bold'
                          : 'text-slate-400'
                      }`}>
                        {step.isDone ? 'تم بنجاح' : step.isCurrent ? 'قيد المتابعة الآن' : 'بانتظار المرحلة'}
                      </span>
                      {step.date && (
                        <span className="font-mono text-slate-500">{step.date}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Status Management Panel for elevated roles */}
            {(currentUserRole === 'ADMIN' || currentUserRole === 'SITE_MANAGER' || currentUserRole === 'DEPT_HEAD') && onQuickStatusChange && (
              <div className="mt-6 pt-4 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 p-4 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      إجراءات سريعة لتحديث الحالة (بصلاحيتك: {currentUserRole === 'ADMIN' ? 'مدير النظام' : 'المسؤول المعتمد'}):
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {currentOrder.status !== 'APPROVED_FOR_PO' && (
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(currentOrder.id, 'APPROVED_FOR_PO')}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                      >
                        اعتماد الطلب نهائياً
                      </button>
                    )}
                    {currentOrder.status !== 'PO_ISSUED' && (
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(currentOrder.id, 'PO_ISSUED')}
                        className="text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                      >
                        إصدار أمر الشراء (PO)
                      </button>
                    )}
                    {currentOrder.status !== 'DELIVERED_RECEIVED' && (
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(currentOrder.id, 'DELIVERED_RECEIVED')}
                        className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                      >
                        تأكيد استلام وتسليم
                      </button>
                    )}
                    {currentOrder.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => onQuickStatusChange(currentOrder.id, 'REJECTED')}
                        className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-3 py-1.5 rounded-lg border border-rose-300 transition cursor-pointer"
                      >
                        رفض الطلب
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Requested Items Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  <span>الأصناف والمواصفات المطلوبة ({currentOrder.items.length})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  تفاصيل المواد والمعدات والكميات المحددة في هذا الطلب
                </p>
              </div>

              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                إجمالي الأصناف: {currentOrder.items.reduce((acc, item) => acc + item.quantity, 0)} وحدة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">اسم الصنف والمواصفات الفنية</th>
                    <th className="p-3 w-28 text-center">الكمية المطلوبة</th>
                    <th className="p-3 w-28 text-center">الوحدة</th>
                    <th className="p-3">ملاحظات التشغيل والغرض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentOrder.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 text-center font-bold text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        {item.technicalSpecs && (
                          <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                            {item.technicalSpecs}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900 text-sm">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="p-3 text-center text-slate-600 font-semibold">
                        {item.unit}
                      </td>
                      <td className="p-3 text-slate-600 text-xs">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Audit Trail & Modification History for Current Order */}
      {currentOrder && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAuditTrailOpen((prev) => !prev)}
            className="w-full bg-slate-50/80 hover:bg-slate-100/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between transition cursor-pointer text-right"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center">
                <History className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>سجل التدقيق والتعديلات الفنية لهذا الطلب</span>
                  <span className="bg-amber-100 text-amber-900 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                    {
                      auditLogs.filter(
                        (l) =>
                          l.orderId === currentOrder.id ||
                          (currentOrder.referenceNumber &&
                            l.orderReference === currentOrder.referenceNumber) ||
                          (currentOrder.referenceNumber &&
                            l.target.includes(currentOrder.referenceNumber))
                      ).length
                    }{' '}
                    عملية موثقة
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  تتبع دقيق لكافة التعديلات التي طرأت على أصناف الطلب ومواصفاته واعتماداته
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>{isAuditTrailOpen ? 'طي السجل' : 'عرض التفاصيل والتعديلات'}</span>
              {isAuditTrailOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {isAuditTrailOpen && (
            <div className="p-5 space-y-3">
              {(() => {
                const relevantLogs = auditLogs.filter(
                  (l) =>
                    l.orderId === currentOrder.id ||
                    (currentOrder.referenceNumber &&
                      l.orderReference === currentOrder.referenceNumber) ||
                    (currentOrder.referenceNumber &&
                      l.target.includes(currentOrder.referenceNumber))
                );

                if (relevantLogs.length === 0) {
                  return (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      لم يتم تسجيل أي تعديلات سابقة على أصناف أو حالة هذا الطلب حتى الآن.
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {relevantLogs.map((log) => {
                      const isContentMod =
                        log.category === 'CONTENT_MODIFICATION' ||
                        Boolean(log.itemChanges && log.itemChanges.length > 0) ||
                        Boolean(log.fieldDiffs && log.fieldDiffs.length > 0);

                      return (
                        <div
                          key={log.id}
                          className={`p-4 rounded-xl border transition ${
                            isContentMod
                              ? 'bg-amber-50/40 border-amber-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  isContentMod
                                    ? 'bg-amber-500 text-slate-950'
                                    : log.category === 'APPROVAL'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : log.category === 'STATUS_CHANGE'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {log.action}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {log.userName}
                              </span>
                              <span className="text-[10px] text-slate-500">({log.userRole})</span>
                            </div>

                            <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                              {log.timestamp}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 mb-2 leading-relaxed">{log.details}</p>

                          {(log.itemChanges?.length ||
                            log.fieldDiffs?.length ||
                            log.summaryChanges?.length) ? (
                            <div className="mt-2 pt-2 border-t border-slate-200/70">
                              <AuditModificationDetails log={log} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">لا يوجد طلب محدد حالياً للمتابعة</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            يمكنك إدخال الرقم المرجعي لأي طلب في شريط البحث أعلاه، أو إنشاء طلب جديد ومتابعة رابطه فوراً.
          </p>
          <button
            type="button"
            onClick={onNavigateToCreate}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تقديم طلب مشتريات جديد الآن</span>
          </button>
        </div>
      )}
    </div>
  );
};
