import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CATALOG_ITEMS,
  DEPARTMENTS,
  INITIAL_ORDERS,
  SITES,
} from './data/initialData';
import {
  AppUser,
  AuditLogEntry,
  CatalogItem,
  Order,
  OrderStatus,
  RoleDefinition,
  UserRole,
  PriorityLevel,
  UserAudioSettings,
} from './types';
import { getPriorityMeta } from './utils/priority';
import {
  DEFAULT_ROLES,
  INITIAL_APP_USERS,
  INITIAL_AUDIT_LOGS,
} from './data/permissionsData';
import { INITIAL_ROLE_CONFIGS } from './data/rolesConfig';
import { Header, ActiveTabType } from './components/Header';
import { OrderTrackerView } from './components/OrderTrackerView';
import { OrderCreateView } from './components/OrderCreateView';
import { OrdersList } from './components/OrdersList';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { PrintableRequisition } from './components/PrintableRequisition';
import { RolePasswordModal } from './components/RolePasswordModal';
import { WhatsAppNotificationModal } from './components/WhatsAppNotificationModal';
import { TechnicalArchitectureView } from './components/TechnicalArchitectureView';
import { OrderMemberPortal } from './components/OrderMemberPortal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { ShareOrderLinksModal } from './components/ShareOrderLinksModal';
import { DailyBackupModal } from './components/DailyBackupModal';
import {
  evaluateAndRunDailyAutoBackup,
  hasTodayBackupRun,
} from './utils/backupManager';
import {
  playNewOrderSound,
  playStatusChangeSound,
  playTestAudio,
} from './utils/audioNotifications';
import { CheckCircle2, AlertTriangle, Info, ShieldCheck, Share2, PlusCircle, Server, Eye } from 'lucide-react';
import {
  subscribeToOrders,
  saveOrderToFirestore,
  saveAllOrdersToFirestore,
  fetchOrdersFromFirestore,
  seedInitialOrdersIfEmpty,
  testFirestoreConnection,
  testConnection,
  subscribeToAuth,
  signInWithGoogle,
  logOut,
  syncUserProfileToFirestore,
  getUserProfileFromFirestore,
  type UserProfileDoc,
} from './lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

function getStatusArabicLabel(status: OrderStatus): string {
  switch (status) {
    case 'DRAFT': return 'مسودة';
    case 'PENDING_DEPT_HEAD': return 'قيد مراجعة رئيس القسم';
    case 'PENDING_SITE_MANAGER': return 'قيد مصادقة مدير الموقع';
    case 'PENDING_GENERAL_MANAGER': return 'قيد الاعتماد المالي والتنفيذي';
    case 'APPROVED_FOR_PO': return 'معتمد نهائياً - قيد أمر التوريد';
    case 'PO_ISSUED': return 'تم إصدار أمر الشراء والتوريد';
    case 'DELIVERED_RECEIVED': return 'تم الاستلام والتسليم بالمستودع';
    case 'REJECTED': return 'مرفوض';
    case 'MODIFICATION_REQUESTED': return 'مطلوب استكمال مواصفات';
    default: return status;
  }
}

