import React from 'react';
import {
  PlusCircle,
  Share2,
  Printer,
  MessageSquare,
  FileText,
  Sparkles,
  ExternalLink,
  Cloud,
  CloudOff,
  RefreshCw,
  Save,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sliders,
  ShieldCheck,
  LogIn,
  LogOut,
  User as UserIcon,
  HardDrive,
  Download,
} from 'lucide-react';
import { UserRole, UserAudioSettings } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfileDoc } from '../lib/firebase';

export type ActiveTabType = 'create' | 'track' | 'manage' | 'architecture';

interface HeaderProps {
  currentTab: ActiveTabType;
  setCurrentTab: (tab: ActiveTabType) => void;
  currentUserRole?: UserRole;
  currentUserName?: string;
  onOpenRolePasswordModal?: () => void;
  onOpenSamplePrint: () => void;
  onOpenWhatsAppSimulator?: () => void;
  ordersCount: number;
  firebaseSyncStatus?: 'connecting' | 'synced' | 'offline';
  onManualSaveAndSync?: () => void;
  isSavingData?: boolean;
  lastSavedTime?: string | null;
  audioSettings?: UserAudioSettings;
  onToggleAudioMaster?: () => void;
  onOpenUserSettingsModal?: () => void;
  onOpenBackupModal?: () => void;
  isTodayBackupReady?: boolean;
  // Firebase Auth props
  authUser?: FirebaseUser | null;
  userProfile?: UserProfileDoc | null;
  isAuthLoading?: boolean;
  onSignInWithGoogle?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUserRole,
  currentUserName,
  onOpenRolePasswordModal,
  onOpenSamplePrint,
  onOpenWhatsAppSimulator,
  ordersCount,
  firebaseSyncStatus = 'synced',
  onManualSaveAndSync,
  isSavingData = false,
  lastSavedTime,
  audioSettings,
  onToggleAudioMaster,
  onOpenUserSettingsModal,
  onOpenBackupModal,
  isTodayBackupReady = false,
  authUser,
  userProfile,
  isAuthLoading = false,
  onSignInWithGoogle,
  onSignOut,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs no-print" id="main-header">
      {/* Top Executive Status Strip */}
      <div className="bg-slate-950 text-slate-200 px-4 py-1.5 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* System Identity & Realtime Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-slate-100 tracking-normal text-[11px] sm:text-xs">
                منظومة استمارات وتتبع طلبات الشراء الميدانية
              </span>
            </div>
            <span className="text-slate-700 hidden md:inline">•</span>
            <span className="text-amber-400/90 text-[11px] font-mono hidden md:inline">
              مشروع الجكوب للتعدين (WDM MINING ERP)
            </span>
          </div>

