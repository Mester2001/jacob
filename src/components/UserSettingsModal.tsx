import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  BellRing,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  User,
  ShieldCheck,
  KeyRound,
  Info,
  Play,
  RotateCcw,
  HardDrive,
} from 'lucide-react';
import { UserRole, UserAudioSettings } from '../types';
import { INITIAL_ROLE_CONFIGS } from '../data/rolesConfig';
import { playTestAudio } from '../utils/audioNotifications';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  currentUserName: string;
  audioSettings: UserAudioSettings;
  onSaveAudioSettings: (newSettings: UserAudioSettings) => void;
  onOpenRolePasswordModal?: () => void;
  onOpenDailyBackup?: () => void;
  onShowToast?: (text: string, type?: 'success' | 'warning' | 'info') => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  currentUserName,
  audioSettings,
  onSaveAudioSettings,
  onOpenRolePasswordModal,
  onOpenDailyBackup,
  onShowToast,
}) => {
  const [settings, setSettings] = useState<UserAudioSettings>(audioSettings);
  const [isPlayingPreview, setIsPlayingPreview] = useState<'new_order' | 'status_change' | null>(null);

  // Sync state when modal opens
  React.useEffect(() => {
    setSettings(audioSettings);
  }, [audioSettings, isOpen]);

  if (!isOpen) return null;

  const roleConfig = INITIAL_ROLE_CONFIGS[currentUserRole];

  const handleToggleMaster = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    if (!settings.soundEnabled) {
      // If toggling on, play a pleasant chime
      playTestAudio('status_change', settings.volume);
    }
  };

  const handleTestSound = (type: 'new_order' | 'status_change') => {
    setIsPlayingPreview(type);
    playTestAudio(type, settings.volume);
    setTimeout(() => {
      setIsPlayingPreview(null);
    }, 700);
  };

  const handleResetDefaults = () => {
    const defaults: UserAudioSettings = {
      soundEnabled: true,
      notifyOnStatusChange: true,
      notifyOnNewOrder: true,
      volume: 0.7,
    };
    setSettings(defaults);
    playTestAudio('new_order', 0.7);
    if (onShowToast) {
      onShowToast('تم استعادة الإعدادات الافتراضية للصوت والتنبيهات', 'info');
    }
  };

  const handleSave = () => {
    onSaveAudioSettings(settings);
    if (onShowToast) {
      onShowToast(
        settings.soundEnabled
          ? 'تم حفظ إعدادات الصوت والتنبيهات بنجاح!'
          : 'تم كتم التنبيهات الصوتية وحفظ الإعدادات بنجاح.',
        'success'
      );
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
      id="user-settings-modal"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto border border-slate-200 animate-scaleUp">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>إعدادات المستخدم والتنبيهات الصوتية</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                تخصيص التنبيهات الصوتية لحالات الطلبات والوصول الميداني
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

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs sm:text-sm text-slate-700 max-h-[80vh] overflow-y-auto">
          {/* User Account / Active Profile Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-xs sm:text-sm">
                    {currentUserName}
                  </span>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-300">
                    {roleConfig?.title || currentUserRole}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  الصلاحية الميدانية الحالية في منظومة مشتريات منجم الجكوب
                </p>
              </div>
            </div>

            {onOpenRolePasswordModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRolePasswordModal();
                }}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-300 transition flex items-center gap-1 cursor-pointer shrink-0"
                title="تغيير الصلاحية أو كلمة المرور"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>التبديل / كلمة المرور</span>
              </button>
            )}
          </div>

          {/* Master Audio Toggle */}
          <div
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
              settings.soundEnabled
                ? 'bg-emerald-50/70 border-emerald-500/80 shadow-xs'
                : 'bg-slate-50 border-slate-300'
            }`}
            onClick={handleToggleMaster}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    settings.soundEnabled
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-5 h-5 animate-pulse" />
                  ) : (
                    <VolumeX className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                      التنبيهات الصوتية العامة (Audio Notifications)
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        settings.soundEnabled
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {settings.soundEnabled ? 'مفعّلة 🔊' : 'مكتومة 🔇'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تشغيل أو إيقاف كافة نغمات التنبيه الصوتية داخل التطبيق
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${
                  settings.soundEnabled ? 'bg-emerald-600 justify-start' : 'bg-slate-300 justify-end'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition" />
              </div>
            </div>
          </div>

          {/* Audio Sub-settings (Disabled when master toggle is off) */}
          <div
            className={`space-y-3 transition-opacity ${
              settings.soundEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-amber-600" />
              <span>تخصيص أحداث التنبيهات الصوتية:</span>
            </h4>

            {/* Event 1: Status Change Notification */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-status-change"
                  checked={settings.notifyOnStatusChange}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyOnStatusChange: e.target.checked })
                  }
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="chk-status-change" className="cursor-pointer">
                  <span className="font-bold text-slate-900 block text-xs">
                    تنبيه صوتي عند تغيير حالة الطلب
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    نغمة ثنائية رسمية (D5 ➔ A5) تنطلق فور اعتماد أو تحديث حالة الطلب
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => handleTestSound('status_change')}
                disabled={!settings.soundEnabled}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg text-[11px] font-bold border border-slate-300 hover:border-amber-400 transition flex items-center gap-1 shrink-0 cursor-pointer"
                title="استمع لتجربة نغمة تغيير الحالة"
              >
                <Play
                  className={`w-3 h-3 text-amber-600 ${
                    isPlayingPreview === 'status_change' ? 'animate-spin' : ''
                  }`}
                />
                <span>تجربة النغمة</span>
              </button>
            </div>

            {/* Event 2: New Order Notification */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="chk-new-order"
                  checked={settings.notifyOnNewOrder}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyOnNewOrder: e.target.checked })
                  }
                  className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="chk-new-order" className="cursor-pointer">
                  <span className="font-bold text-slate-900 block text-xs">
                    تنبيه صوتي عند وصول طلب شراء جديد
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    نغمة ثلاثية صاعدة (C5 ➔ E5 ➔ G5) تنطلق عند تسجيل طلب جديد للمنظومة
                  </span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => handleTestSound('new_order')}
                disabled={!settings.soundEnabled}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg text-[11px] font-bold border border-slate-300 hover:border-amber-400 transition flex items-center gap-1 shrink-0 cursor-pointer"
                title="استمع لتجربة نغمة الطلب الجديد"
              >
                <Play
                  className={`w-3 h-3 text-amber-600 ${
                    isPlayingPreview === 'new_order' ? 'animate-spin' : ''
                  }`}
                />
                <span>تجربة النغمة</span>
              </button>
            </div>

            {/* Volume Slider */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">مستوى صوت التنبيهات:</span>
                <span className="font-mono font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 text-[11px]">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSettings({ ...settings, volume: val });
                }}
                onMouseUp={() => playTestAudio('status_change', settings.volume)}
                onTouchEnd={() => playTestAudio('status_change', settings.volume)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>هادئ (10%)</span>
                <span>متوسط (50%)</span>
                <span>مرتفع (100%)</span>
              </div>
            </div>
          </div>

          {/* System Audio Info / Web Audio API Note */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              يتم توليد النغمات عبر <strong>Web Audio API</strong> المدمجة بالمتصفح بجودة عالية
              ودون الحاجة لملفات خارجية، ويتم حفظ تفضيلاتك تلقائياً على جهازك لتستمر في كافة الجلسات.
            </p>
          </div>

          {/* Daily Scheduled JSON Backup Entry */}
          {onOpenDailyBackup && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    النسخ الاحتياطي التلقائي اليومي (JSON)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    جدولة تنزيل وحفظ نسخة كاملة من البيانات محلياً ضد انقطاع الإنترنت
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDailyBackup();
                }}
                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-300 hover:border-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>فتح الجدولة والنسخ</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
