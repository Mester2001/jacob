import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Eye,
  ShieldCheck,
  X,
  Smartphone,
  Globe,
  Link as LinkIcon,
  Send,
} from 'lucide-react';
import { Order } from '../types';
import {
  generateMemberViewUrl,
  generateStaffTrackUrl,
  generateQrCodeUrl,
  copyToClipboardSafe,
  buildWhatsAppShareData,
} from '../utils/linkSharing';

interface ShareOrderLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOpenMemberPortal?: (order: Order) => void;
  onOpenStaffTracker?: (order: Order) => void;
  onShowToast?: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ShareOrderLinksModal: React.FC<ShareOrderLinksModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenMemberPortal,
  onOpenStaffTracker,
  onShowToast,
}) => {
  const [copiedType, setCopiedType] = useState<'member' | 'staff' | 'message' | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  if (!isOpen || !order) return null;

  const memberUrl = generateMemberViewUrl(order.referenceNumber);
  const staffUrl = generateStaffTrackUrl(order.referenceNumber);
  const qrUrl = generateQrCodeUrl(memberUrl, 200);
  const { messageText, waDirectUrl } = buildWhatsAppShareData(order);

  const handleCopy = async (text: string, type: 'member' | 'staff' | 'message') => {
    const success = await copyToClipboardSafe(text);
    if (success) {
      setCopiedType(type);
      if (onShowToast) {
        onShowToast(
          type === 'member'
            ? 'تم نسخ رابط متابعة الأعضاء (عرض فقط) بنجاح!'
            : type === 'staff'
            ? 'تم نسخ رابط التتبع الإداري الداخلي بنجاح!'
            : 'تم نسخ نص الرسالة الإشعارية الجاهزة لواتساب!',
          'success'
        );
      }
      setTimeout(() => setCopiedType(null), 2500);
    } else {
      if (onShowToast) {
        onShowToast('تعذر النسخ التلقائي، يرجى التحديد والنسخ يدوياً', 'warning');
      }
    }
  };

  const handleOpenWhatsApp = () => {
    window.open(waDirectUrl, '_blank', 'noopener,noreferrer');
    if (onShowToast) {
      onShowToast('جاري فتح تطبيق WhatsApp وإرفاق الرابط المباشر...', 'info');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs no-print animate-fadeIn"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">إدارة ومشاركة روابط الطلب</h3>
                <span className="font-mono text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black">
                  {order.referenceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                توليد روابط تتبع ذكية للأعضاء والإدارة متوافقة مع الوتساب والأجهزة الذكية
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700 bg-slate-50/50 flex-1">
          {/* Direct WhatsApp Share Banner */}
          <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-950">إرسال فوري إلى واتساب (WhatsApp)</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  فتح المحادثة مباشرة برسالة رسمية منسقة تحتوي كافة بيانات الطلب ورابط المتابعة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black px-3.5 py-2 rounded-xl text-xs transition shadow-xs cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>مشاركة على واتساب</span>
            </button>
          </div>

          {/* Link Type 1: Public Member View Link */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>1. رابط متابعة الأعضاء (عرض فقط دون تسجيل دخول)</span>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold border border-blue-200">
                لفرق الميدان والمقدم
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              هذا الرابط مخصص للأعضاء ومقدمي الطلبات؛ يعرض تفاصيل الطلب وحالته المباشرة من السحابة دون إمكانية التعديل أو الاعتماد.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
              <input
                type="text"
                readOnly
                value={memberUrl}
                className="font-mono text-[11px] text-blue-700 bg-transparent flex-1 outline-none truncate select-all"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => handleCopy(memberUrl, 'member')}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition shrink-0 cursor-pointer ${
                  copiedType === 'member'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {copiedType === 'member' ? (
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

            <div className="flex items-center gap-2 pt-1">
              {onOpenMemberPortal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMemberPortal(order);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة صفحة العضو الآن</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-800 hover:underline cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-600" />
                <span>{showQrCode ? 'إخفاء رمز QR' : 'إظهار رمز QR للمسح بالجوال'}</span>
              </button>
            </div>

            {/* QR Code view */}
            {showQrCode && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-center animate-fadeIn">
                <img
                  src={qrUrl}
                  alt={`QR Code ${order.referenceNumber}`}
                  className="w-36 h-36 bg-white p-2 rounded-lg border border-slate-300 shadow-xs"
                />
                <p className="text-[11px] text-slate-600 font-medium">
                  امسح الرمز بكاميرا الجوال لفتح صفحة متابعة الطلب فوراً في الموقع الميداني
                </p>
              </div>
            )}
          </div>

          {/* Link Type 2: Staff Tracker Link */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>2. رابط التتبع والاعتماد الداخلي (لوحة المشرفين)</span>
              </div>
              <span className="text-[10px] bg-amber-50 text-amber-900 px-2 py-0.5 rounded font-bold border border-amber-200">
                للإدارة والمشرفين
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              هذا الرابط يفتح شاشة التتبع والاعتماد الإدارية مع مراحل التوقيع وتحديث الحالة اللوجستية للمشرفين المخولين.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
              <input
                type="text"
                readOnly
                value={staffUrl}
                className="font-mono text-[11px] text-amber-800 bg-transparent flex-1 outline-none truncate select-all"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => handleCopy(staffUrl, 'staff')}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition shrink-0 cursor-pointer ${
                  copiedType === 'staff'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs'
                }`}
              >
                {copiedType === 'staff' ? (
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

            {onOpenStaffTracker && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStaffTracker(order);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في شاشة التتبع والاعتماد</span>
                </button>
              </div>
            )}
          </div>

          {/* Formatted Text Preview */}
          <div className="bg-slate-100 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                نص الرسالة المنسقة للمجموعات والبريد:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(messageText, 'message')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copiedType === 'message' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم نسخ النص!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ النص كاملاً</span>
                  </>
                )}
              </button>
            </div>
            <pre className="font-sans text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
              {messageText}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[10px]">
            Deep-link syntax: ?view=REF (public) & #track=REF (staff)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