          {/* Quick Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Audio Mute / Unmute Toggle */}
            {audioSettings && onToggleAudioMaster && (
              <button
                type="button"
                onClick={onToggleAudioMaster}
                className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                  audioSettings.soundEnabled
                    ? 'text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-700/80'
                    : 'text-slate-400 bg-slate-900 hover:bg-slate-800 border-slate-800'
                }`}
                title={
                  audioSettings.soundEnabled
                    ? 'التنبيهات الصوتية: مفعّلة (انقر لكتم الصوت)'
                    : 'التنبيهات الصوتية: مكتومة (انقر لتشغيل الصوت)'
                }
              >
                {audioSettings.soundEnabled ? (
                  <>
                    <Volume2 className="w-3 h-3 text-emerald-400" />
                    <span>الصوت مفعّل</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3 h-3 text-slate-400" />
                    <span>الصوت مكتوم</span>
                  </>
                )}
              </button>
            )}

            {/* User & Audio Settings Modal Trigger */}
            {onOpenUserSettingsModal && (
              <button
                type="button"
                onClick={onOpenUserSettingsModal}
                className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition text-[11px] bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 font-medium cursor-pointer"
                title="تخصيص نغمات التنبيه ومستوى الصوت"
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>إعدادات الصوت</span>
              </button>
            )}

            {/* Daily Scheduled Backup Trigger */}
            {onOpenBackupModal && (
              <button
                type="button"
                onClick={onOpenBackupModal}
                id="btn-daily-backup-header"
                className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition text-[11px] bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 font-medium cursor-pointer"
                title="النسخ الاحتياطي التلقائي اليومي للبيانات المحلية إلى ملف JSON"
              >
                <HardDrive className="w-3 h-3 text-amber-400" />
                <span>النسخ الاحتياطي اليومي</span>
                {isTodayBackupReady && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                    title="نسخة اليوم متوفرة ومحفوظة محلياً"
                  />
                )}
              </button>
            )}

            {/* Direct Official Requisition sample */}
            <button
              type="button"
              onClick={onOpenSamplePrint}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition text-[11px] bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 font-medium cursor-pointer"
              title="معاينة وطباعة الاستمارة الرسمية للطلب النموذجي"
            >
              <Printer className="w-3 h-3 text-amber-400" />
              <span>الاستمارة الرسمية</span>
            </button>

            {/* WhatsApp Simulator trigger */}
            {onOpenWhatsAppSimulator && (
              <button
                type="button"
                onClick={onOpenWhatsAppSimulator}
                className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition text-[11px] bg-emerald-950/60 hover:bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-800/80 font-medium cursor-pointer"
                title="محاكاة مشاركة كارت الطلب ورسائل القروب في واتساب"
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>محاكي الواتساب</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Brand & Action Center */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          {/* Logo & Project Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm border border-amber-400/40 shrink-0">
              <span className="tracking-tighter font-mono">WDM</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  مشروع الجكوب للتعدين
                </h1>
                <span className="text-slate-300 hidden sm:inline">/</span>
                <span className="text-sm font-extrabold text-slate-700 hidden sm:inline">
                  إدارة وتتبع المشتريات الميدانية
                </span>
                <span className="bg-amber-100/80 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-300/80">
                  Firebase Auth & Firestore
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                توليد الأرقام المرجعية الذكية • إدخال الأصناف يدوياً • روابط مباشرة لمتابعة الأعضاء وتحديثات Firebase اللحظية
              </p>
            </div>
          </div>

          {/* Action Center (Save, Sync status, Orders count & Auth) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Primary Save & Sync Button */}
            {onManualSaveAndSync && (
              <button
                type="button"
                onClick={onManualSaveAndSync}
                disabled={isSavingData}
                id="btn-save-cloud-data"
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs px-3 py-2 rounded-xl shadow-xs transition cursor-pointer border border-emerald-600 disabled:opacity-50"
                title="حفظ ومزامنة كافة التغييرات والطلبات في قاعدة بيانات Firebase Firestore"
              >
                {isSavingData ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-100 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-100" />
                    <span>حفظ سحابي</span>
                    <span className="bg-emerald-800/60 text-emerald-100 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                      Firestore
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Firebase Live Cloud Sync Indicator */}
            {firebaseSyncStatus === 'synced' && (
              <div
                className="text-xs bg-emerald-50/90 border border-emerald-200 text-emerald-800 py-1.5 px-2.5 rounded-xl flex items-center gap-2 font-bold shadow-2xs"
                title="البيانات متصلة ومزامنة لحظياً مع قاعدة بيانات Firebase Firestore"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div className="flex flex-col text-right">
                  <span className="leading-tight text-[11px]">مزامنة نشطة</span>
                  {lastSavedTime && (
                    <span className="text-[9px] text-emerald-700 font-mono font-normal">
                      {lastSavedTime}
                    </span>
                  )}
                </div>
              </div>
            )}

            {firebaseSyncStatus === 'connecting' && (
              <div
                className="text-xs bg-amber-50 border border-amber-200 text-amber-800 py-1.5 px-2.5 rounded-xl flex items-center gap-1.5 font-bold"
                title="جاري الاتصال بقاعدة بيانات Firebase Firestore..."
              >
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                <span className="text-[11px]">جاري الربط...</span>
              </div>
            )}

            {firebaseSyncStatus === 'offline' && (
              <div
                className="text-xs bg-slate-100 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl flex items-center gap-1.5 font-bold"
                title="يعمل النظام حالياً في وضع التخزين المحلي"
              >
                <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px]">تخزين محلي</span>
              </div>
            )}

            {/* Total Orders Counter */}
            <div className="text-xs bg-slate-100/80 border border-slate-200 py-1.5 px-2.5 rounded-xl flex items-center gap-1.5 text-slate-700">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold text-[11px]">الطلبات:</span>
              <span className="font-mono font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                {ordersCount}
              </span>
            </div>

            {/* Google Authentication Component */}
            {isAuthLoading ? (
              <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs py-1.5 px-3 rounded-xl border border-slate-200">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>التحقق من الحساب...</span>
              </div>
            ) : authUser ? (
              <div
                className="flex items-center gap-2 bg-slate-900 text-white py-1 px-2.5 rounded-xl border border-slate-800 shadow-xs"
                title={`مسجل الدخول كـ: ${authUser.email}`}
              >
                {authUser.photoURL ? (
                  <img
                    src={authUser.photoURL}
                    alt={authUser.displayName || 'User'}
                    className="w-6 h-6 rounded-full border border-amber-400/60 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">
                    {authUser.displayName?.[0] || authUser.email?.[0] || 'U'}
                  </div>
                )}
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-bold text-slate-100 truncate max-w-[110px] sm:max-w-[140px]">
                    {authUser.displayName || authUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] text-amber-300 font-mono">
                    {userProfile?.role || currentUserRole || 'عضو'}
                  </span>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-slate-400 hover:text-rose-400 transition p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
                    title="تسجيل الخروج من Firebase"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              onSignInWithGoogle && (
                <button
                  type="button"
                  onClick={onSignInWithGoogle}
                  id="btn-google-signin"
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs hover:border-slate-400 transition cursor-pointer"
                  title="تسجيل الدخول الآمن بحساب Google عبر Firebase Auth"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>دخول Google</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <nav className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 overflow-x-auto text-xs sm:text-sm font-semibold">
          {/* Tab 1: Official Requisition & Track via Link */}
          <button
            type="button"
            onClick={() => setCurrentTab('track')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
              currentTab === 'track'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-bold border border-transparent'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>استمارة طلب الشراء وتتبع الرابط</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                currentTab === 'track' ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-100 text-slate-700'
              }`}
            >
              الاستمارة الرسمية
            </span>
          </button>

          {/* Tab 2: Create Request with Manual Entry */}
          <button
            type="button"
            onClick={() => setCurrentTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
              currentTab === 'create'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-bold border border-transparent'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>تقديم طلب شراء جديد (إدخال الأصناف يدوياً)</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                currentTab === 'create' ? 'bg-amber-600/30 text-slate-950' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              إدخال يدوي
            </span>
          </button>

          {/* Tab 3: Management & Approvals */}
          <button
            type="button"
            onClick={() => setCurrentTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
              currentTab === 'manage'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 font-bold border border-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>لوحة إدارة وجدول الطلبات</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                currentTab === 'manage' ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-100 text-slate-700'
              }`}
            >
              الجدول والتقارير
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
};

