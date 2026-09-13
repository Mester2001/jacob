import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
  Share2,
  Copy,
  AlertTriangle,
  Lock,
  Search,
  ExternalLink,
  ArrowRight,
  Truck,
  CheckCheck,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { getPriorityMeta } from '../utils/priority';
import { OfficialRequisitionSheet } from './OfficialRequisitionSheet';
import { copyToClipboardSafe, buildWhatsAppShareData, generateMemberViewUrl } from '../utils/linkSharing';

interface OrderMemberPortalProps {
  order: Order | null;
  allOrders: Order[];
  onSelectOrder: (order: Order) => void;
  onRefreshFromCloud?: () => Promise<void> | void;
  onExitToStaffApp?: () => void;
}

export const OrderMemberPortal: React.FC<OrderMemberPortalProps> = ({
  order,
  allOrders,
  onSelectOrder,
  onRefreshFromCloud,
  onExitToStaffApp,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'SUMMARY' | 'OFFICIAL_SHEET'>('SUMMARY');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [searchRefInput, setSearchRefInput] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStaffLoginConfirm, setShowStaffLoginConfirm] = useState(false);

  // Status computation
  const isCompleted = order?.status === 'DELIVERED_RECEIVED';
  const priorityMeta = order ? getPriorityMeta(order.priority) : null;

  // Real-time tracking link
  const publicShareUrl = order ? generateMemberViewUrl(order.referenceNumber) : '';

  const handleCopyLink = async () => {
    if (!publicShareUrl) return;
    const ok = await copyToClipboardSafe(publicShareUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyRef = async () => {
    if (!order) return;
    const ok = await copyToClipboardSafe(order.referenceNumber);
    if (ok) {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const query = searchRefInput.trim().toLowerCase();
    if (!query) return;

    const found = allOrders.find((o) => {
      const ref = o.referenceNumber.toLowerCase();
      const id = o.id.toLowerCase();
      return ref === query || id === query || ref.includes(query) || id.includes(query);
    });

    if (found) {
      onSelectOrder(found);
      setSearchRefInput('');
      if (typeof window !== 'undefined') {
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}?view=${encodeURIComponent(found.referenceNumber)}`
        );
      }
    } else {
      setSearchError('لم يتم العثور على طلب مطابق لهذا الرقم المرجعي. تأكد من صحة الرمز.');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshFromCloud) {
        await onRefreshFromCloud();
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans" dir="rtl">
        {/* Simple Top Banner */}
        <header className="bg-slate-900 text-white p-4 border-b border-slate-800 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-sm">
                ⛏️
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-white">مشروع الجكوب للتعدين</h1>
                <p className="text-xs text-amber-300">بوابة متابعة حالة الطلبات الميدانية (عرض فقط)</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto w-full p-4 sm:p-6 my-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">استعلام عن حالة طلب شراء</h2>
              <p className="text-xs text-slate-600 mt-1">
                الرجاء إدخال الرقم المرجعي للطلب للتحقق من حالته اللحظية
              </p>
            </div>

            <form onSubmit={handleManualSearch} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchRefInput}
                  onChange={(e) => setSearchRefInput(e.target.value)}
                  placeholder="مثال: JKB-ENG-202609-0012 أو رقم الـ ID"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                  dir="ltr"
                />
              </div>

              {searchError && (
                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  {searchError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>عرض حالة الطلب الآن</span>
              </button>
            </form>

            {allOrders.length > 0 && (
              <div className="pt-4 border-t border-slate-100 text-right">
                <span className="text-xs font-bold text-slate-500 block mb-2">
                  أحدث الطلبات المتاحة للاستعلام:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {allOrders.slice(0, 5).map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => onSelectOrder(ord)}
                      className="w-full text-right p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50/60 hover:border-amber-300 transition flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900 group-hover:text-amber-900">
                          {ord.referenceNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                          {ord.purpose}
                        </span>
                      </div>
                      <PriorityBadge priority={ord.priority} size="xs" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
          مشروع الجكوب للتعدين • بوابة الاستعلام العامة للأعضاء
        </footer>
      </div>
    );
  }

  // Define the progress steps for the visual timeline
  const stages = [
    {
      id: 1,
      title: 'تسجيل واعتماد الطلب',
      subtitle: 'تم التحرير والموافقة المبدئية',
      done: true,
      current: !isCompleted,
    },
    {
      id: 2,
      title: 'التوريد والشراء الميداني',
      subtitle: 'مكتب المشتريات (عطبرة / الخرطوم)',
      done: isCompleted,
      current: !isCompleted,
    },
    {
      id: 3,
      title: 'الشحن والترحيل',
      subtitle: 'النقل اللوجستي نحو الموقع',
      done: isCompleted,
      current: false,
    },
    {
      id: 4,
      title: 'التسليم لمنجم الجكوب',
      subtitle: 'الفحص والاستلام النهائي في المستودع',
      done: isCompleted,
      current: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Read-Only Security Notification Banner (Top of page) */}
      <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black shadow-xs flex flex-wrap items-center justify-between gap-2 border-b border-amber-600">
        <div className="flex items-center gap-2 max-w-2xl">
          <Lock className="w-4 h-4 text-slate-950 shrink-0" />
          <span>
            <strong>وضع المتابعة والاستعلام للأعضاء (عرض فقط):</strong> هذا الرابط مخصص للأعضاء للاطلاع على حالة الطلب المحدثة لحظياً دون صلاحيات اعتماد أو تعديل.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-black/15 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
            <span>عرض مقروء فقط (Read-Only)</span>
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-sm">
              ⛏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white">مشروع الجكوب للتعدين</h1>
                <span className="text-[10px] bg-slate-800 text-amber-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                  بوابة متابعة الطلبات
                </span>
              </div>
              <p className="text-[11px] text-slate-400">نظام المشتريات والتوريد الميداني المباشر</p>
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="تحديث البيانات لحظياً من السحابة"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث الحالة</span>
            </button>

            {order && (
              <button
                type="button"
                onClick={() => {
                  const data = buildWhatsAppShareData(order);
                  window.open(data.waDirectUrl, '_blank', 'noopener,noreferrer');
                }}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-xs"
                title="إرسال رابط وتفاصيل الطلب مباشرة عبر واتساب"
              >
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">إرسال لواتساب</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-xs"
              title="نسخ رابط المتابعة لمشاركته مع عضو آخر"
            >
              {copiedLink ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-emerald-300">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">نسخ الرابط</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 flex-1 space-y-4">
        {/* Toggle between Summary View and Official Sheet Document */}
        <div className="flex items-center justify-between bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveViewMode('SUMMARY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'SUMMARY'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ملخص وتتبع الحالة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('OFFICIAL_SHEET')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'OFFICIAL_SHEET'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>الاستمارة الرسمية الميدانية</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium px-2 hidden sm:block">
            رقم الطلب: <strong className="font-mono text-slate-800">{order.referenceNumber}</strong>
          </div>
        </div>

        {activeViewMode === 'SUMMARY' ? (
          <>
            {/* Primary Status Card (Hero Box) */}
            <div className={`rounded-2xl p-5 sm:p-6 border-2 shadow-sm transition-all ${
              isCompleted
                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                : 'bg-amber-50/80 border-amber-400 text-amber-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/10">
                      الحالة الميدانية للطلب
                    </span>
                    <PriorityBadge priority={order.priority} size="sm" showSla={true} />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5">
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                        <span>✅ تم التنفيذ (تم التوريد والتسليم للموقع)</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-7 h-7 text-amber-600 shrink-0" />
                        <span>⏳ قيد التنفيذ (جاري التوريد والشحن الميداني)</span>
                      </>
                    )}
                  </h2>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {isCompleted
                      ? 'تم توريد جميع الأصناف واستلامها رسمياً في مستودع منجم الجكوب بعد الفحص الفني.'
                      : 'الطلب قيد إجراءات التوريد والشراء وتجهيز الشحن اللوجستي إلى موقع المنجم.'}
                  </p>
                </div>

                {/* Reference Number Pill */}
                <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-slate-300 shadow-2xs text-center shrink-0 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold block">الرقم المرجعي الموحد</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono font-black text-sm sm:text-base text-slate-900 tracking-wider">
                      {order.referenceNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                      title="نسخ الرقم المرجعي"
                    >
                      {copiedRef ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    تاريخ: {order.orderDate}
                  </span>
                </div>
              </div>

              {/* Progress Stepper Bar */}
              <div className="mt-6 pt-5 border-t border-black/10">
                <h4 className="text-xs font-black mb-3 text-slate-800">مراحل سير وتوريد الطلب:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {stages.map((stage, idx) => (
                    <div
                      key={stage.id}
                      className={`p-2.5 rounded-xl border text-right transition ${
                        stage.done
                          ? 'bg-white/90 border-emerald-300 shadow-2xs'
                          : stage.current
                          ? 'bg-white border-amber-400 ring-2 ring-amber-300 shadow-xs'
                          : 'bg-white/40 border-slate-200 opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          مرحلة {idx + 1}
                        </span>
                        {stage.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : stage.current ? (
                          <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                        )}
                      </div>
                      <div className="text-xs font-black text-slate-900 leading-tight">
                        {stage.title}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        {stage.subtitle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Information & Purpose */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>بيانات طلب الشراء والتوريد</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px] mb-0.5">الموقع الطالب</span>
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    <span>[{order.siteCode}] منجم الجكوب</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px] mb-0.5">القسم</span>
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>{order.departmentName || order.departmentCode}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px] mb-0.5">المطلوب من</span>
                  <div className="font-bold text-slate-900">
                    {order.requestedFrom || 'عطبرة'}
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[11px] mb-0.5">أجل التنفيذ</span>
                  <div className="font-bold text-slate-900">
                    {order.executionDays || '1 يوم'}
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">
                  الغرض التشغيلي من الشراء:
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                  {order.purpose || 'مستلزمات تشغيلية وصيانة دورية للموقع'}
                </p>
              </div>
            </div>

            {/* Requested Items Table (Strictly Read-Only) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>جدول الأصناف والمواد المطلوبة ({order.items.length} صنف)</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">
                  جدول مقروء فقط
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-12">#</th>
                      <th className="p-2.5">اسم الصنف والمادة</th>
                      <th className="p-2.5">المواصفات الفنية وملاحظات الموقع</th>
                      <th className="p-2.5 text-center w-24">الكمية</th>
                      <th className="p-2.5 text-center w-24">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {order.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5 text-center font-mono font-bold text-slate-500">
                          {item.itemNumber || idx + 1}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="p-2.5 text-slate-600 text-[11px]">
                          {item.technicalSpecs || item.notes || '-'}
                        </td>
                        <td className="p-2.5 text-center font-mono font-black text-slate-900 bg-slate-50/50">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 text-center text-slate-700 font-bold">
                          {item.unit || 'قطعة'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WhatsApp Direct Share Bar for Members */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-950">
              <div className="space-y-0.5 text-right w-full sm:w-auto">
                <div className="text-xs font-black flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-700" />
                  <span>مشاركة رابط التتبع مع أعضاء المجموعة:</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  يمكنك نسخ هذا الرابط وإرساله في قروب الواتساب ليرى الأعضاء حالة الطلب مباشرة
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-white" />
                    <span>تم نسخ الرابط!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-white" />
                    <span>نسخ رابط المتابعة للأعضاء</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Official Sheet View - Strictly with showControls={false} */
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <Printer className="w-4 h-4 text-slate-500" />
                <span>الاستمارة الميدانية الرسمية المعتمدة (نسخة العرض والطباعة فقط)</span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة / حفظ كـ PDF</span>
              </button>
            </div>

            <OfficialRequisitionSheet
              order={order}
              showControls={false}
            />
          </div>
        )}

        {/* Supervisor Access Link (Quiet / at bottom) */}
        {onExitToStaffApp && (
          <div className="pt-6 pb-2 text-center">
            {!showStaffLoginConfirm ? (
              <button
                type="button"
                onClick={() => setShowStaffLoginConfirm(true)}
                className="text-xs text-slate-600 hover:text-slate-800 underline transition cursor-pointer"
              >
                هل أنت أحد مشرفي النظام أو إدارة المشتريات؟ اضغط هنا للانتقال للوحة التحكم
              </button>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm max-w-md mx-auto space-y-3">
                <p className="text-xs text-slate-700 font-bold">
                  الانتقال للوحة التحكم الإدارية يتطلب صلاحية مشرف أو مهندس موقع.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onExitToStaffApp}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                  >
                    تأكيد الدخول كمسؤول / مشرف
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStaffLoginConfirm(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition cursor-pointer"
                  >
                    البقاء في وضع المتابعة
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>مشروع الجكوب للتعدين • بوابة المتابعة الميدانية</span>
          <span className="font-mono text-[11px] text-slate-400">
            Smart Reference Tracking • Member Read-Only Portal
          </span>
        </div>
      </footer>
    </div>
  );
};