export default function App() {
  // Orders State with localStorage persistence
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('wdm_orders_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasMn26029 = parsed.some((o: Order) => o.referenceNumber === 'WDM-MN26029');
          if (!hasMn26029 && INITIAL_ORDERS.length > 0) {
            return [INITIAL_ORDERS[0], ...parsed];
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved orders', e);
      }
    }
    return INITIAL_ORDERS;
  });

  // Catalog items state
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('wdm_catalog_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved catalog', e);
      }
    }
    return CATALOG_ITEMS;
  });

  // RBAC Roles
  const [roles] = useState<RoleDefinition[]>(DEFAULT_ROLES);

  // Users state
  const [users] = useState<AppUser[]>(INITIAL_APP_USERS);

  // Security Audit Trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('wdm_audit_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved audit logs', e);
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Role passwords state with localStorage persistence
  const [rolePasswords, setRolePasswords] = useState<Record<UserRole, string>>(() => {
    const saved = localStorage.getItem('wdm_role_passwords');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse role passwords', e);
      }
    }
    const initialPasses: Record<string, string> = {};
    Object.values(INITIAL_ROLE_CONFIGS).forEach((cfg) => {
      initialPasses[cfg.role] = cfg.defaultPassword;
    });
    return initialPasses as Record<UserRole, string>;
  });

  // Current Active User Role (starts as REQUESTER so permissions are strictly applied)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('wdm_active_role');
    if (saved && (saved in INITIAL_ROLE_CONFIGS)) {
      return saved as UserRole;
    }
    return 'REQUESTER';
  });

  // Current Active Tab: 'create' | 'track' | 'manage'
  const [currentTab, setCurrentTab] = useState<ActiveTabType>('track');

  // Currently tracked order in Tracker View
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(orders[0] || null);

  // Selected Order for Details / Approval Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Selected Order for Printable Requisition
  const [printOrder, setPrintOrder] = useState<Order | null>(null);

  // WhatsApp Interactive Modal State
  const [whatsAppModalOrder, setWhatsAppModalOrder] = useState<Order | null>(null);

  // Role Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // User Settings & Audio Notifications Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Share Order Links Modal State (Direct WhatsApp & QR code & Links)
  const [shareLinksModalOrder, setShareLinksModalOrder] = useState<Order | null>(null);

  // User Audio Notification Settings with localStorage persistence
  const [audioSettings, setAudioSettings] = useState<UserAudioSettings>(() => {
    const saved = localStorage.getItem('wdm_audio_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.soundEnabled === 'boolean') {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved audio settings', e);
      }
    }
    return {
      soundEnabled: true,
      notifyOnStatusChange: true,
      notifyOnNewOrder: true,
      volume: 0.7,
    };
  });

  // Keep a ref to audioSettings so the Firebase listener gets updated state without re-subscribing
  const audioSettingsRef = useRef<UserAudioSettings>(audioSettings);
  useEffect(() => {
    audioSettingsRef.current = audioSettings;
    localStorage.setItem('wdm_audio_settings', JSON.stringify(audioSettings));
  }, [audioSettings]);

  // Previous orders map ref to accurately detect state transitions from real-time sync
  const previousOrdersMapRef = useRef<Map<string, OrderStatus>>(new Map());
  const isInitialOrdersSyncDoneRef = useRef(false);

  // Quick toggle master audio
  const handleToggleAudioMaster = () => {
    setAudioSettings((prev) => {
      const updated = { ...prev, soundEnabled: !prev.soundEnabled };
      if (updated.soundEnabled) {
        playTestAudio('status_change', updated.volume);
        showToast('تم تفعيل التنبيهات الصوتية 🔊', 'success');
      } else {
        showToast('تم كتم التنبيهات الصوتية 🔇', 'info');
      }
      return updated;
    });
  };

  // Member Read-Only Portal State (For links shared on WhatsApp)
  const [memberPortalOrder, setMemberPortalOrder] = useState<Order | null>(null);
  const [isMemberViewMode, setIsMemberViewMode] = useState<boolean>(false);

  // Daily Scheduled JSON Backup State
  const [isDailyBackupModalOpen, setIsDailyBackupModalOpen] = useState<boolean>(false);
  const [isTodayBackupReady, setIsTodayBackupReady] = useState<boolean>(() => hasTodayBackupRun());

  // Firebase Real-time Synchronization Status
  const [firebaseSyncStatus, setFirebaseSyncStatus] = useState<'connecting' | 'synced' | 'offline'>('connecting');
  const [isSavingCloudData, setIsSavingCloudData] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  });

  // Firebase Authentication State & Firestore User Profile
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileDoc | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Google Sign-In via Firebase Auth
  const handleSignInGoogle = async () => {
    try {
      setIsAuthLoading(true);
      const { user, profile } = await signInWithGoogle();
      setAuthUser(user);
      setUserProfile(profile);
      if (profile.role && profile.role in INITIAL_ROLE_CONFIGS) {
        setCurrentUserRole(profile.role as UserRole);
      }
      showToast(
        `مرحباً بك ${user.displayName || user.email}! تم تسجيل الدخول بنجاح عبر Google ومزامنة حسابك مع Firestore.`,
        'success'
      );
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      showToast(
        `تعذر تسجيل الدخول بواسطة Google: ${err?.message || 'يرجى التحقق من إعدادات المتصفح'}`,
        'warning'
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sign out from Firebase Auth
  const handleSignOut = async () => {
    try {
      await logOut();
      setAuthUser(null);
      setUserProfile(null);
      showToast('تم تسجيل الخروج بنجاح من حساب Google.', 'info');
    } catch (err) {
      console.error('Sign-Out Error:', err);
      showToast('تعذر تسجيل الخروج.', 'warning');
    }
  };

  // Auth State Observer
  useEffect(() => {
    const unsubAuth = subscribeToAuth(async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const profile = await syncUserProfileToFirestore(user);
          setUserProfile(profile);
          if (profile.role && profile.role in INITIAL_ROLE_CONFIGS) {
            setCurrentUserRole(profile.role as UserRole);
          }
        } catch (e) {
          console.warn('Profile sync warning:', e);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Manual Save and Sync to Firebase Cloud
  const handleManualSaveAndSync = async () => {
    setIsSavingCloudData(true);
    try {
      // 1. Sync to local storage
      localStorage.setItem('wdm_orders_data', JSON.stringify(orders));
      localStorage.setItem('wdm_catalog_data', JSON.stringify(catalogItems));
      localStorage.setItem('wdm_audit_logs', JSON.stringify(auditLogs));

      // 2. Sync to Firebase Firestore cloud database
      await saveAllOrdersToFirestore(orders);
      setFirebaseSyncStatus('synced');

      const nowTime = new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSavedTime(nowTime);

      showToast(
        `تم تفعيل المزامنة وحفظ كافة البيانات (${orders.length} طلب) في قاعدة بيانات Firebase السحابية بنجاح!`,
        'success'
      );
    } catch (err) {
      console.error('Manual save and sync error:', err);
      showToast('تم حفظ البيانات محلياً. جاري إعادة المحاولة للمزامنة السحابية...', 'warning');
    } finally {
      setIsSavingCloudData(false);
    }
  };

  // Scheduled Automatic Daily Local Backup (Runs once per calendar day)
  useEffect(() => {
    try {
      const result = evaluateAndRunDailyAutoBackup(orders, catalogItems, auditLogs);
      if (result.triggered) {
        setIsTodayBackupReady(true);
        if (result.fileDownloaded) {
          showToast(
            `تم إجراء النسخ الاحتياطي التلقائي اليومي وتنزيل ملف ${result.fileName} لضمان استمرارية العمل دون إنترنت.`,
            'info'
          );
        } else {
          showToast(
            `تم حفظ النسخة الاحتياطية اليومية بنجاح محلياً (${result.ordersCount} طلب شراء).`,
            'info'
          );
        }
      } else {
        setIsTodayBackupReady(true);
      }
    } catch (e) {
      console.warn('Daily backup auto-scheduler evaluation warning:', e);
    }
  }, []);

  // Handle restoring data from a JSON backup file
  const handleRestoreBackupData = (
    restoredOrders: Order[],
    restoredCatalog?: CatalogItem[],
    restoredLogs?: AuditLogEntry[]
  ) => {
    if (Array.isArray(restoredOrders) && restoredOrders.length > 0) {
      setOrders(restoredOrders);
      localStorage.setItem('wdm_orders_data', JSON.stringify(restoredOrders));
    }
    if (Array.isArray(restoredCatalog) && restoredCatalog.length > 0) {
      setCatalogItems(restoredCatalog);
      localStorage.setItem('wdm_catalog_data', JSON.stringify(restoredCatalog));
    }
    if (Array.isArray(restoredLogs) && restoredLogs.length > 0) {
      setAuditLogs(restoredLogs);
      localStorage.setItem('wdm_audit_logs', JSON.stringify(restoredLogs));
    }
    setIsTodayBackupReady(true);
    saveAllOrdersToFirestore(restoredOrders).catch((e) => {
      console.warn('Firestore sync after backup restore:', e);
    });
  };

  // Connect to Firebase and establish real-time Firestore sync
  useEffect(() => {
    // 1. Connection test
    testFirestoreConnection().catch((err) => {
      console.warn('Firebase test connection:', err);
    });

    // 2. Seed initial data if database is fresh
    seedInitialOrdersIfEmpty(INITIAL_ORDERS).catch((err) => {
      console.warn('Firestore seed check:', err);
    });

    // 3. Subscribe to real-time changes
    const unsubscribe = subscribeToOrders(
      (remoteOrders) => {
        if (remoteOrders && remoteOrders.length > 0) {
          // Check for incoming status changes or new orders from Firebase
          if (isInitialOrdersSyncDoneRef.current) {
            const prevMap = previousOrdersMapRef.current;
            const currentAudio = audioSettingsRef.current;

            // Brand new orders arriving from other users or sync
            const brandNewOrders = remoteOrders.filter(
              (ro) => !prevMap.has(ro.id) && !prevMap.has(ro.referenceNumber)
            );

            // Existing orders whose status changed
            const statusChanges: { order: Order; oldStatus: OrderStatus; newStatus: OrderStatus }[] = [];
            for (const ro of remoteOrders) {
              const prevStatus = prevMap.get(ro.id) || prevMap.get(ro.referenceNumber);
              if (prevStatus && prevStatus !== ro.status) {
                statusChanges.push({ order: ro, oldStatus: prevStatus, newStatus: ro.status });
              }
            }

            // Play audio notifications according to user configuration
            if (brandNewOrders.length > 0) {
              if (currentAudio.soundEnabled && currentAudio.notifyOnNewOrder) {
                playNewOrderSound(currentAudio.volume);
              }
              const latestNew = brandNewOrders[0];
              showToast(
                `🔔 تنبيه صوتي: وصل طلب شراء جديد [${latestNew.referenceNumber}] (${latestNew.purpose})!`,
                'info'
              );
            } else if (statusChanges.length > 0) {
              if (currentAudio.soundEnabled && currentAudio.notifyOnStatusChange) {
                playStatusChangeSound(currentAudio.volume);
              }
              const changed = statusChanges[0];
              showToast(
                `🔔 تنبيه صوتي: تم تحديث حالة الطلب [${changed.order.referenceNumber}] إلى: [${getStatusArabicLabel(changed.newStatus)}]`,
                'success'
              );
            }
          }

          // Update the cache of previous orders and their statuses
          const nextMap = new Map<string, OrderStatus>();
          remoteOrders.forEach((o) => {
            nextMap.set(o.id, o.status);
            nextMap.set(o.referenceNumber, o.status);
          });
          previousOrdersMapRef.current = nextMap;
          isInitialOrdersSyncDoneRef.current = true;

          setOrders(remoteOrders);
          setFirebaseSyncStatus('synced');
          setTrackedOrder((prev) => {
            if (!prev) return remoteOrders[0] || null;
            const match = remoteOrders.find(
              (o) => o.id === prev.id || o.referenceNumber === prev.referenceNumber
            );
            return match || prev;
          });
        } else {
          setFirebaseSyncStatus('synced');
        }
      },
      (error) => {
        console.warn('Firestore real-time subscription error, using local state:', error);
        setFirebaseSyncStatus('offline');
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('wdm_orders_data', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('wdm_role_passwords', JSON.stringify(rolePasswords));
  }, [rolePasswords]);

  useEffect(() => {
    localStorage.setItem('wdm_active_role', currentUserRole);
  }, [currentUserRole]);

  useEffect(() => {
    localStorage.setItem('wdm_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Helper to append audit log
  const handleAddAuditLog = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newLog: AuditLogEntry = {
      ...entry,
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Active User object
  const fallbackUser = users.find((u) => u.role === currentUserRole && u.isActive) || users[0];
  const activeUser: AppUser = {
    ...fallbackUser,
    id: authUser ? authUser.uid : fallbackUser.id,
    name: authUser?.displayName || fallbackUser.name,
    role: currentUserRole,
    departmentCode: userProfile?.departmentCode || fallbackUser.departmentCode,
    siteCode: userProfile?.siteCode || fallbackUser.siteCode,
    email: authUser?.email || fallbackUser.email,
  };

  // Helper to flexibly find order by reference number or ID with case-insensitivity & character normalization
  const findOrderFlexibly = useCallback((query: string, list: Order[]): Order | undefined => {
    if (!query) return undefined;
    const q = query.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/gi, '');
    return list.find((o) => {
      const ref = o.referenceNumber.toLowerCase();
      const cleanRef = ref.replace(/[^a-z0-9]/gi, '');
      const id = o.id.toLowerCase();
      return (
        ref === q ||
        cleanRef === cleanQ ||
        id === q ||
        ref.endsWith(q) ||
        o.sequenceNumber.toString() === q
      );
    });
  }, []);

  // URL Deep-linking for tracking via links (#track=... or ?track=... or ?view=... for members)
  useEffect(() => {
    const handleUrlTrack = () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash || '';
      const search = window.location.search || '';
      let viewQuery = '';
      let trackQuery = '';
      let isExplicitMemberView = false;

      if (search) {
        const params = new URLSearchParams(search);
        viewQuery = (params.get('view') || params.get('member') || '').trim();
        const readonly = params.get('readonly') === '1' || params.get('readonly') === 'true';
        const mode = params.get('mode') === 'member' || params.get('mode') === 'public';
        const orderParam = (params.get('order') || params.get('ref') || params.get('track') || '').trim();

        if (viewQuery) {
          isExplicitMemberView = true;
        } else if (orderParam && (readonly || mode)) {
          viewQuery = orderParam;
          isExplicitMemberView = true;
        } else if (orderParam) {
          trackQuery = orderParam;
        }
      }

      if (!viewQuery && !trackQuery && hash) {
        if (hash.startsWith('#view=')) {
          viewQuery = decodeURIComponent(hash.replace('#view=', '')).trim();
          isExplicitMemberView = true;
        } else if (hash.startsWith('#order=')) {
          trackQuery = decodeURIComponent(hash.replace('#order=', '')).trim();
        } else if (hash.startsWith('#track=')) {
          trackQuery = decodeURIComponent(hash.replace('#track=', '')).trim();
        } else if (hash.startsWith('#track/')) {
          trackQuery = decodeURIComponent(hash.replace('#track/', '')).trim();
        } else if (hash.startsWith('#ref=')) {
          trackQuery = decodeURIComponent(hash.replace('#ref=', '')).trim();
        }
      }

      if (isExplicitMemberView) {
        setIsMemberViewMode(true);
        if (viewQuery) {
          const found = findOrderFlexibly(viewQuery, orders);
          if (found) {
            setMemberPortalOrder(found);
          }
        }
      } else if (trackQuery) {
        const found = findOrderFlexibly(trackQuery, orders);
        if (found) {
          setTrackedOrder(found);
          setCurrentTab('track');
          setIsMemberViewMode(false);
        }
      }
    };

    handleUrlTrack();
    window.addEventListener('hashchange', handleUrlTrack);
    window.addEventListener('popstate', handleUrlTrack);
    return () => {
      window.removeEventListener('hashchange', handleUrlTrack);
      window.removeEventListener('popstate', handleUrlTrack);
    };
  }, [orders, findOrderFlexibly]);

  // Keep memberPortalOrder synchronized when orders update from Firestore
  useEffect(() => {
    if (memberPortalOrder) {
      const updated = orders.find(
        (o) => o.id === memberPortalOrder.id || o.referenceNumber === memberPortalOrder.referenceNumber
      );
      if (updated && updated !== memberPortalOrder) {
        setMemberPortalOrder(updated);
      }
    }
  }, [orders, memberPortalOrder]);

  // Select an order to track & update URL hash
  const handleSelectTrackOrder = (order: Order) => {
    setTrackedOrder(order);
    setCurrentTab('track');
    if (typeof window !== 'undefined') {
      window.location.hash = `#track=${order.referenceNumber}`;
    }
  };

  // Handle Order Submission
  const handleOrderSubmit = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    setTrackedOrder(newOrder);
    setCurrentTab('track');
    if (typeof window !== 'undefined') {
      window.location.hash = `#track=${newOrder.referenceNumber}`;
    }

    // Play new order chime if enabled
    if (audioSettings.soundEnabled && audioSettings.notifyOnNewOrder) {
      playNewOrderSound(audioSettings.volume);
    }

    // Save directly to Firebase Firestore
    saveOrderToFirestore(newOrder).catch((err) => {
      console.warn('Could not sync new order to Firestore:', err);
    });

    handleAddAuditLog({
      userId: activeUser.id,
      userName: newOrder.requesterName,
      userRole: currentUserRole,
      action: 'إنشاء طلب مشتريات وتوليد رابط التتبع',
      target: `الطلب: ${newOrder.referenceNumber}`,
      details: `تم إنشاء الطلب بنجاح وتوليد رابط التتبع المباشر وإرساله للاعتماد الميداني.`,
      ipAddress: '10.0.5.88 (الموقع الميداني)',
      severity: 'INFO',
    });

    showToast(
      `تم إنشاء الطلب بنجاح برقم ${newOrder.referenceNumber} ومزامنته سحابياً مع Firebase!`,
      'success'
    );
  };

  // Quick Status Change (from Tracker View or Admin)
  const handleQuickStatusChange = (orderId: string, newStatus: OrderStatus) => {
    let orderToSync: Order | null = null;

    // Play status change chime if enabled
    if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
      playStatusChangeSound(audioSettings.volume);
    }

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedOrder: Order = {
          ...order,
          status: newStatus,
          lastUpdated: new Date().toISOString(),
        };

        orderToSync = updatedOrder;

        if (trackedOrder?.id === orderId) {
          setTrackedOrder(updatedOrder);
        }
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }

        return updatedOrder;
      })
    );

    if (orderToSync) {
      saveOrderToFirestore(orderToSync).catch((err) => {
        console.warn('Could not sync status change to Firestore:', err);
      });
    }

    const targetOrder = orders.find((o) => o.id === orderId);
    handleAddAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: currentUserRole,
      action: 'تحديث حالة الطلب',
      target: `الطلب: ${targetOrder?.referenceNumber || orderId}`,
      details: `تم تغيير حالة الطلب إلى [${newStatus}] بواسطة [${INITIAL_ROLE_CONFIGS[currentUserRole]?.title}].`,
      ipAddress: '192.168.10.15',
      severity: 'INFO',
    });

    showToast(`تم تحديث حالة الطلب ومزامنته مع Firebase والرابط المباشر!`, 'success');
  };

  // Handle Order Updates (Manual items editing, metadata changes)
  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
    if (trackedOrder?.id === updatedOrder.id) {
      setTrackedOrder(updatedOrder);
    }
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    if (printOrder?.id === updatedOrder.id) {
      setPrintOrder(updatedOrder);
    }

    // Sync to Firestore
    saveOrderToFirestore(updatedOrder).catch((err) => {
      console.warn('Could not save updated order to Firestore:', err);
    });

    showToast(`تم حفظ الأصناف وبيانات الاستمارة ومزامنتها سحابياً مع Firebase!`, 'success');
  };

  // Handle Approval Stage
  const handleApproveStage = (
    orderId: string,
    stage: 'DEPT_HEAD' | 'SITE_MANAGER' | 'GENERAL_MANAGER',
    approverName: string,
    signatureData: string,
    comments?: string
  ) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        let nextStatus = order.status;
        if (stage === 'DEPT_HEAD') nextStatus = 'PENDING_SITE_MANAGER';
        else if (stage === 'SITE_MANAGER') nextStatus = 'PENDING_GENERAL_MANAGER';
        else if (stage === 'GENERAL_MANAGER') nextStatus = 'APPROVED_FOR_PO';

        const updatedApprovals = order.approvals.map((appr) => {
          if (appr.stage === stage) {
            return {
              ...appr,
              status: 'APPROVED' as const,
              approverName,
              timestamp: new Date().toISOString(),
              signatureDataUrl: signatureData,
              comments: comments || appr.comments,
            };
          }
          return appr;
        });

        const updatedOrder: Order = {
          ...order,
          status: nextStatus,
          approvals: updatedApprovals,
          lastUpdated: new Date().toISOString(),
        };

        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        if (trackedOrder?.id === orderId) {
          setTrackedOrder(updatedOrder);
        }

        return updatedOrder;
      })
    );

    if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
      playStatusChangeSound(audioSettings.volume);
    }

    showToast(`تم توثيق الاعتماد والتوقيع الرقمي بنجاح!`, 'success');
  };

  // Handle Rejection
  const handleRejectOrder = (orderId: string, reason: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedOrder: Order = {
          ...order,
          status: 'REJECTED',
          lastUpdated: new Date().toISOString(),
          approvals: order.approvals.map((appr) =>
            appr.status === 'PENDING'
              ? {
                  ...appr,
                  status: 'REJECTED' as const,
                  comments: `تم الرفض: ${reason}`,
                  timestamp: new Date().toISOString(),
                }
              : appr
          ),
        };

        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        if (trackedOrder?.id === orderId) {
          setTrackedOrder(updatedOrder);
        }

        return updatedOrder;
      })
    );

    if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
      playStatusChangeSound(audioSettings.volume);
    }

    showToast(`تم رفض الطلب وتحديث حالة التتبع بالرابط.`, 'warning');
  };

  // Handle Request Modification
  const handleRequestModification = (orderId: string, note: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedOrder: Order = {
          ...order,
          status: 'MODIFICATION_REQUESTED',
          lastUpdated: new Date().toISOString(),
          approvals: order.approvals.map((appr) =>
            appr.status === 'PENDING'
              ? {
                  ...appr,
                  status: 'MODIFICATION_REQUESTED' as const,
                  comments: `مطلوب استكمال: ${note}`,
                  timestamp: new Date().toISOString(),
                }
              : appr
          ),
        };

        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        if (trackedOrder?.id === orderId) {
          setTrackedOrder(updatedOrder);
        }

        return updatedOrder;
      })
    );

    if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
      playStatusChangeSound(audioSettings.volume);
    }

    showToast(`تم إرجاع الطلب إلى مقدمه لاستكمال المواصفات.`, 'info');
  };

  // Handle PO Issuance
  const handleIssuePO = (
    orderId: string,
    poData: { poNumber: string; vendor: string; shippingMethod: string; slaDays: number }
  ) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + poData.slaDays);

        const updatedOrder: Order = {
          ...order,
          status: 'PO_ISSUED',
          logistics: {
            ...poData,
            estimatedDeliveryDate: deliveryDate.toISOString().split('T')[0],
            inventoryUpdated: false,
          },
          lastUpdated: new Date().toISOString(),
        };

        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        if (trackedOrder?.id === orderId) {
          setTrackedOrder(updatedOrder);
        }

        return updatedOrder;
      })
    );

    if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
      playStatusChangeSound(audioSettings.volume);
    }

    showToast(`تم إصدار أمر الشراء رقم ${poData.poNumber} وتحديث مسار التتبع.`, 'success');
  };

  // Handle Receiving Delivery
  const handleReceiveDelivery = (orderId: string, receivedBy: string, receivingNotes: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedOrder: Order = {
          ...order,
          status: 'DELIVERED_RECEIVED',
          logistics: {
            ...order.logistics,
            receivedDate: new Date().toISOString().split('T')[0],
            receivedBy,
            receivingNotes,
            inventoryUpdated: true,
          },
          lastUpdated: new Date().toISOString(),
        };

        if (selectedOrder?.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
        if (trackedOrder?.id === orderId) {
          setTrackedOrder(updatedOrder);
        }

        return updatedOrder;
      })
    );

    if (audioSettings.soundEnabled && audioSettings.notifyOnStatusChange) {
      playStatusChangeSound(audioSettings.volume);
    }

    showToast(`تم تأكيد استلام الشحنة وإتمام مسار الطلب بنجاح!`, 'success');
  };

  // Role password update handler
  const handleUpdateRolePassword = (role: UserRole, newPass: string) => {
    setRolePasswords((prev) => ({ ...prev, [role]: newPass }));
    showToast(`تم تحديث كلمة المرور لدور [${INITIAL_ROLE_CONFIGS[role].title}] بنجاح!`, 'success');
  };

  // Switch role after password verification
  const handleSuccessRoleSwitch = (newRole: UserRole) => {
    setCurrentUserRole(newRole);
    if (newRole === 'REQUESTER' && currentTab === 'manage') {
      setCurrentTab('track');
    }
    showToast(`تم الدخول بصلاحية [${INITIAL_ROLE_CONFIGS[newRole].title}] بنجاح.`, 'success');
  };

  // Handle Task Claiming (Locking)
  const handleClaimTask = (orderId: string, claimantName: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedOrder: Order = {
          ...order,
          taskLock: {
            isLocked: true,
            lockedBy: claimantName,
            lockedById: activeUser.id,
            lockedAt: new Date().toISOString(),
          },
          lastUpdated: new Date().toISOString(),
        };

        if (trackedOrder?.id === orderId) setTrackedOrder(updatedOrder);
        if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);
        if (whatsAppModalOrder?.id === orderId) setWhatsAppModalOrder(updatedOrder);

        return updatedOrder;
      })
    );

    handleAddAuditLog({
      userId: activeUser.id,
      userName: claimantName,
      userRole: currentUserRole,
      action: 'حجز مهمة توريد طلب (منع التضارب)',
      target: `الطلب: ${orderId}`,
      details: `تم حجز المهمة بنجاح باسم [${claimantName}] وقفلها أمام باقي الأعضاء لتجنب الازدواجية.`,
      ipAddress: '10.0.5.88',
      severity: 'INFO',
    });

    showToast(`⚡ تم استلام المهمة بنجاح وحجزها باسم [${claimantName}]. تم قفلها أمام باقي الفريق لتفادي التضارب!`, 'success');
  };

  // Handle Task Lock Release
  const handleReleaseTaskLock = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;

        const updatedOrder: Order = {
          ...order,
          taskLock: {
            isLocked: false,
            lockedBy: '',
            lockedById: '',
            lockedAt: '',
          },
          lastUpdated: new Date().toISOString(),
        };

        if (trackedOrder?.id === orderId) setTrackedOrder(updatedOrder);
        if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);
        if (whatsAppModalOrder?.id === orderId) setWhatsAppModalOrder(updatedOrder);

        return updatedOrder;
      })
    );

    handleAddAuditLog({
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: currentUserRole,
      action: 'تحرير قفل مهمة توريد',
      target: `الطلب: ${orderId}`,
      details: `تم إلغاء القفل وإتاحة المهمة للاستلام مجدداً بواسطة الفريق.`,
      ipAddress: '10.0.5.88',
      severity: 'INFO',
    });

    showToast(`تم تحرير القفل وإتاحة المهمة للاستلام من قبل أعضاء الفريق اللوجستي.`, 'info');
  };

  // Handle Priority Level Update & Cloud Sync
  const handleUpdatePriority = (orderId: string, newPriority: PriorityLevel) => {
    let changedOrder: Order | null = null;
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const updatedOrder: Order = {
          ...order,
          priority: newPriority,
          lastUpdated: new Date().toISOString(),
        };
        changedOrder = updatedOrder;
        if (trackedOrder?.id === orderId) setTrackedOrder(updatedOrder);
        if (selectedOrder?.id === orderId) setSelectedOrder(updatedOrder);
        if (printOrder?.id === orderId) setPrintOrder(updatedOrder);
        return updatedOrder;
      })
    );

    if (changedOrder) {
      saveOrderToFirestore(changedOrder).catch((err) => {
        console.warn('Could not sync priority update to Firestore:', err);
      });
      const meta = getPriorityMeta(newPriority);
      showToast(`تم تصنيف أولوية الطلب إلى [${meta.label}] ومزامنة التغيير سحابياً!`, 'success');

      handleAddAuditLog({
        userId: activeUser.id,
        userName: activeUser.name,
        userRole: currentUserRole,
        action: 'تعديل تصنيف أولوية الطلب',
        target: `الطلب: ${orderId}`,
        details: `تم تعديل الأولوية إلى [${meta.fullLabel}].`,
        ipAddress: '10.0.5.88',
        severity: 'INFO',
      });
    }
  };

  // Render Member Read-Only Portal if in member view mode (From WhatsApp Link)
  if (isMemberViewMode) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
        {toastMessage && (
          <div
            className={`fixed bottom-6 left-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold border transition-all animate-bounce no-print ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-emerald-300 border-emerald-500'
                : toastMessage.type === 'warning'
                ? 'bg-slate-900 text-amber-300 border-amber-500'
                : 'bg-slate-900 text-blue-300 border-blue-500'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        <OrderMemberPortal
          order={memberPortalOrder}
          allOrders={orders}
          onSelectOrder={(ord) => {
            setMemberPortalOrder(ord);
            if (typeof window !== 'undefined') {
              window.history.replaceState(
                {},
                '',
                `${window.location.pathname}?view=${encodeURIComponent(ord.referenceNumber)}`
              );
            }
          }}
          onRefreshFromCloud={async () => {
            try {
              const remote = await fetchOrdersFromFirestore();
              if (remote && remote.length > 0) {
                setOrders(remote);
                showToast('تم تحديث أحدث بيانات الطلب من السحابة بنجاح', 'success');
              }
            } catch (err) {
              console.error('Refresh error in member portal', err);
            }
          }}
          onExitToStaffApp={() => {
            setIsMemberViewMode(false);
            setMemberPortalOrder(null);
            if (typeof window !== 'undefined') {
              window.history.replaceState({}, '', window.location.pathname);
            }
            showToast('تم الانتقال إلى لوحة المشرفين والإدارة', 'info');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold border transition-all animate-bounce no-print ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 text-emerald-300 border-emerald-500'
              : toastMessage.type === 'warning'
              ? 'bg-slate-900 text-amber-300 border-amber-500'
              : 'bg-slate-900 text-blue-300 border-blue-500'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
          {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUserRole={currentUserRole}
        onOpenRolePasswordModal={() => setIsPasswordModalOpen(true)}
        onOpenSamplePrint={() => {
          const sample = orders.find((o) => o.referenceNumber === 'WDM-MN26029') || orders[0];
          setPrintOrder(sample);
        }}
        onOpenWhatsAppSimulator={() => setWhatsAppModalOrder(trackedOrder || orders[0])}
        ordersCount={orders.length}
        firebaseSyncStatus={firebaseSyncStatus}
        onManualSaveAndSync={handleManualSaveAndSync}
        isSavingData={isSavingCloudData}
        lastSavedTime={lastSavedTime}
        audioSettings={audioSettings}
        onToggleAudioMaster={handleToggleAudioMaster}
        onOpenUserSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenBackupModal={() => setIsDailyBackupModalOpen(true)}
        isTodayBackupReady={isTodayBackupReady}
        authUser={authUser}
        userProfile={userProfile}
        isAuthLoading={isAuthLoading}
        onSignInWithGoogle={handleSignInGoogle}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 max-w-7xl mx-auto px-4 py-6 w-full">
        {/* TAB 1: Create Request */}
        {currentTab === 'create' && (
          <OrderCreateView
            sites={SITES}
            departments={DEPARTMENTS}
            catalogItems={catalogItems}
            existingOrders={orders}
            onSubmitOrder={handleOrderSubmit}
            onCancel={() => setCurrentTab('track')}
            defaultRequesterName={authUser?.displayName || activeUser.name}
            defaultRequesterEmail={authUser?.email || activeUser.email}
          />
        )}

        {/* TAB 2: Track Order via Link & Stepper */}
        {currentTab === 'track' && (
          <OrderTrackerView
            orders={orders}
            activeOrder={trackedOrder}
            onSelectOrder={handleSelectTrackOrder}
            onNavigateToCreate={() => setCurrentTab('create')}
            currentUserRole={currentUserRole}
            currentUserName={activeUser.name}
            onQuickStatusChange={handleQuickStatusChange}
            onOpenDetailsModal={(ord) => setSelectedOrder(ord)}
            onOpenPrintView={(ord) => setPrintOrder(ord)}
            onClaimTask={handleClaimTask}
            onReleaseTaskLock={handleReleaseTaskLock}
            onOpenWhatsAppModal={(ord) => setWhatsAppModalOrder(ord)}
            onOpenShareModal={(ord) => setShareLinksModalOrder(ord)}
            onUpdateOrder={handleUpdateOrder}
            onShowToast={showToast}
            audioSettings={audioSettings}
            onToggleAudioMaster={handleToggleAudioMaster}
            onUpdateAudioSettings={(newSettings) => setAudioSettings(newSettings)}
            onOpenUserSettingsModal={() => setIsSettingsModalOpen(true)}
          />
        )}

        {/* TAB 3: Management & Approvals (for authorized roles) */}
        {currentTab === 'manage' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    لوحة إدارة واعتماد الطلبات الميدانية
                  </h2>
                  <p className="text-xs text-slate-500">
                    أنت مسجل بصلاحية: <strong>{INITIAL_ROLE_CONFIGS[currentUserRole]?.title}</strong> • يمكنك فحص واعتماد وتحديث مسار أي طلب
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab('create')}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>طلب جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTab('track')}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition border border-slate-200 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>عرض التتبع المباشر بالرابط</span>
                </button>
              </div>
            </div>

            <OrdersList
              orders={orders}
              sites={SITES}
              departments={DEPARTMENTS}
              onSelectOrder={(ord) => setSelectedOrder(ord)}
              onOpenPrintView={(ord) => setPrintOrder(ord)}
              onOpenCreate={() => setCurrentTab('create')}
              onTrackOrder={(ord) => handleSelectTrackOrder(ord)}
              onUpdatePriority={handleUpdatePriority}
              onOpenMemberPortal={(ord) => {
                setMemberPortalOrder(ord);
                setIsMemberViewMode(true);
                if (typeof window !== 'undefined') {
                  window.history.pushState(
                    {},
                    '',
                    `${window.location.pathname}?view=${encodeURIComponent(ord.referenceNumber)}`
                  );
                }
              }}
              onOpenShareModal={(ord) => setShareLinksModalOrder(ord)}
              onShowToast={showToast}
            />
          </div>
        )}

        {/* TAB 4: Technical Architecture & System Blueprint */}
        {currentTab === 'architecture' && (
          <TechnicalArchitectureView />
        )}
      </main>

      {/* User Audio Settings Modal */}
      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUserRole={currentUserRole}
        currentUserName={activeUser.name}
        audioSettings={audioSettings}
        onSaveAudioSettings={(newSettings) => setAudioSettings(newSettings)}
        onOpenRolePasswordModal={() => setIsPasswordModalOpen(true)}
        onOpenDailyBackup={() => setIsDailyBackupModalOpen(true)}
        onShowToast={showToast}
      />

      {/* Scheduled Daily Local JSON Backup Modal */}
      <DailyBackupModal
        isOpen={isDailyBackupModalOpen}
        onClose={() => setIsDailyBackupModalOpen(false)}
        orders={orders}
        catalogItems={catalogItems}
        auditLogs={auditLogs}
        onRestoreData={handleRestoreBackupData}
        onShowToast={showToast}
      />

      {/* Share Order Links Modal (Public View, Staff Tracker, Direct WhatsApp, QR Code) */}
      <ShareOrderLinksModal
        isOpen={!!shareLinksModalOrder}
        onClose={() => setShareLinksModalOrder(null)}
        order={shareLinksModalOrder}
        onOpenMemberPortal={(ord) => {
          setMemberPortalOrder(ord);
          setIsMemberViewMode(true);
          if (typeof window !== 'undefined') {
            window.history.pushState(
              {},
              '',
              `${window.location.pathname}?view=${encodeURIComponent(ord.referenceNumber)}`
            );
          }
        }}
        onOpenStaffTracker={(ord) => {
          handleSelectTrackOrder(ord);
        }}
        onShowToast={showToast}
      />

      {/* WhatsApp Interactive Notification Simulator Modal */}
      {whatsAppModalOrder && (
        <WhatsAppNotificationModal
          isOpen={!!whatsAppModalOrder}
          onClose={() => setWhatsAppModalOrder(null)}
          order={whatsAppModalOrder}
          onClaimTask={(orderId, claimant) => handleClaimTask(orderId, claimant)}
          onViewOrder={(orderId) => {
            const found = orders.find(
              (o) => o.id === orderId || o.referenceNumber === orderId
            );
            if (found) {
              handleSelectTrackOrder(found);
            }
            setWhatsAppModalOrder(null);
          }}
        />
      )}

      {/* Role Password Modal */}
      <RolePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        currentRole={currentUserRole}
        onSuccessSwitch={handleSuccessRoleSwitch}
        rolePasswords={rolePasswords}
        onUpdateRolePassword={
          currentUserRole === 'ADMIN' ? handleUpdateRolePassword : undefined
        }
      />

      {/* Order Details & Digital Signatures Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          currentUserRole={currentUserRole}
          roles={roles}
          activeUser={activeUser}
          onNavigateToPermissions={() => setIsPasswordModalOpen(true)}
          onClose={() => setSelectedOrder(null)}
          onApprove={handleApproveStage}
          onReject={handleRejectOrder}
          onRequestModification={handleRequestModification}
          onIssuePO={handleIssuePO}
          onReceiveDelivery={handleReceiveDelivery}
          onOpenPrintView={(ord) => setPrintOrder(ord)}
        />
      )}

      {/* Printable Requisition / Invoice Modal */}
      {printOrder && (
        <PrintableRequisition
          order={printOrder}
          onClose={() => setPrintOrder(null)}
          onStatusChange={(newStatus) => {
            handleQuickStatusChange(printOrder.id, newStatus);
            setPrintOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
          }}
          onUpdateOrder={handleUpdateOrder}
        />
      )}

      {/* Simple Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 text-center no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-700">
              منصة إدارة وتتبع الطلبات الميدانية عبر الروابط
            </span>{' '}
            • مشروع منجم الجكوب
          </div>
          <div className="font-mono text-slate-400">
            Smart Reference Tracking • Deep Link Enabled (#track=CODE)
          </div>
        </div>
      </footer>
    </div>
  );
}
